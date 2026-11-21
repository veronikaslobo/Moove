"""Run from the backend folder: pip install pytest httpx && pytest -q"""

import sqlite3

import pytest
from fastapi.testclient import TestClient

import config

ORIGIN = {"Origin": "http://localhost:5173"}
CREDS = {"email": "Ana@Example.com", "password": "correct-horse-battery"}
GAME = {"sport": "soccer", "starts_at": "2030-01-01T10:00:00Z", "venue_id": "v1", "total_spots": 4}


@pytest.fixture()
def client(tmp_path, monkeypatch):
    import db
    monkeypatch.setattr(db, "DB_PATH", tmp_path / "test.db")
    db.init_db()
    from main import app
    with TestClient(app, headers=ORIGIN) as c:
        yield c


def rows(client, sql):
    import db
    conn = sqlite3.connect(db.DB_PATH)
    try:
        return conn.execute(sql).fetchall()
    finally:
        conn.close()


def test_register_login_me_logout(client):
    r = client.post("/auth/register", json=CREDS)
    assert r.status_code == 201 and r.json()["email"] == "ana@example.com"
    assert "password" not in r.text and "hash" not in r.text
    assert client.get("/auth/me").status_code == 200  # cookie works, like a page refresh

    token = client.cookies.get(config.COOKIE_NAME)
    assert client.post("/auth/logout").status_code == 204
    assert client.get("/auth/me").status_code == 401
    client.cookies.set(config.COOKIE_NAME, token)  # replaying the old cookie must fail
    assert client.get("/auth/me").status_code == 401
    assert rows(client, "select count(*) from sessions")[0][0] == 0

    assert client.post("/auth/login", json=CREDS).status_code == 200
    assert client.get("/auth/me").status_code == 200


def test_password_is_hashed_with_argon2id(client):
    client.post("/auth/register", json=CREDS)
    stored = rows(client, "select password_hash from users")[0][0]
    assert stored.startswith("$argon2id$") and CREDS["password"] not in stored


def test_duplicate_email_and_weak_password_rejected(client):
    assert client.post("/auth/register", json=CREDS).status_code == 201
    assert client.post("/auth/register", json={**CREDS, "email": "ANA@example.com"}).status_code == 409
    assert client.post("/auth/register", json={"email": "b@example.com", "password": "short"}).status_code == 422


def test_invalid_credentials_are_generic(client):
    client.post("/auth/register", json=CREDS)
    wrong_pw = client.post("/auth/login", json={**CREDS, "password": "nope-nope-nope"})
    no_user = client.post("/auth/login", json={"email": "ghost@example.com", "password": "nope-nope-nope"})
    assert wrong_pw.status_code == no_user.status_code == 401
    assert wrong_pw.json() == no_user.json()


def test_login_rate_limit(client):
    client.post("/auth/register", json=CREDS)
    for _ in range(5):
        assert client.post("/auth/login", json={**CREDS, "password": "wrong-wrong"}).status_code == 401
    blocked = client.post("/auth/login", json=CREDS)  # even the right password is refused now
    assert blocked.status_code == 429 and "retry-after" in blocked.headers


def test_protected_endpoints(client):
    assert client.post("/games", json=GAME).status_code == 401
    assert client.post("/games/1/join").status_code == 401
    assert client.get("/games").status_code == 200  # the feed stays public
    client.post("/auth/register", json=CREDS)
    assert client.post("/games", json=GAME).status_code == 201
    assert client.get("/games").json()[0]["joined"] is True


def test_bad_origin_rejected(client):
    r = client.post("/auth/login", json=CREDS, headers={"Origin": "https://evil.example"})
    assert r.status_code == 403


def test_only_host_can_delete_a_game(client):
    from main import app
    client.post("/auth/register", json=CREDS)
    game_id = client.post("/games", json=GAME).json()["id"]
    with TestClient(app, headers=ORIGIN) as other:
        other.post("/auth/register", json={"email": "bo@example.com", "password": "another-long-password"})
        assert other.delete(f"/games/{game_id}").status_code == 403
    assert client.delete(f"/games/{game_id}").status_code == 200
    assert client.delete(f"/games/{game_id}").status_code == 404
