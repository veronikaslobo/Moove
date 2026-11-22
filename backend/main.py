"""App entry point. Run from the backend folder: uvicorn main:app --reload"""

from urllib.parse import urlparse

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

import config
from auth import router as auth_router
from db import init_db
from favorites import router as favorites_router
from games import router as games_router
from posts import router as posts_router
from user_profile import router as profile_router

init_db()

app = FastAPI(title="SportsMap API")

UNSAFE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}


@app.middleware("http")
async def check_origin(request: Request, call_next):
    """CSRF defence (together with SameSite=Lax cookies): state-changing requests
    must come from the frontend, or from this API's own pages such as /docs."""
    if request.method in UNSAFE_METHODS:
        origin = request.headers.get("origin")
        if not origin and request.headers.get("referer"):
            parsed = urlparse(request.headers["referer"])
            origin = f"{parsed.scheme}://{parsed.netloc}"
        own_origin = f"{request.url.scheme}://{request.headers.get('host', '')}"
        if origin not in config.ALLOWED_ORIGINS and origin != own_origin:
            return JSONResponse({"detail": "bad_origin"}, status_code=403)
    return await call_next(request)


# Added after the middleware above, so CORS is the outermost layer and also decorates 403s.
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.ALLOWED_ORIGINS,
    allow_credentials=True,  # lets the browser send and accept the session cookie
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type"],
)

app.include_router(auth_router)
app.include_router(games_router)
app.include_router(profile_router)
app.include_router(posts_router)
app.include_router(favorites_router)
# Teammates: add your routers here, e.g. app.include_router(venues_router)
