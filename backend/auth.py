"""Register / login / logout / me."""

import sqlite3
import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Request, Response

import auth_security as sec
import config
from auth_schemas import LoginIn, RegisterIn, UserOut
from db import connect, write_transaction

router = APIRouter(prefix="/auth", tags=["auth"])

# Meeting strangers for games: accounts are for adults only.
MINIMUM_AGE = 18
# Older than this is almost surely a typo (e.g. 1025 instead of 2025).
MAXIMUM_AGE = 120


def age_on(birth_date: date, today: date) -> int:
    """Age in full years: someone born 2008-11-22 is still 17 on 2026-11-21."""
    had_birthday_this_year = (today.month, today.day) >= (birth_date.month, birth_date.day)
    return today.year - birth_date.year - (0 if had_birthday_this_year else 1)


def check_age(birth_date: date) -> None:
    """Refuse sign-ups from people under 18, or with an impossible birth date.

    Done on the server, not only in the form: anyone can call the API directly.
    """
    today = date.today()
    if birth_date > today or age_on(birth_date, today) > MAXIMUM_AGE:
        raise HTTPException(status_code=400, detail="invalid_birth_date")
    if age_on(birth_date, today) < MINIMUM_AGE:
        raise HTTPException(status_code=403, detail="under_minimum_age")


@router.post("/register", status_code=201, response_model=UserOut)
def register(body: RegisterIn, response: Response):
    check_age(body.birth_date)  # first: no point hashing a password we'll refuse
    email = sec.normalize_email(body.email)
    password_hash = sec.hash_password(body.password)  # slow on purpose, so done before the lock
    user_id = uuid.uuid4().hex

    try:
        with write_transaction() as conn:
            conn.execute(
                "insert into users (id, email, password_hash) values (?, ?, ?)",
                (user_id, email, password_hash),
            )
            token = sec.create_session(conn, user_id)
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=409, detail="email_already_registered")

    sec.set_session_cookie(response, token)
    return {"id": user_id, "email": email}


@router.post("/login", response_model=UserOut)
def login(body: LoginIn, request: Request, response: Response):
    email = sec.normalize_email(body.email)
    ip = request.client.host if request.client else "unknown"

    conn = connect()
    try:
        sec.enforce_rate_limit(conn, email, ip)  # before the slow hash, so floods stay cheap
        row = conn.execute(
            "select id, email, password_hash from users where email = ?", (email,)
        ).fetchone()
    finally:
        conn.close()

    ok = sec.verify_password(row["password_hash"] if row else None, body.password)

    # The failure is recorded in its own transaction and the error is raised after it
    # commits (an exception inside write_transaction would roll the record back).
    with write_transaction() as conn:
        if ok:
            sec.clear_failed_logins(conn, email)
            token = sec.create_session(conn, row["id"])
        else:
            sec.record_failed_login(conn, email, ip)

    if not ok:
        raise HTTPException(status_code=401, detail="invalid_credentials")

    sec.set_session_cookie(response, token)
    return {"id": row["id"], "email": row["email"]}


@router.post("/logout", status_code=204)
def logout(request: Request):
    token = request.cookies.get(config.COOKIE_NAME)
    if token:
        sec.delete_session(token)  # the session is dead server-side, not just forgotten by the browser
    response = Response(status_code=204)
    sec.clear_session_cookie(response)
    return response


@router.get("/me", response_model=UserOut)
def me(user: dict = Depends(sec.require_user)):
    return user
