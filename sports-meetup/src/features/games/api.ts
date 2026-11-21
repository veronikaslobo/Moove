// All calls to the Python backend for the games feature live here,
// so the components never build URLs or headers themselves.

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'all'

export type Game = {
  id: number
  host_id: string
  sport: string
  starts_at: string // UTC, e.g. 2026-11-21T19:30:00Z
  venue_id: string
  total_spots: number
  skill_level: SkillLevel
  notes: string | null
  spots_left: number
  joined: boolean // has the current user joined this game?
}

export type NewGame = {
  sport: string
  starts_at: string
  venue_id: string
  total_spots: number
  skill_level: SkillLevel
  notes: string | null
}

// Temporary identity: a random id kept in this browser.
// Replace with the real profile id once the profile feature exists.
export function getUserId(): string {
  const storageKey = 'sportsmap-user-id'
  let userId = localStorage.getItem(storageKey)
  if (!userId) {
    userId = crypto.randomUUID()
    localStorage.setItem(storageKey, userId)
  }
  return userId
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(API_URL + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': getUserId(),
    },
  })

  if (!response.ok) {
    // The backend sends errors as { "detail": "game_full" }
    const body = await response.json().catch(() => null)
    throw new Error(body?.detail ?? `Request failed (${response.status})`)
  }

  return response.json()
}

export function listGames(sports: string[] = []): Promise<Game[]> {
  const query = sports.length > 0 ? `?sports=${sports.join(',')}` : ''
  return request<Game[]>(`/games${query}`)
}

export function createGame(game: NewGame): Promise<{ id: number }> {
  return request('/games', { method: 'POST', body: JSON.stringify(game) })
}

export function joinGame(gameId: number): Promise<{ joined: boolean }> {
  return request(`/games/${gameId}/join`, { method: 'POST' })
}

export function leaveGame(gameId: number): Promise<{ joined: boolean }> {
  return request(`/games/${gameId}/join`, { method: 'DELETE' })
}
