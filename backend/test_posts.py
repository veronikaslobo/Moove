"""Run from the backend folder: pip install pytest httpx && pytest -q"""

from fastapi.testclient import TestClient

from test_auth import ORIGIN, client  # noqa: F401  (client is a pytest fixture)

ANA = {"email": "ana@example.com", "password": "correct-horse-battery"}
BOB = {"email": "bob@example.com", "password": "correct-horse-battery"}


def test_posts_need_an_account(client):
    assert client.get("/posts").status_code == 401
    assert client.post("/posts", json={"body": "hi"}).status_code == 401


def test_write_list_and_delete_own_post(client):
    client.post("/auth/register", json=ANA)
    client.put("/profile", json={"display_name": "Ana"})

    r = client.post("/posts", json={"body": "  Soccer at Jarry tonight?  "})
    assert r.status_code == 201
    post = r.json()
    assert post["body"] == "Soccer at Jarry tonight?"  # trimmed
    assert post["author_name"] == "Ana" and post["mine"] is True
    assert "email" not in r.text  # other members never see the author's email

    client.post("/posts", json={"body": "Second one"})
    bodies = [p["body"] for p in client.get("/posts").json()]
    assert bodies == ["Second one", "Soccer at Jarry tonight?"]  # newest first

    assert client.delete(f"/posts/{post['id']}").status_code == 200
    assert [p["body"] for p in client.get("/posts").json()] == ["Second one"]


def test_blank_or_too_long_posts_are_refused(client):
    client.post("/auth/register", json=ANA)
    assert client.post("/posts", json={"body": "   "}).status_code == 422
    assert client.post("/posts", json={"body": "x" * 1001}).status_code == 422


def test_cannot_delete_someone_elses_post(client):
    client.post("/auth/register", json=ANA)
    post_id = client.post("/posts", json={"body": "Ana's post"}).json()["id"]

    from main import app
    with TestClient(app, headers=ORIGIN) as bob:
        bob.post("/auth/register", json=BOB)
        posts = bob.get("/posts").json()
        assert posts[0]["mine"] is False and posts[0]["author_name"] is None
        assert bob.delete(f"/posts/{post_id}").status_code == 403

    assert client.delete("/posts/999").status_code == 404
