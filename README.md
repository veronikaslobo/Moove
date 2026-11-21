# SportsMap

**It's Friday evening. What can I join tonight, near me?**

SportsMap puts every public sports facility in Montréal on one map, and lets
people post pickup games there and join each other's. Built for CodeJam 2026


## Features

- **Interactive map** of 1,500+ public courts, fields, rinks and pools from
  the City of Montréal's open data, with a sport filter and a "Near me" button.
- **Pickup games on the map.** Purple dots are venues with upcoming games. Tap
  one to see its games and **Join** or **Leave**. Grey dots are venues without
  games: tap one to **create a game** there.
- **Live spot counts.** "Spots left" refreshes every 5 seconds, and the last
  spot can never be taken twice: the backend checks it inside a locked
  database transaction.
- **Community tab** listing every upcoming game, soonest first.
- **Profile** and **Settings** tabs (in progress).

## Running it locally

You need **Python 3.10+** and **Node.js 20+**. The app runs as two servers, each
in its own terminal.

### 1. Backend (Python, port 8000)

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python seed.py
uvicorn main:app --reload
```

On macOS/Linux, activate the venv with `source .venv/bin/activate` instead.

`python seed.py` fills the database with 5 fake games. Their start times are
relative to when you run it (2 to 26 hours later), so **run it again** whenever
the map shows no games. It wipes all existing games first.

The API's test page is at http://localhost:8000/docs: you can try every
endpoint there without the frontend.

### 2. Frontend (React, port 5173)

```powershell
cd sports-meetup
npm install
npm run dev
```

Open http://localhost:5173.

To test as two different people on one computer, open a second, private window:
each browser gets its own user id.

## Tech stack

| Part | Tech |
|---|---|
| Frontend | React + TypeScript, Vite |
| Map | Leaflet (via react-leaflet), OpenStreetMap tiles |
| Backend | Python, FastAPI |
| Database | SQLite (one file, `backend/sportsmap.db`, created on first run) |

## Project structure

```
backend/
  main.py           App setup and CORS; teammates register their routers here
  db.py             Database tables, and the locked write transaction
  games.py          Games API: feed, create, join, leave
  seed.py           Fake games for testing

sports-meetup/
  public/
    terrain_sport_ext.json   City of Montréal facilities (the venue data)
  src/
    App.tsx           App shell: header, current page, tab bar
    pages/            One file per tab (Map, Profile, Community, Settings)
    features/
      map/            The map: venue dots, game dots, popups
      games/          Game cards, create form, backend calls, live refresh
    shared/
      sports.ts       THE sports list used everywhere (see below)
      venues.ts       Loads venues from the data file
      TabBar.tsx      Bottom tab bar
```

## Shared conventions

These are used by every feature, so change them in one place only:

- **Sports** live in `sports-meetup/src/shared/sports.ts`. Code stores and
  compares the `slug` (`basketball`, `outdoor-gym`…) and shows the `label`. The
  `keywords` decide which sport a city facility is, from its name.
- **Venues** have the shape `{ id, name, borough, lat, lng, sports }`. The `id`
  is `mtl:` plus the city's facility ID (for example `mtl:049-0030`), and
  games store it as `venue_id`.
- **Spots left** is never stored. The backend computes it as total spots minus
  the number of players.

## API

| Method | Path | Does |
|---|---|---|
| `GET` | `/games?sports=basketball,soccer` | Upcoming games, soonest first, with `spots_left` |
| `POST` | `/games` | Create a game; the host becomes its first player |
| `POST` | `/games/{id}/join` | Join (`409 game_full` if no spot is left) |
| `DELETE` | `/games/{id}/join` | Leave |

Requests that change data need an `X-User-Id` header (see below).

## Known limitations

- **No real login yet.** Each browser makes up a random user id and keeps it
  in local storage. It will be replaced by the profile feature.
- **The database is local.** Every teammate has their own copy, so a game
  created on one laptop doesn't appear on another, except when running a
  shared or deployed backend.
- **"Live" means polling.** Spot counts refresh every 5 seconds, not instantly.

## Data and credits

- Sports facilities: [Ville de Montréal open data](https://donnees.montreal.ca),
  licence CC-BY 4.0.
- Map tiles: © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors.
