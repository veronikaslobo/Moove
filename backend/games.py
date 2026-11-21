"""Create / join / leave a game, and the "Tonight" feed."""

from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from auth_security import get_current_user_optional, require_user
from db import connect, to_utc_text, write_transaction

router = APIRouter(prefix="/games", tags=["games"])


class NewGame(BaseModel):
    sport: str
    starts_at: datetime
    venue_id: str
    total_spots: int = Field(ge=2)
    skill_level: Literal["beginner", "intermediate", "advanced", "all"] = "all"
    notes: str | None = None


# spots_left is computed here, never stored.
# joined tells the frontend whether to show "Join" or "Leave" for this user.
FEED_QUERY = """
select g.*,
       g.total_spots - count(p.user_id)            as spots_left,
       coalesce(max(p.user_id = :user_id), 0)      as joined
from games g
left join game_players p on p.game_id = g.id
where g.starts_at > :now
group by g.id
order by g.starts_at
"""


@router.get("")
def list_games(
    sports: str | None = None,
    user: dict | None = Depends(get_current_user_optional),
):
    """Upcoming games, soonest first. Optional filter: ?sports=basketball,soccer"""
    conn = connect()
    now = to_utc_text(datetime.now(timezone.utc))
    rows = conn.execute(FEED_QUERY, {"user_id": user["id"] if user else None, "now": now}).fetchall()
    conn.close()

    games = [dict(row) for row in rows]
    for game in games:
        game["joined"] = bool(game["joined"])

    if sports:
        wanted_sports = set(sports.split(","))
        games = [game for game in games if game["sport"] in wanted_sports]

    return games


@router.post("", status_code=201)
def create_game(game: NewGame, user: dict = Depends(require_user)):
    user_id = user["id"]

    with write_transaction() as conn:
        cursor = conn.execute(
            """
            insert into games
                (host_id, sport, starts_at, venue_id, total_spots, skill_level, notes)
            values (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                user_id,
                game.sport,
                to_utc_text(game.starts_at),
                game.venue_id,
                game.total_spots,
                game.skill_level,
                game.notes,
            ),
        )
        game_id = cursor.lastrowid

        # The host is always the first player of their own game.
        conn.execute(
            "insert into game_players (game_id, user_id) values (?, ?)",
            (game_id, user_id),
        )

    return {"id": game_id}


@router.post("/{game_id}/join")
def join_game(game_id: int, user: dict = Depends(require_user)):
    user_id = user["id"]

    with write_transaction() as conn:
        game = conn.execute(
            "select total_spots from games where id = ?", (game_id,)
        ).fetchone()
        if game is None:
            raise HTTPException(status_code=404, detail="game_not_found")

        already_joined = conn.execute(
            "select 1 from game_players where game_id = ? and user_id = ?",
            (game_id, user_id),
        ).fetchone()
        if already_joined:
            return {"joined": True}  # joining twice changes nothing

        player_count = conn.execute(
            "select count(*) from game_players where game_id = ?", (game_id,)
        ).fetchone()[0]
        if player_count >= game["total_spots"]:
            raise HTTPException(status_code=409, detail="game_full")

        conn.execute(
            "insert into game_players (game_id, user_id) values (?, ?)",
            (game_id, user_id),
        )

    return {"joined": True}


@router.delete("/{game_id}/join")
def leave_game(game_id: int, user: dict = Depends(require_user)):
    user_id = user["id"]

    with write_transaction() as conn:
        conn.execute(
            "delete from game_players where game_id = ? and user_id = ?",
            (game_id, user_id),
        )

    return {"joined": False}


@router.delete("/{game_id}")
def delete_game(game_id: int, user: dict = Depends(require_user)):
    """Cancel a game. Only its host may do this."""
    user_id = user["id"]

    with write_transaction() as conn:
        game = conn.execute(
            "select host_id from games where id = ?", (game_id,)
        ).fetchone()
        if game is None:
            raise HTTPException(status_code=404, detail="game_not_found")
        if game["host_id"] != user_id:
            raise HTTPException(status_code=403, detail="not_host")

        # The players' rows go too, thanks to "on delete cascade" in db.py.
        conn.execute("delete from games where id = ?", (game_id,))

    return {"deleted": True}
