import type { Game } from './api.ts'
import { getUserId } from './api.ts'

type GameCardProps = {
  game: Game
  onJoin: (gameId: number) => void
  onLeave: (gameId: number) => void
}

function formatStartTime(startsAt: string): string {
  // The backend sends UTC; the browser shows it in the user's own time zone.
  return new Date(startsAt).toLocaleString('en-CA', {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function GameCard({ game, onJoin, onLeave }: GameCardProps) {
  const isHost = game.host_id === getUserId()
  const isFull = game.spots_left === 0

  // One button, four possible states. Order matters:
  // the host can't leave their own game, and "Leave" wins over "Full".
  let actionButton
  if (isHost) {
    actionButton = <button disabled>You're hosting</button>
  } else if (game.joined) {
    actionButton = <button onClick={() => onLeave(game.id)}>Leave</button>
  } else if (isFull) {
    actionButton = <button disabled>Full</button>
  } else {
    actionButton = (
      <button className="primary" onClick={() => onJoin(game.id)}>
        Join
      </button>
    )
  }

  return (
    <li className="game-card">
      <div className="game-card-info">
        <h2>{game.sport}</h2>
        <p>{formatStartTime(game.starts_at)}</p>
        {/* TODO: show the venue name once venues.json exists */}
        <p>{game.venue_id}</p>
        <p>
          {game.skill_level === 'all' ? 'All levels' : game.skill_level}
          {' · '}
          {game.spots_left} of {game.total_spots} spots left
        </p>
        {game.notes && <p className="game-card-notes">{game.notes}</p>}
      </div>
      {actionButton}
    </li>
  )
}

export default GameCard
