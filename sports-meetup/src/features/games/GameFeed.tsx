import { useCallback, useEffect, useState } from 'react'
import type { Game } from './api.ts'
import { joinGame, leaveGame, listGames } from './api.ts'
import GameCard from './GameCard.tsx'
import './games.css'

type GameFeedProps = {
  // The user's sports from their profile. Empty = show every sport.
  sports?: string[]
}

const ERROR_MESSAGES: Record<string, string> = {
  game_full: 'Someone just took the last spot.',
  game_not_found: 'This game no longer exists.',
}

// How often the feed asks the backend for fresh spot counts.
const REFRESH_EVERY_MS = 5000

function GameFeed({ sports = [] }: GameFeedProps) {
  const [games, setGames] = useState<Game[]>([])
  const [isLoading, setIsLoading] = useState(true)
  // Two separate problems, kept apart so the 5-second refresh
  // doesn't erase a message the user still needs to read:
  // errorMessage = a join/leave that failed; hasLoadFailed = backend unreachable.
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [hasLoadFailed, setHasLoadFailed] = useState(false)

  // Joined into one string so the effect below only re-runs
  // when the actual list of sports changes.
  const sportsKey = sports.join(',')

  const loadGames = useCallback(async () => {
    try {
      const selectedSports = sportsKey ? sportsKey.split(',') : []
      setGames(await listGames(selectedSports))
      setHasLoadFailed(false) // recovers by itself once the backend is back
    } catch {
      setHasLoadFailed(true)
    } finally {
      setIsLoading(false)
    }
  }, [sportsKey])

  // Load once when the feed appears, then again every few seconds, so a spot
  // taken on someone else's phone shows up here without a manual refresh.
  useEffect(() => {
    loadGames()
    const refreshTimer = setInterval(loadGames, REFRESH_EVERY_MS)

    // Stop the timer when the user leaves this tab of the app.
    return () => clearInterval(refreshTimer)
  }, [loadGames])

  // Join and leave share the same steps: call the backend, then reload
  // the feed so spots left always comes from the server, never from a guess.
  async function runAction(action: () => Promise<unknown>) {
    setErrorMessage(null)
    try {
      await action()
    } catch (error) {
      const code = error instanceof Error ? error.message : ''
      setErrorMessage(ERROR_MESSAGES[code] ?? 'Something went wrong.')
    }
    await loadGames()
  }

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
            onJoin={(gameId) => runAction(() => joinGame(gameId))}
            onLeave={(gameId) => runAction(() => leaveGame(gameId))}
          />
        ))}
      </ul>
    </section>
  )
}

export default GameFeed
