"""Fill the database with fake games. Safe to re-run: it wipes games first.

Run from the backend folder: python seed.py
"""

from datetime import datetime, timedelta, timezone

from auth_security import hash_password
from db import connect, init_db, to_utc_text

# (sport, starts in N hours, venue_id, total_spots, skill_level, notes, extra players)
# Venue ids are "mtl:" + the ID column of terrain_sport_ext.json
# (City of Montréal facilities), the same ids the map uses.
FAKE_GAMES = [
    ("basketball", 2, "mtl:049-0030", 10, "all", "Bring a ball", ["user-2", "user-3"]),
    ("soccer", 3, "mtl:073-0003", 14, "intermediate", "7v7", ["user-2"]),
    ("volleyball", 4, "mtl:089-0063", 12, "beginner", "Beach volleyball", []),
    ("tennis", 5, "mtl:081-0064", 2, "advanced", "Singles, one spot left", []),
    ("basketball", 26, "mtl:049-0030", 2, "all", "Already full", ["user-2"]),
]

HOST_ID = "user-1"
# Demo accounts you can log in with. Password for all of them: demo-password-123
DEMO_USERS = [("user-1", "demo1@example.com"), ("user-2", "demo2@example.com"), ("user-3", "demo3@example.com")]


def seed() -> None:
    init_db()
    conn = connect()
    conn.execute("delete from games")  # players go too (on delete cascade)

    password_hash = hash_password("demo-password-123")
    for user_id, email in DEMO_USERS:
        conn.execute(
            "insert or ignore into users (id, email, password_hash) values (?, ?, ?)",
            (user_id, email, password_hash),
        )

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
