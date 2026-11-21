"""App entry point. Run from the backend folder: uvicorn main:app --reload"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from db import init_db
from games import router as games_router

init_db()

app = FastAPI(title="SportsMap API")

# Lets the React dev server (port 5173) call this API (port 8000).
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(games_router)
# Teammates: add your routers here, e.g. app.include_router(venues_router)
