import { useState } from 'react'
import type { Player } from './api.ts'
import { listPlayers, pictureUrl } from './api.ts'

type GamePlayersProps = {
  gameId: number
  playerCount: number // shown on the link before the list is loaded
}

// Host only: a "See who's coming" link that opens the list of players.
// The list is loaded when opened, so the map doesn't ask for every game's players.
function GamePlayers({ gameId, playerCount }: GamePlayersProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [players, setPlayers] = useState<Player[] | null>(null)
  const [hasFailed, setHasFailed] = useState(false)

  function toggle() {
    const opening = !isOpen
    setIsOpen(opening)
    if (!opening) return
    // Reload each time it opens, so new players show up.
    setHasFailed(false)
    listPlayers(gameId)
      .then(setPlayers)
      .catch(() => setHasFailed(true))
  }

  return (
    <div className="game-players">
      <button type="button" className="game-players-toggle" onClick={toggle} aria-expanded={isOpen}>
        {isOpen ? 'Hide moomates' : `See your moomates (${playerCount})`}
      </button>

      {isOpen && hasFailed && <p>Couldn't load your moomates.</p>}
      {isOpen && !hasFailed && players === null && <p>Loading…</p>}
      {isOpen && players && (
        <ul className="game-players-list">
          {players.map((player) => (
            <li key={player.user_id}>
              <Avatar player={player} />
              <span>
                {player.display_name ?? 'No name yet'}
                {player.is_host && <span className="game-players-you"> (you, host)</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// Profile picture, or the first letter of the name in a circle.
function Avatar({ player }: { player: Player }) {
  if (player.has_picture) {
    return <img className="game-players-avatar" src={pictureUrl(player.user_id)} alt="" />
  }
  const initial = player.display_name?.trim()[0]?.toUpperCase() ?? '?'
  return <span className="game-players-avatar">{initial}</span>
}

export default GamePlayers
