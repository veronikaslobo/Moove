# Moove

**It's Friday evening. What can I join tonight, near me?**

Moove puts every public sports facility in Montréal on one map, and lets
people post pickup games there and join each other's. Built for CodeJam 2026


## Features

- **Interactive map** of 2,000+ places to play: public courts, fields, rinks
  and pools from the City of Montréal's open data, plus indoor gyms, arenas,
  climbing walls and studios from OpenStreetMap. Filter by one or several
  sports, or tap "Near me".
- **Pickup games on the map.** Purple dots are venues with upcoming games. Tap
  one to see its games and **Join** or **Leave**. Grey dots are venues without
  games: tap one to **create a game** there.
- **Live spot counts.** "Spots left" refreshes every 5 seconds, and the last
  spot can never be taken twice: the backend checks it inside a locked
  database transaction.
- **Get there without a car.** Every popup has Walk, Bike and Transit buttons
  that open directions in Google Maps. After "Near me", spots within 1 km turn
  green and popups show the distance and a walking or biking time, so the
  closest, car-free options stand out. We show no CO₂ numbers on purpose,
  because we have no reliable source for them.
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
| Database | SQLite (one file, `backend/Moove.db`, created on first run) |

## Project structure

```
backend/
  main.py           App setup and CORS; teammates register their routers here
  db.py             Database tables, and the locked write transaction
  games.py          Games API: feed, create, join, leave
  seed.py           Fake games for testing

sports-meetup/
  public/
    outdoor_facilities.json  City of Montréal outdoor facilities
    indoor_facilities.json   Indoor facilities from OpenStreetMap
    park_names.json          Park code → park name, for outdoor facilities
  scripts/
    build-park-names.cjs     Rebuilds park_names.json from the city's parks file
  src/
    App.tsx           App shell: header, current page, tab bar
    pages/            One file per tab (Map, Profile, Community, Settings)
    features/
      map/            The map: venue dots, game dots, popups
      games/          Game cards, create form, backend calls, live refresh
    shared/
      sports.ts       THE sports list used everywhere (see below)
      venues.ts       Loads venues from both data files
      TabBar.tsx      Bottom tab bar
```

## Shared conventions

These are used by every feature, so change them in one place only:

- **Sports** live in `sports-meetup/src/shared/sports.ts`. Code stores and
  compares the `slug` (`basketball`, `outdoor-gym`…) and shows the `label`. The
  `keywords` decide which sport a city facility is, from its name, and the
  `osmTags` do the same for indoor places, from their OpenStreetMap `sport` tag.
- **Venues** have the shape `{ id, name, borough, lat, lng, sports, details? }`.
  `details` (address, website, phone, opening hours, wheelchair access, fee)
  only exists for OpenStreetMap places, and only with the fields they have. The `id`
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
| `DELETE` | `/games/{id}` | Cancel a game (host only, `403 not_host` otherwise) |

Requests that change data need an `X-User-Id` header (see below).

## Known limitations

- **No real login yet.** Each browser makes up a random user id and keeps it
  in local storage. It will be replaced by the profile feature.
- **The database is local.** Every teammate has their own copy, so a game
  created on one laptop doesn't appear on another, except when running a
  shared or deployed backend.
- **"Live" means polling.** Spot counts refresh every 5 seconds, not instantly.

## Data and credits

- Outdoor sports facilities: [Ville de Montréal open data](https://donnees.montreal.ca),
  licence CC-BY 4.0.
- Park names: [Ville de Montréal, Grands parcs, parcs d'arrondissements et espaces publics](https://donnees.montreal.ca/dataset/grands-parcs-parcs-d-arrondissements-et-espaces-publics),
  licence CC-BY 4.0.
- Indoor facilities and map tiles: © [OpenStreetMap](https://www.openstreetmap.org/copyright)
  contributors. The facility data is available under the Open Database
  Licence (ODbL).
