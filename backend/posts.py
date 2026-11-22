"""Community posts: list them, write one, delete your own."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator

from auth_security import require_user
from db import connect, write_transaction

router = APIRouter(prefix="/posts", tags=["posts"])

MAX_BODY_LENGTH = 1000
FEED_SIZE = 100  # newest posts only; enough for now, no paging yet


class NewPost(BaseModel):
    body: str = Field(max_length=MAX_BODY_LENGTH)

    @field_validator("body")
    @classmethod
    def not_blank(cls, body: str) -> str:
        body = body.strip()
        if not body:
            raise ValueError("empty_post")
        return body


# The author's name comes from their profile. The email is never sent:
# other members shouldn't see it. No name set = the frontend shows a stand-in.
# mine tells the frontend whether to show "Delete" on this post.
SELECT_POSTS = """
select p.id, p.body, p.created_at,
       pr.display_name             as author_name,
       p.author_id = :user_id      as mine
from posts p
left join profiles pr on pr.user_id = p.author_id
"""
FEED_QUERY = SELECT_POSTS + "order by p.created_at desc, p.id desc limit :limit"
ONE_POST_QUERY = SELECT_POSTS + "where p.id = :post_id"


def _to_json(row) -> dict:
    post = dict(row)
    post["mine"] = bool(post["mine"])
    return post


@router.get("")
def list_posts(user: dict = Depends(require_user)):
    """Newest posts first. Members only, like the Community tab."""
    conn = connect()
    try:
        rows = conn.execute(FEED_QUERY, {"user_id": user["id"], "limit": FEED_SIZE}).fetchall()
    finally:
        conn.close()
    return [_to_json(row) for row in rows]


@router.post("", status_code=201)
def create_post(post: NewPost, user: dict = Depends(require_user)):
    with write_transaction() as conn:
        cursor = conn.execute(
            "insert into posts (author_id, body) values (?, ?)", (user["id"], post.body)
        )
        row = conn.execute(
            ONE_POST_QUERY, {"user_id": user["id"], "post_id": cursor.lastrowid}
        ).fetchone()
    return _to_json(row)  # the new post, ready to show at the top of the feed


@router.delete("/{post_id}")
def delete_post(post_id: int, user: dict = Depends(require_user)):
    """Only the author may delete a post."""
    with write_transaction() as conn:
        post = conn.execute("select author_id from posts where id = ?", (post_id,)).fetchone()
        if post is None:
            raise HTTPException(status_code=404, detail="post_not_found")
        if post["author_id"] != user["id"]:
            raise HTTPException(status_code=403, detail="not_author")
        conn.execute("delete from posts where id = ?", (post_id,))
    return {"deleted": True}
