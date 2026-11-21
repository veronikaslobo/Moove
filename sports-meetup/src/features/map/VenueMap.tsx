import 'leaflet/dist/leaflet.css'
import type { Map as LeafletMap } from 'leaflet'
import { svg } from 'leaflet'
import { useEffect, useState } from 'react'
import { CircleMarker, MapContainer, Pane, Popup, TileLayer } from 'react-leaflet'
import CreateGameForm from '../games/CreateGameForm.tsx'
import GameCard from '../games/GameCard.tsx'
import GetThere from './GetThere.tsx'
import type { Game } from '../games/api.ts'
import { useGames } from '../games/useGames.ts'
import { distanceKm, WALKABLE_KM } from '../../shared/geo.ts'
import { SPORTS } from '../../shared/sports.ts'
import type { Venue } from '../../shared/venues.ts'
import { useVenues, venueDisplayName } from '../../shared/venues.ts'
import './map.css'

const MONTREAL_CENTER: [number, number] = [45.5019, -73.5674]

// Plain venue = small grey dot. Venue with upcoming games = big coloured dot,
// so "what can I join tonight" stands out from the 3,000+ facilities.
const VENUE_STYLE = { color: '#6b6375', fillColor: '#9ca3af', fillOpacity: 0.7, weight: 1 }
const GAME_STYLE = { color: '#7a1fd1', fillColor: '#aa3bff', fillOpacity: 0.9, weight: 2 }
const ME_STYLE = { color: '#1d4ed8', fillColor: '#3b82f6', fillOpacity: 0.9, weight: 2 }
// After "Near me": venues within walking distance turn green, nudging people
// toward spots they can reach without a car.
const WALKABLE_STYLE = { color: '#15803d', fillColor: '#22c55e', fillOpacity: 0.9, weight: 1 }

function VenueMap() {
  const { venues, venuesById, hasFailed: venuesFailed } = useVenues()
  const { games, hasLoadFailed, errorMessage, loadGames, join, leave } = useGames()

  const [sportFilter, setSportFilter] = useState('all')
  const [map, setMap] = useState<LeafletMap | null>(null)
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
    return sportFilter === 'all' || sport === sportFilter
  }

  // Group the games by venue: one marker per venue, listing all its games.
  const gamesByVenueId = new Map<string, Game[]>()
  for (const game of games) {
    if (!matchesFilter(game.sport)) continue
    // A game whose venue isn't in the data file has no place on the map
    // (e.g. old test games), so it isn't drawn or counted.
    if (!venuesById.has(game.venue_id)) continue
    const venueGames = gamesByVenueId.get(game.venue_id) ?? []
    venueGames.push(game)
    gamesByVenueId.set(game.venue_id, venueGames)
  }

  // Venues with games get their own marker below, so skip them here.
  const plainVenues = venues.filter(
    (venue) => venue.sports.some(matchesFilter) && !gamesByVenueId.has(venue.id),
  )

  function isWalkable(venue: Venue): boolean {
    if (!myPosition) return false // we don't know where the user is yet
    return distanceKm(myPosition, [venue.lat, venue.lng]) <= WALKABLE_KM
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
      <div className="venue-map-toolbar">
        <select
          aria-label="Filter by sport"
          value={sportFilter}
          onChange={(event) => setSportFilter(event.target.value)}
        >
          <option value="all">All sports</option>
          {sportsOnMap.map((sport) => (
            <option key={sport.slug} value={sport.slug}>
              {sport.label}
            </option>
          ))}
        </select>

        <button onClick={showMyPosition}>Near me</button>

        <span className="venue-map-legend">
          <span className="legend-dot legend-dot-game" /> {gamesByVenueId.size} with games
          <span className="legend-dot legend-dot-venue" /> {plainVenues.length} places
          {myPosition && (
            <>
              <span className="legend-dot legend-dot-walkable" /> {walkableCount} within{' '}
              {WALKABLE_KM} km
            </>
          )}
        </span>
      </div>

      <div className="venue-map-area">
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

          {plainVenues.map((venue) => (
            <CircleMarker
              key={venue.id}
              center={[venue.lat, venue.lng]}
              radius={isWalkable(venue) ? 7 : 5}
              pathOptions={isWalkable(venue) ? WALKABLE_STYLE : VENUE_STYLE}
            >
              <Popup>
                <p className="venue-popup-title">{venue.name}</p>
                <p className="venue-popup-borough">{venue.borough}</p>
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
          {[...gamesByVenueId].map(([venueId, venueGames]) => {
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
                  <p className="venue-popup-title">{venue.name}</p>
                  <p className="venue-popup-borough">{venue.borough}</p>
                  <ul className="venue-popup-games">
                    {venueGames.map((game) => (
                      <GameCard
                        key={game.id}
                        game={game}
                        venueName={venueDisplayName(venue)}
                        onJoin={join}
                        onLeave={leave}
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
        {venueForNewGame ? (
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
        ) : (
          <p className="venue-map-hint">Tap a dot to join a game or start one</p>
        )}
      </div>
    </section>
  )
}

export default VenueMap
