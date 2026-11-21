import { useCallback, useEffect, useState } from 'react'
import type { Game } from './api.ts'
import { joinGame, leaveGame, listGames } from './api.ts'

// How often the games are re-fetched, so a spot taken on someone else's
// phone shows up here without a manual refresh.
const REFRESH_EVERY_MS = 5000

const ERROR_MESSAGES: Record<string, string> = {
  game_full: 'Someone just took the last spot.',
  game_not_found: 'This game no longer exists.',
}

// Shared by the Community feed and the map: loading, refreshing,
// joining and leaving games all behave the same in both places.
export function useGames(sports: string[] = []) {
  const [games, setGames] = useState<Game[]>([])
  const [isLoading, setIsLoading] = useState(true)
  // Kept apart so the 5-second refresh doesn't erase a message
  // the user still needs to read:
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

  useEffect(() => {
    loadGames()
    const refreshTimer = setInterval(loadGames, REFRESH_EVERY_MS)

    // Stop the timer when the component using it disappears (tab change).
    return () => clearInterval(refreshTimer)
  }, [loadGames])

  // Join and leave share the same steps: call the backend, then reload
  // so spots left always comes from the server, never from a guess.
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

  return {
    games,
    isLoading,
    hasLoadFailed,
    errorMessage,
    loadGames,
    join: (gameId: number) => runAction(() => joinGame(gameId)),
    leave: (gameId: number) => runAction(() => leaveGame(gameId)),
  }
}
