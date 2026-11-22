"""The logged-in user's profile: name, year of birth, gender and picture."""

from datetime import datetime, timezone
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.concurrency import run_in_threadpool

from auth_security import require_user
from db import connect, to_utc_text, write_transaction
from user_profile_images import ImageRejected, process_avatar
from user_profile_schemas import PictureOut, ProfileIn, ProfileOut

router = APIRouter(prefix="/profile", tags=["profile"])

MAX_UPLOAD_BYTES = 5 * 1024 * 1024


def _picture_url(user_id: str, updated_at: str) -> str:
    # "?v=" changes with every upload, so browsers never show a stale picture.
    return f"/profile/picture/{user_id}?v={quote(updated_at)}"


def _profile_out(user: dict) -> dict:
    conn = connect()
    try:
        row = conn.execute(
            "select display_name, birth_year, gender from profiles where user_id = ?", (user["id"],)
        ).fetchone()
        pic = conn.execute(
            "select updated_at from profile_pictures where user_id = ?", (user["id"],)
        ).fetchone()
    finally:
        conn.close()
    birth_year = row["birth_year"] if row else None
    return {
        "email": user["email"],
        "display_name": row["display_name"] if row else None,
        "birth_year": birth_year,
        "age": datetime.now().year - birth_year if birth_year else None,
        "gender": row["gender"] if row else None,
        "picture_url": _picture_url(user["id"], pic["updated_at"]) if pic else None,
    }


@router.get("", response_model=ProfileOut)
def get_profile(user: dict = Depends(require_user)):
    return _profile_out(user)


@router.put("", response_model=ProfileOut)
def save_profile(body: ProfileIn, user: dict = Depends(require_user)):
    with write_transaction() as conn:
        conn.execute(
            """
            insert into profiles (user_id, display_name, birth_year, gender, updated_at)
            values (?, ?, ?, ?, ?)
            on conflict(user_id) do update set
                display_name = excluded.display_name,
                birth_year   = excluded.birth_year,
                gender       = excluded.gender,
                updated_at   = excluded.updated_at
            """,
            (user["id"], body.display_name, body.birth_year, body.gender,
             to_utc_text(datetime.now(timezone.utc))),
        )
    return _profile_out(user)


def _store_picture(user_id: str, jpeg: bytes) -> str:
    now = datetime.now(timezone.utc).isoformat()
    with write_transaction() as conn:
        conn.execute(
            """
            insert into profile_pictures (user_id, image, updated_at) values (?, ?, ?)
            on conflict(user_id) do update set image = excluded.image, updated_at = excluded.updated_at
            """,
            (user_id, jpeg, now),
        )
    return now


@router.put("/picture", response_model=PictureOut)
async def upload_picture(request: Request, user: dict = Depends(require_user)):
    """The request body is the raw image file (no form encoding needed)."""
    chunks, total = [], 0
    async for chunk in request.stream():  # stop reading as soon as the limit is passed
        total += len(chunk)
        if total > MAX_UPLOAD_BYTES:
            raise HTTPException(status_code=413, detail="image_too_large")
        chunks.append(chunk)

    try:
        jpeg = await run_in_threadpool(process_avatar, b"".join(chunks))
    except ImageRejected:
        raise HTTPException(status_code=400, detail="unsupported_image")

    updated_at = await run_in_threadpool(_store_picture, user["id"], jpeg)
    return {"picture_url": _picture_url(user["id"], updated_at)}


@router.delete("/picture", status_code=204)
def delete_picture(user: dict = Depends(require_user)):
    with write_transaction() as conn:
        conn.execute("delete from profile_pictures where user_id = ?", (user["id"],))
    return Response(status_code=204)


@router.get("/picture/{user_id}")
def get_picture(user_id: str, user: dict = Depends(require_user)):
    """Any logged-in user can see a picture (the community tab will need that)."""
    conn = connect()
    try:
        row = conn.execute("select image from profile_pictures where user_id = ?", (user_id,)).fetchone()
    finally:
        conn.close()
    if row is None:
        raise HTTPException(status_code=404, detail="no_picture")
    return Response(
        content=row["image"],
        media_type="image/jpeg",
        headers={"Cache-Control": "private, max-age=86400", "X-Content-Type-Options": "nosniff"},
    )
