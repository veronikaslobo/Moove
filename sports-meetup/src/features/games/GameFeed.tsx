import { useVenues, venueDisplayName } from '../../shared/venues.ts'
import GameCard from './GameCard.tsx'
import { useGames } from './useGames.ts'

type GameFeedProps = {
  // The user's sports from their profile. Empty = show every sport.
  sports?: string[]
}

function GameFeed({ sports = [] }: GameFeedProps) {
  const { games, isLoading, hasLoadFailed, errorMessage, join, leave } = useGames(sports)
  const { venuesById } = useVenues()

  if (isLoading) {
    return <p>Loading games…</p>
  }

  return (
    <section className="game-feed">
      {hasLoadFailed && (
        <p className="game-feed-error">Could not load games. Is the backend running?</p>
      )}
      {errorMessage && <p className="game-feed-error">{errorMessage}</p>}

      {games.length === 0 && !hasLoadFailed && (
        <p>No games coming up. Create one from the Map tab.</p>
      )}

      <ul>
        {games.map((game) => (
          <GameCard
            key={game.id}
            game={game}
            venueName={venueDisplayName(venuesById.get(game.venue_id))}
            onJoin={join}
            onLeave={leave}
          />
        ))}
      </ul>
    </section>
  )
}

export default GameFeed
