import 'leaflet/dist/leaflet.css'
import type { Map as LeafletMap } from 'leaflet'
import { useState } from 'react'
import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet'
import CreateGameForm from '../games/CreateGameForm.tsx'
import GameCard from '../games/GameCard.tsx'
import type { Game } from '../games/api.ts'
import { useGames } from '../games/useGames.ts'
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

function VenueMap() {
  const { venues, venuesById, hasFailed: venuesFailed } = useVenues()
  const { games, hasLoadFailed, errorMessage, loadGames, join, leave } = useGames()

  const [sportFilter, setSportFilter] = useState('all')
  const [map, setMap] = useState<LeafletMap | null>(null)
  const [myPosition, setMyPosition] = useState<[number, number] | null>(null)
  const [venueForNewGame, setVenueForNewGame] = useState<Venue | null>(null)

  function matchesFilter(sport: string): boolean {
    return sportFilter === 'all' || sport === sportFilter
  }

  // Group the games by venue: one marker per venue, listing all its games.
  const gamesByVenueId = new Map<string, Game[]>()
  for (const game of games) {
    if (!matchesFilter(game.sport)) continue
    const venueGames = gamesByVenueId.get(game.venue_id) ?? []
    venueGames.push(game)
    gamesByVenueId.set(game.venue_id, venueGames)
  }

  // Venues with games get their own marker below, so skip them here.
  const plainVenues = venues.filter(
    (venue) => venue.sports.some(matchesFilter) && !gamesByVenueId.has(venue.id),
  )

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

  return (
    <section className="venue-map-page">
      <div className="venue-map-controls">
        <label>
          Sport{' '}
          <select value={sportFilter} onChange={(event) => setSportFilter(event.target.value)}>
            <option value="all">All</option>
            {sportsOnMap.map((sport) => (
              <option key={sport.slug} value={sport.slug}>
                {sport.label}
              </option>
            ))}
          </select>
        </label>
        <button onClick={showMyPosition}>Near me</button>
        <span>
          {plainVenues.length + gamesByVenueId.size} places · {gamesByVenueId.size} with games
        </span>
      </div>

      {venuesFailed && <p className="game-feed-error">Could not load the venues.</p>}
      {hasLoadFailed && (
        <p className="game-feed-error">Could not load games. Is the backend running?</p>
      )}
      {errorMessage && <p className="game-feed-error">{errorMessage}</p>}

      {venueForNewGame ? (
        <CreateGameForm
          venue={venueForNewGame}
          onCancel={() => setVenueForNewGame(null)}
          onCreated={() => {
            setVenueForNewGame(null)
            loadGames() // the new game's marker appears right away
          }}
        />
      ) : (
        <p className="venue-map-hint">Tap a spot on the map to create a game there.</p>
      )}

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
            radius={5}
            pathOptions={VENUE_STYLE}
          >
            <Popup>
              <b>{venue.name}</b>
              <br />
              {venue.borough}
              <br />
              <button className="venue-popup-button" onClick={() => startNewGame(venue)}>
                Create a game here
              </button>
            </Popup>
          </CircleMarker>
        ))}

        {[...gamesByVenueId].map(([venueId, venueGames]) => {
          const venue = venuesById.get(venueId)
          if (!venue) return null // game points at a venue not in the data file
          return (
            <CircleMarker
              key={venueId}
              center={[venue.lat, venue.lng]}
              radius={10}
              pathOptions={GAME_STYLE}
            >
              <Popup minWidth={260}>
                <b>{venueDisplayName(venue)}</b>
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
                <button className="venue-popup-button" onClick={() => startNewGame(venue)}>
                  Create another game here
                </button>
              </Popup>
            </CircleMarker>
          )
        })}

        {myPosition && (
          <CircleMarker center={myPosition} radius={8} pathOptions={ME_STYLE}>
            <Popup>You are here</Popup>
          </CircleMarker>
        )}
      </MapContainer>
    </section>
  )
}

export default VenueMap
