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

function GameFeed({ sports = [] }: GameFeedProps) {
  const [games, setGames] = useState<Game[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Joined into one string so the effect below only re-runs
  // when the actual list of sports changes.
  const sportsKey = sports.join(',')

  const loadGames = useCallback(async () => {
    try {
      const selectedSports = sportsKey ? sportsKey.split(',') : []
      setGames(await listGames(selectedSports))
    } catch {
      setErrorMessage('Could not load games. Is the backend running?')
    } finally {
      setIsLoading(false)
    }
  }, [sportsKey])

  useEffect(() => {
    loadGames()
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
      {errorMessage && <p className="game-feed-error">{errorMessage}</p>}

      {games.length === 0 && !errorMessage && (
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
