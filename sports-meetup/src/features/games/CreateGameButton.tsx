import { useState } from 'react'
import CreateGameForm from './CreateGameForm.tsx'
import './games.css'

type CreateGameButtonProps = {
  // Optional: lets the page react to a new game (e.g. add a marker on the map).
  onCreated?: () => void
}

// Self-contained: a button that opens the create game form.
// Drop <CreateGameButton /> anywhere; it needs nothing from the page around it.
function CreateGameButton({ onCreated }: CreateGameButtonProps) {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [wasJustCreated, setWasJustCreated] = useState(false)

  if (isFormOpen) {
    return (
      <div className="create-game">
        <CreateGameForm
          onCancel={() => setIsFormOpen(false)}
          onCreated={() => {
            setIsFormOpen(false)
            setWasJustCreated(true)
            onCreated?.()
          }}
        />
      </div>
    )
  }

  return (
    <div className="create-game">
      {wasJustCreated && (
        <p className="create-game-confirmation">
          Game posted. It's now listed in Community posts.
        </p>
      )}
      <button
        className="create-game-button"
        onClick={() => {
          setWasJustCreated(false)
          setIsFormOpen(true)
        }}
      >
        + Create a game
      </button>
    </div>
  )
}

export default CreateGameButton
