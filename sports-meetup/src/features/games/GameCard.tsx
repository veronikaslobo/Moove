import { sportLabel } from '../../shared/sports.ts'
import type { Game, SkillLevel } from './api.ts'
import { useAuth } from '../../auth/useAuth.ts'
import FavouriteButton from '../favourites/FavouriteButton.tsx'
import GamePlayers from './GamePlayers.tsx'
import './games.css'

type GameCardProps = {
  game: Game
  venueName: string
  onJoin: (gameId: number) => void
  onLeave: (gameId: number) => void
  onCancel: (gameId: number) => void // only shown to the host
}

const SKILL_LABELS: Record<SkillLevel, string> = {
  all: 'All levels',
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
}

function formatStartTime(startsAt: string): string {
  // The backend sends UTC; the browser shows it in the user's own time zone.
  return new Date(startsAt).toLocaleString('en-CA', {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function GameCard({ game, venueName, onJoin, onLeave, onCancel }: GameCardProps) {
  //const isHost = game.host_id === getUserId()
  const { user } = useAuth()
  const isHost = user !== null && game.host_id === user.id

  const isFull = game.spots_left === 0

  function confirmCancel() {
    // Players who joined lose their spot too, so ask before deleting.
    const otherPlayers = game.total_spots - game.spots_left - 1 // minus the host
    const warning =
      otherPlayers > 0
        ? `Cancel this game? The ${otherPlayers} player(s) who joined will lose their spot.`
        : 'Cancel this game?'
    if (window.confirm(warning)) onCancel(game.id)
  }

  // One button, four possible states. Order matters:
  // the host can't leave their own game (only cancel it),
  // and "Leave" wins over "Full".
  let actionButton
  if (isHost) {
    actionButton = (
      <button className="danger" onClick={confirmCancel}>
        Cancel game
      </button>
    )
  } else if (game.joined) {
    actionButton = <button onClick={() => onLeave(game.id)}>Leave</button>
  } else if (isFull) {
    actionButton = <button disabled>Full</button>
  } else if (!user) {
    // This handles logged-out visitors
    actionButton = <button disabled>Log in to join</button>
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
        <div className="game-card-title">
          <h2>{sportLabel(game.sport)}</h2>
          <FavouriteButton kind="game" id={game.id} label="this game" />
        </div>
        <p>{formatStartTime(game.starts_at)}</p>
        <p>{venueName}</p>
        <p>
          {SKILL_LABELS[game.skill_level]}
          {' · '}
          {game.spots_left} of {game.total_spots} spots left
        </p>
        {game.notes && <p className="game-card-notes">{game.notes}</p>}
        {isHost && <p className="game-card-host">You're hosting</p>}
        {isHost && (
          <GamePlayers gameId={game.id} playerCount={game.total_spots - game.spots_left} />
        )}
      </div>
      {actionButton}
    </li>
  )
}

export default GameCard
