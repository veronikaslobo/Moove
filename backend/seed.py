"""Fill the database with fake games. Safe to re-run: it wipes games first.

Run from the backend folder: python seed.py
"""

from datetime import datetime, timedelta, timezone

from db import connect, init_db
from games import to_utc_text

# (sport, starts in N hours, venue_id, total_spots, skill_level, notes, extra players)
# TODO: replace the venue ids with real ones from venues.json,
# and the sports with the slugs from the shared sports list.
FAKE_GAMES = [
    ("basketball", 2, "osm:way/REPLACE_1", 10, "all", "Bring a ball", ["user-2", "user-3"]),
    ("soccer", 3, "osm:way/REPLACE_2", 14, "intermediate", "7v7", ["user-2"]),
    ("volleyball", 4, "osm:way/REPLACE_3", 12, "beginner", None, []),
    ("tennis", 5, "osm:way/REPLACE_4", 2, "advanced", "Singles, one spot left", []),
    ("basketball", 26, "osm:way/REPLACE_1", 2, "all", "Already full", ["user-2"]),
]

HOST_ID = "user-1"


def seed() -> None:
    init_db()
    conn = connect()
    conn.execute("delete from games")  # players go too (on delete cascade)

    now = datetime.now(timezone.utc)
    for sport, in_hours, venue_id, total_spots, skill_level, notes, extra_players in FAKE_GAMES:
        # Times are relative to now, so the feed is never empty.
        starts_at = to_utc_text(now + timedelta(hours=in_hours))
        cursor = conn.execute(
            """
            insert into games
                (host_id, sport, starts_at, venue_id, total_spots, skill_level, notes)
            values (?, ?, ?, ?, ?, ?, ?)
            """,
            (HOST_ID, sport, starts_at, venue_id, total_spots, skill_level, notes),
        )
        game_id = cursor.lastrowid

        for user_id in [HOST_ID, *extra_players]:
            conn.execute(
                "insert into game_players (game_id, user_id) values (?, ?)",
                (game_id, user_id),
            )

    conn.close()
    print(f"Seeded {len(FAKE_GAMES)} games.")


if __name__ == "__main__":
    seed()
