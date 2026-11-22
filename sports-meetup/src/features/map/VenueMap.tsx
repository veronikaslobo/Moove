import 'leaflet/dist/leaflet.css'
import type { Map as LeafletMap } from 'leaflet'
import { svg } from 'leaflet'
import { useEffect, useState } from 'react'
import { CircleMarker, MapContainer, Pane, Popup, TileLayer } from 'react-leaflet'
import CreateGameForm from '../games/CreateGameForm.tsx'
import GameCard from '../games/GameCard.tsx'
import GetThere from './GetThere.tsx'
import SportFilter from './SportFilter.tsx'
import VenueDetails, { VenueHeading } from './VenueDetails.tsx'
import type { Game } from '../games/api.ts'
import { useGames } from '../games/useGames.ts'
import { distanceKm, formatSettingDistance } from '../../shared/geo.ts'
import { usePreferences } from '../../shared/preferences.ts'
import { SPORTS } from '../../shared/sports.ts'
import type { Venue } from '../../shared/venues.ts'
import { useVenues, venueDisplayName } from '../../shared/venues.ts'
import './map.css'
import { CLUB_SPORTS, clubs } from '../../data/clubs.ts'
import ClubMarkers from '../../components/ClubMarkers.tsx'

const MONTREAL_CENTER: [number, number] = [45.5019, -73.5674]

// Plain venue = small grey dot. Venue with upcoming games = big coloured dot,
// so "what can I join tonight" stands out from the 3,000+ facilities.
const VENUE_STYLE = { color: '#6b6375', fillColor: '#9ca3af', fillOpacity: 0.7, weight: 1 }
const GAME_STYLE = { color: '#5b21b6', fillColor: '#7c3aed', fillOpacity: 0.9, weight: 2 }
const ME_STYLE = { color: '#1d4ed8', fillColor: '#3b82f6', fillOpacity: 0.9, weight: 2 }
// After "Near me": venues within walking distance turn green, nudging people
// toward spots they can reach without a car.
const WALKABLE_STYLE = { color: '#15803d', fillColor: '#22c55e', fillOpacity: 0.9, weight: 1 }

// "Today" = from now until 4 a.m. Games after midnight still count as
// today (a late Friday game), so the day ends at 4 a.m., not midnight.
const NIGHT_ENDS_AT_HOUR = 4

function endOfToday(now: Date): Date {
  const end = new Date(now)
  end.setHours(NIGHT_ENDS_AT_HOUR, 0, 0, 0) // 4 a.m. today, local time
  if (end <= now) end.setDate(end.getDate() + 1) // already past it: tomorrow 4 a.m.
  return end
}

function startsToday(game: Game): boolean {
  return new Date(game.starts_at) < endOfToday(new Date())
}

