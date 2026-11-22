"""Favourite games, free trials and community posts of the logged-in user."""

from datetime import datetime, timezone
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Path, Response

from auth_security import require_user
from db import connect, to_utc_text, write_transaction

router = APIRouter(prefix="/favorites", tags=["favorites"])

Kind = Literal["game", "trial", "post"]
# Games, posts and the clubs in the frontend's data/clubs.ts all have whole-number ids.
ItemId = Annotated[str, Path(pattern=r"^[0-9]{1,9}$")]
MAX_FAVORITES = 500  # per user; stops one account from filling the database

# Favourited games, with the same fields as the games feed. "past" marks games that
# already started, so the app can show them as ended instead of hiding them.
GAMES_QUERY = """
select g.*,
       g.total_spots - (select count(*) from game_players where game_id = g.id) as spots_left,
       exists (select 1 from game_players
               where game_id = g.id and user_id = :user_id)                       as joined,
       g.starts_at <= :now                                                        as past
from favorites f
join games g on cast(g.id as text) = f.item_id
where f.user_id = :user_id and f.kind = 'game'
order by past, g.starts_at
"""

# Same fields as the posts feed. The author's email is never sent.
POSTS_QUERY = """
select p.id, p.body, p.created_at,
       pr.display_name        as author_name,
       p.author_id = :user_id as mine
from favorites f
join posts p on cast(p.id as text) = f.item_id
left join profiles pr on pr.user_id = p.author_id
where f.user_id = :user_id and f.kind = 'post'
order by f.created_at desc, f.rowid desc
"""

# Club ids only: the club details live in the frontend (data/clubs.ts).
TRIALS_QUERY = """
select item_id from favorites
where user_id = :user_id and kind = 'trial'
order by created_at desc, rowid desc
"""


@router.get("")
def list_favorites(user: dict = Depends(require_user)):
    params = {"user_id": user["id"], "now": to_utc_text(datetime.now(timezone.utc))}
    conn = connect()
    try:
        games = [dict(row) for row in conn.execute(GAMES_QUERY, params)]
        posts = [dict(row) for row in conn.execute(POSTS_QUERY, params)]
        trials = [row["item_id"] for row in conn.execute(TRIALS_QUERY, params)]
    finally:
        conn.close()
    for game in games:
        game["joined"] = bool(game["joined"])
        game["past"] = bool(game["past"])
    for post in posts:
        post["mine"] = bool(post["mine"])
    return {"games": games, "trials": trials, "posts": posts}


@router.put("/{kind}/{item_id}", status_code=204)
def add_favorite(kind: Kind, item_id: ItemId, user: dict = Depends(require_user)):
    """Saving something that is already saved is fine and changes nothing."""
    item = str(int(item_id))  # "007" and "7" are the same item
    with write_transaction() as conn:
        if kind == "game" and not conn.execute("select 1 from games where id = ?", (int(item),)).fetchone():
            raise HTTPException(status_code=404, detail="game_not_found")
        if kind == "post" and not conn.execute("select 1 from posts where id = ?", (int(item),)).fetchone():
            raise HTTPException(status_code=404, detail="post_not_found")

        already = conn.execute(
            "select 1 from favorites where user_id = ? and kind = ? and item_id = ?",
            (user["id"], kind, item),
        ).fetchone()
        if not already:
            count = conn.execute(
                "select count(*) from favorites where user_id = ?", (user["id"],)
            ).fetchone()[0]
            if count >= MAX_FAVORITES:
                raise HTTPException(status_code=409, detail="too_many_favorites")
            conn.execute(
                "insert into favorites (user_id, kind, item_id) values (?, ?, ?)",
                (user["id"], kind, item),
            )
    return Response(status_code=204)


@router.delete("/{kind}/{item_id}", status_code=204)
def remove_favorite(kind: Kind, item_id: ItemId, user: dict = Depends(require_user)):
    """Removing something that is not saved is fine and changes nothing."""
    with write_transaction() as conn:
        conn.execute(
            "delete from favorites where user_id = ? and kind = ? and item_id = ?",
            (user["id"], kind, str(int(item_id))),
        )
    return Response(status_code=204)
