"""Run from the backend folder: pip install pytest httpx && pytest -q"""

from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient

from test_auth import ORIGIN, client  # noqa: F401  (client is a pytest fixture)

ANA = {"email": "ana@example.com", "password": "correct-horse-battery"}
BOB = {"email": "bob@example.com", "password": "correct-horse-battery"}


def make_game(client, hours=48):
    start = (datetime.now(timezone.utc) + timedelta(hours=hours)).strftime("%Y-%m-%dT%H:%M:%SZ")
    r = client.post("/games", json={"sport": "soccer", "starts_at": start, "venue_id": "v1", "total_spots": 4})
    assert r.status_code == 201
    return r.json()["id"]


def test_favorites_need_an_account(client):
    assert client.get("/favorites").status_code == 401
    assert client.put("/favorites/game/1").status_code == 401
    assert client.delete("/favorites/game/1").status_code == 401


def test_favourite_a_game_and_remove_it(client):
    client.post("/auth/register", json=ANA)
    game_id = make_game(client)

    assert client.get("/favorites").json() == {"games": [], "trials": [], "posts": []}
    assert client.put(f"/favorites/game/{game_id}").status_code == 204
    assert client.put(f"/favorites/game/{game_id}").status_code == 204  # twice = still one

    games = client.get("/favorites").json()["games"]
    assert [g["id"] for g in games] == [game_id]
    assert games[0]["sport"] == "soccer" and games[0]["spots_left"] == 3
    assert games[0]["joined"] is True and games[0]["past"] is False

    assert client.delete(f"/favorites/game/{game_id}").status_code == 204
    assert client.delete(f"/favorites/game/{game_id}").status_code == 204  # twice = fine
    assert client.get("/favorites").json()["games"] == []


def test_games_that_already_started_are_flagged(client):
    client.post("/auth/register", json=ANA)
    game_id = make_game(client, hours=-5)
    client.put(f"/favorites/game/{game_id}")
    assert client.get("/favorites").json()["games"][0]["past"] is True


def test_trials_and_posts(client):
    client.post("/auth/register", json=ANA)
    client.put("/profile", json={"display_name": "Ana"})
    post_id = client.post("/posts", json={"body": "Tennis anyone?"}).json()["id"]

    assert client.put("/favorites/trial/007").status_code == 204  # clubs live in the frontend
    assert client.put(f"/favorites/post/{post_id}").status_code == 204

    saved = client.get("/favorites").json()
    assert saved["trials"] == ["7"]  # "007" is stored as 7
    assert saved["posts"][0]["body"] == "Tennis anyone?" and saved["posts"][0]["author_name"] == "Ana"
    assert "email" not in str(saved["posts"])


def test_bad_requests(client):
    client.post("/auth/register", json=ANA)
    assert client.put("/favorites/game/999").status_code == 404
    assert client.put("/favorites/post/999").status_code == 404
    assert client.put("/favorites/banana/1").status_code == 422
    assert client.put("/favorites/game/abc").status_code == 422
    assert client.put("/favorites/trial/12345678901").status_code == 422


def test_each_user_has_their_own_favorites(client):
    client.post("/auth/register", json=ANA)
    game_id = make_game(client)
    client.put(f"/favorites/game/{game_id}")

    from main import app
    with TestClient(app, headers=ORIGIN) as bob:
        bob.post("/auth/register", json=BOB)
        assert bob.get("/favorites").json()["games"] == []
        assert bob.put(f"/favorites/game/{game_id}").status_code == 204
        bob.delete(f"/favorites/game/{game_id}")
    assert len(client.get("/favorites").json()["games"]) == 1  # Ana's is untouched


def test_cancelling_a_game_or_deleting_a_post_removes_the_hearts(client):
    client.post("/auth/register", json=ANA)
    game_id = make_game(client)
    post_id = client.post("/posts", json={"body": "hello"}).json()["id"]

    from main import app
    with TestClient(app, headers=ORIGIN) as bob:
        bob.post("/auth/register", json=BOB)
        bob.put(f"/favorites/game/{game_id}")
        bob.put(f"/favorites/post/{post_id}")
        assert client.delete(f"/games/{game_id}").status_code == 200
        assert client.delete(f"/posts/{post_id}").status_code == 200
        assert bob.get("/favorites").json() == {"games": [], "trials": [], "posts": []}