function VenueMap() {
  const { venues, venuesById, hasFailed: venuesFailed } = useVenues()
  const { games, hasLoadFailed, errorMessage, loadGames, join, leave, cancel } = useGames()
  // Set in the Settings tab: how close counts as "walkable" (green dots).
  const { walkableKm } = usePreferences()

  // Sports ticked in the filter. Empty = show every sport.
  const [selectedSports, setSelectedSports] = useState<string[]>([])
  // On: only games starting before the night ends (see startsToday).
  const [onlyToday, setOnlyToday] = useState(false)
  const [map, setMap] = useState<LeafletMap | null>(null)
  const [mode, setMode] = useState<"games" | "trials">("games");
  // Free-trial sports ticked in their filter. Empty = show every club.
  const [selectedClubSports, setSelectedClubSports] = useState<string[]>([])
  const filteredClubs = clubs.filter(
    (club) => selectedClubSports.length === 0 || selectedClubSports.includes(club.sport),
  )
  const [myPosition, setMyPosition] = useState<[number, number] | null>(null)
  const [venueForNewGame, setVenueForNewGame] = useState<Venue | null>(null)

  // The games layer is drawn as SVG (one element per dot), not as a canvas.
  // A canvas is one big transparent sheet over the whole map that would
  // swallow every click, so the grey venue dots underneath couldn't be tapped.
  // With SVG, only the purple dots themselves catch clicks.
  const [gamesRenderer] = useState(() => svg({ pane: 'games' }))

  // Leaflet measures its box once, when it starts. If the page layout settles
  // after that (or the window is resized), the map only draws part of itself.
  // Re-measuring whenever the box changes size fixes it.
  useEffect(() => {
    if (!map) return
    const sizeWatcher = new ResizeObserver(() => map.invalidateSize())
    sizeWatcher.observe(map.getContainer())
    return () => sizeWatcher.disconnect()
  }, [map])

  function matchesFilter(sport: string): boolean {
    return selectedSports.length === 0 || selectedSports.includes(sport)
  }

  // Group the games by venue: one marker per venue, listing all its games.
  const gamesByVenueId = new Map<string, Game[]>()
  for (const game of games) {
    if (!matchesFilter(game.sport)) continue
    if (onlyToday && !startsToday(game)) continue
    // A game whose venue isn't in the data file has no place on the map
    // (e.g. old test games), so it isn't drawn or counted.
    const venue = venuesById.get(game.venue_id)
    if (!venue) continue
    // Group by the venue's own id, not the game's: a game saved at a
    // duplicate that was merged away still joins its venue's dot.
    const venueGames = gamesByVenueId.get(venue.id) ?? []
    venueGames.push(game)
    gamesByVenueId.set(venue.id, venueGames)
  }

  // Venues with games get their own marker below, so skip them here.
  // With "Today" on, the map shows games only: no empty places.
  const plainVenues = onlyToday
    ? []
    : venues.filter(
        (venue) => venue.sports.some(matchesFilter) && !gamesByVenueId.has(venue.id),
      )

  function isWalkable(venue: Venue): boolean {
    if (!myPosition) return false // we don't know where the user is yet
    return distanceKm(myPosition, [venue.lat, venue.lng]) <= walkableKm
  }
  const walkableCount = plainVenues.filter(isWalkable).length

  // Only offer sports that actually exist on the map.
  const sportsOnMap = SPORTS.filter((sport) =>
    venues.some((venue) => venue.sports.includes(sport.slug)),
  )

  function startNewGame(venue: Venue) {
    map?.closePopup()
    setVenueForNewGame(venue)
  }

  function showMyPosition() {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const here: [number, number] = [position.coords.latitude, position.coords.longitude]
        setMyPosition(here)
        map?.setView(here, 15)
      },
      () => alert("Couldn't get your location"),
    )
  }

  // All problems in one list, shown as a banner over the top of the map.
  const problems = [
    venuesFailed && 'Could not load the venues.',
    hasLoadFailed && 'Could not load games. Is the backend running?',
    errorMessage,
  ].filter(Boolean)

  return (
    <section className="venue-map-page">
      <div className="venue-map-area">
        {/* One row floating over the top of the map: buttons on the left (just
            right of the + / − zoom buttons), counts on the right. When there
            isn't room for both, the counts wrap onto a line underneath. */}
        <div className="venue-map-overlay">
          <div className="venue-map-controls">
            {/* The selected mode is purple (see .mode-button.selected in map.css). */}
            <button
              className={mode === 'games' ? 'mode-button selected' : 'mode-button'}
              onClick={() => setMode('games')}
            >
              Group games
            </button>
            <button
              className={mode === 'trials' ? 'mode-button selected' : 'mode-button'}
              onClick={() => setMode('trials')}
            >
              Free trials
            </button>
            {mode === 'games' && (
              <button
                className={onlyToday ? 'today-button active' : 'today-button'}
                aria-pressed={onlyToday}
                onClick={() => setOnlyToday(!onlyToday)}
              >
                Today
              </button>
            )}
            {mode === 'games' && (
              <SportFilter
                options={sportsOnMap}
                selected={selectedSports}
                onChange={setSelectedSports}
              />
            )}
            {/* Same checklist as for games, with the free-trial sports. */}
            {mode === 'trials' && (
              <SportFilter
                options={CLUB_SPORTS}
                selected={selectedClubSports}
                onChange={setSelectedClubSports}
              />
            )}

            <button onClick={showMyPosition}>Near me</button>
          </div>

          {mode === 'trials' && (
            <div className="venue-map-legend">{filteredClubs.length} clubs with free trials</div>
          )}
          {mode === 'games' && (
            <div className="venue-map-legend">
              <span className="legend-dot legend-dot-game" /> {gamesByVenueId.size} with games
              {!onlyToday && (
                <>
                  <span className="legend-dot legend-dot-venue" /> {plainVenues.length} places
                </>
              )}
              {myPosition && !onlyToday && (
                <>
                  <span className="legend-dot legend-dot-walkable" /> {walkableCount} within{' '}
                  {formatSettingDistance(walkableKm)}
                </>
              )}
            </div>
          )}
        </div>

        {/* preferCanvas: draws the 3,000+ dots on one canvas instead of
            3,000 separate page elements, which keeps the map smooth. */}
        <MapContainer
          className="venue-map"
          center={MONTREAL_CENTER}
          zoom={12}
          preferCanvas
          ref={setMap}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
            attribution="&copy; OpenStreetMap contributors | Data: Ville de Montréal (CC-BY 4.0)"
          />

          {mode === "games" && plainVenues.map((venue) => (
            <CircleMarker
              key={venue.id}
              center={[venue.lat, venue.lng]}
              radius={isWalkable(venue) ? 7 : 5}
              pathOptions={isWalkable(venue) ? WALKABLE_STYLE : VENUE_STYLE}
            >
              <Popup>
                <VenueHeading venue={venue} />
                <VenueDetails venue={venue} />
                <GetThere venue={venue} myPosition={myPosition} />
                <button className="venue-popup-button" onClick={() => startNewGame(venue)}>
                  Create a game here
                </button>
              </Popup>
            </CircleMarker>
          ))}

          {/* Games and "you are here" get their own layer above the venues.
              Without it, the venue dots (which load after the games) would be
              drawn on top and hide them. 450 = just above Leaflet's default 400. */}
          {/* pointerEvents none: the layer itself lets clicks through;
              the purple dots switch them back on for themselves. */}
          <Pane name="games" style={{ zIndex: 450, pointerEvents: 'none' }}>
          {mode === "games" && [...gamesByVenueId].map(([venueId, venueGames]) => {
            const venue = venuesById.get(venueId)
            if (!venue) return null // game points at a venue not in the data file
            return (
              <CircleMarker
                key={venueId}
                center={[venue.lat, venue.lng]}
                radius={10}
                pathOptions={{ ...GAME_STYLE, renderer: gamesRenderer }}
              >
                {/* pane="popupPane": without it, the popup would sit inside the
                    games layer, which lets clicks through, so its buttons
                    (Join, Get there…) couldn't be clicked. */}
                <Popup minWidth={260} pane="popupPane">
                  <VenueHeading venue={venue} />
                  <VenueDetails venue={venue} />
                  <ul className="venue-popup-games">
                    {venueGames.map((game) => (
                      <GameCard
                        key={game.id}
                        game={game}
                        venueName={venueDisplayName(venue)}
                        onJoin={join}
                        onLeave={leave}
                        onCancel={cancel}
                      />
                    ))}
                  </ul>
                  <GetThere venue={venue} myPosition={myPosition} />
                  <button className="venue-popup-button" onClick={() => startNewGame(venue)}>
                    Create another game here
                  </button>
                </Popup>
              </CircleMarker>
            )
          })}

          {myPosition && (
            <CircleMarker
              center={myPosition}
              radius={8}
              pathOptions={{ ...ME_STYLE, renderer: gamesRenderer }}
            >
              <Popup pane="popupPane">You are here</Popup>
            </CircleMarker>
          )}
          </Pane>

          {/* Free-trial clubs. Outside the "games" Pane on purpose: that pane
              lets clicks pass through, so club popups wouldn't open in it. */}
          {mode === "trials" && <ClubMarkers clubs={filteredClubs} />}
        </MapContainer>

        {problems.length > 0 && (
          <div className="venue-map-banner">
            {problems.map((problem) => (
              <p key={String(problem)}>{problem}</p>
            ))}
          </div>
        )}

        {/* The create form slides over the bottom of the map,
            so you keep seeing where the game will be. */}
        {mode === "trials" ? (
          <p className="venue-map-hint">Tap an orange dot to see the free trial</p>
        ) : venueForNewGame ? (
          <div className="venue-map-sheet">
            <CreateGameForm
              venue={venueForNewGame}
              onCancel={() => setVenueForNewGame(null)}
              onCreated={() => {
                setVenueForNewGame(null)
                loadGames() // the new game's marker appears right away
              }}
            />
          </div>
        ) : onlyToday ? (
          <p className="venue-map-hint">
            {gamesByVenueId.size > 0
              ? 'Tap a purple dot to join a game today'
              : 'No games today yet. Turn off Today to start one'}
          </p>
        ) : (
          <p className="venue-map-hint">Tap a dot to join a game or start one</p>
        )}
      </div>
    </section>
  )
}

export default VenueMap
