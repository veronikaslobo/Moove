"""SQLite database: one file next to this module, created on first run."""

import sqlite3
from contextlib import contextmanager
from pathlib import Path

DB_PATH = Path(__file__).parent / "sportsmap.db"

# Dates are stored as UTC text like 2026-11-21T19:30:00Z.
# In that format, alphabetical order is also chronological order,
# so "starts_at > now" and "order by starts_at" work on plain text.
SCHEMA = """
create table if not exists games (
    id          integer primary key autoincrement,
    host_id     text    not null,
    sport       text    not null,
    starts_at   text    not null,
    venue_id    text    not null,
    total_spots integer not null check (total_spots >= 2),
    skill_level text    not null default 'all'
        check (skill_level in ('beginner', 'intermediate', 'advanced', 'all')),
    notes       text
);

create table if not exists game_players (
    game_id   integer not null references games(id) on delete cascade,
    user_id   text    not null,
    joined_at text    not null default (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    primary key (game_id, user_id)
);
"""


def connect() -> sqlite3.Connection:
    # isolation_level=None: Python does not open transactions behind our back,
    # we start and end them ourselves in write_transaction().
    conn = sqlite3.connect(DB_PATH, isolation_level=None)
    conn.row_factory = sqlite3.Row  # rows behave like dicts: row["sport"]
    conn.execute("pragma foreign_keys = on")  # off by default in SQLite
    return conn


def init_db() -> None:
    conn = connect()
    conn.executescript(SCHEMA)
    conn.close()


@contextmanager
def write_transaction():
    """Run several statements as one all-or-nothing unit.

    "begin immediate" takes SQLite's single write lock right away, so two
    people joining at the same moment are handled one after the other.
    That is what stops the last spot from being taken twice.
    """
    conn = connect()
    try:
        conn.execute("begin immediate")
        yield conn
        conn.execute("commit")
    except Exception:
        if conn.in_transaction:
            conn.execute("rollback")
        raise
    finally:
        conn.close()
