"""Password hashing, session tokens, rate limiting and the auth dependencies."""

import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError
from fastapi import Depends, HTTPException, Request, Response

import config
from db import connect, to_utc_text, write_transaction

_hasher = PasswordHasher()  # argon2-cffi defaults to Argon2id
# Verified when the email is unknown, so "no such user" takes as long as "wrong password".
_DUMMY_HASH = _hasher.hash("timing-equaliser-not-a-real-password")

MAX_FAILS_PER_EMAIL = 5
MAX_FAILS_PER_IP = 20
RATE_WINDOW = timedelta(minutes=15)
_DATE_FORMAT = "%Y-%m-%dT%H:%M:%SZ"


# ---------- passwords ----------

def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(stored_hash: str | None, password: str) -> bool:
    try:
        return _hasher.verify(stored_hash or _DUMMY_HASH, password) and stored_hash is not None
    except (VerificationError, InvalidHashError):
        return False


def normalize_email(email: str) -> str:
    return email.strip().lower()


# ---------- sessions ----------

def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def create_session(conn, user_id: str) -> str:
    """Insert a session row (inside the caller's transaction) and return the raw token."""
    token = secrets.token_urlsafe(32)
    now = datetime.now(timezone.utc)
    expires = to_utc_text(now + timedelta(days=config.SESSION_TTL_DAYS))
    conn.execute(
        "insert into sessions (token_hash, user_id, expires_at) values (?, ?, ?)",
        (_hash_token(token), user_id, expires),
    )
    conn.execute("delete from sessions where expires_at <= ?", (to_utc_text(now),))
    return token


def delete_session(token: str) -> None:
    with write_transaction() as conn:
        conn.execute("delete from sessions where token_hash = ?", (_hash_token(token),))


def set_session_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        config.COOKIE_NAME, token,
        max_age=config.SESSION_TTL_DAYS * 86400,
        httponly=True, secure=config.IS_PRODUCTION, samesite="lax", path="/",
    )


def clear_session_cookie(response: Response) -> None:
    response.delete_cookie(
        config.COOKIE_NAME, path="/",
        httponly=True, secure=config.IS_PRODUCTION, samesite="lax",
    )


# ---------- dependencies ----------

def get_current_user_optional(request: Request, response: Response) -> dict | None:
    """The logged-in user, or None. Also renews a session that is past half its life."""
    token = request.cookies.get(config.COOKIE_NAME)
    if not token:
        return None

    now = datetime.now(timezone.utc)
    conn = connect()
    try:
        row = conn.execute(
            """
            select u.id, u.email, s.expires_at
            from sessions s join users u on u.id = s.user_id
            where s.token_hash = ? and s.expires_at > ?
            """,
            (_hash_token(token), to_utc_text(now)),
        ).fetchone()
    finally:
        conn.close()
    if row is None:
        return None

    expires = datetime.strptime(row["expires_at"], _DATE_FORMAT).replace(tzinfo=timezone.utc)
    if expires - now < timedelta(days=config.SESSION_TTL_DAYS) / 2:
        new_expiry = to_utc_text(now + timedelta(days=config.SESSION_TTL_DAYS))
        with write_transaction() as conn:
            conn.execute(
                "update sessions set expires_at = ? where token_hash = ?",
                (new_expiry, _hash_token(token)),
            )
        set_session_cookie(response, token)

    return {"id": row["id"], "email": row["email"]}


def require_user(user: dict | None = Depends(get_current_user_optional)) -> dict:
    """Use on any endpoint that needs a logged-in user."""
    if user is None:
        raise HTTPException(status_code=401, detail="not_authenticated")
    return user


# ---------- login rate limiting ----------

def enforce_rate_limit(conn, email: str, ip: str) -> None:
    now = datetime.now(timezone.utc)
    since = to_utc_text(now - RATE_WINDOW)
    retry_after = 0
    for column, value, limit in (("email", email, MAX_FAILS_PER_EMAIL), ("ip", ip, MAX_FAILS_PER_IP)):
        count, oldest = conn.execute(
            f"select count(*), min(attempted_at) from login_attempts "
            f"where {column} = ? and attempted_at > ?",
            (value, since),
        ).fetchone()
        if count >= limit:
            oldest_dt = datetime.strptime(oldest, _DATE_FORMAT).replace(tzinfo=timezone.utc)
            retry_after = max(retry_after, int((oldest_dt + RATE_WINDOW - now).total_seconds()) + 1)
    if retry_after:
        raise HTTPException(
            status_code=429, detail="too_many_attempts", headers={"Retry-After": str(retry_after)}
        )


def record_failed_login(conn, email: str, ip: str) -> None:
    now = datetime.now(timezone.utc)
    conn.execute(
        "insert into login_attempts (email, ip, attempted_at) values (?, ?, ?)",
        (email, ip, to_utc_text(now)),
    )
    conn.execute("delete from login_attempts where attempted_at <= ?", (to_utc_text(now - RATE_WINDOW),))


def clear_failed_logins(conn, email: str) -> None:
    conn.execute("delete from login_attempts where email = ?", (email,))
