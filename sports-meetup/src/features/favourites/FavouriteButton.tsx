import { useState } from 'react'
import type { MouseEvent } from 'react'
import { useAuth } from '../../auth/useAuth.ts'
import type { FavouriteKind } from './api.ts'
import { useFavourites } from './useFavourites.ts'
import './favourites.css'

type FavouriteButtonProps = {
  kind: FavouriteKind
  id: number
  label: string // what it is, for screen readers: "this game", "this free trial"…
}

// The heart. Put it next to anything that can be saved.
function FavouriteButton({ kind, id, label }: FavouriteButtonProps) {
  const { user } = useAuth()
  const { isFavourite, toggle } = useFavourites()
  const [isBusy, setIsBusy] = useState(false)
  const isSaved = isFavourite(kind, id)

  async function onClick(event: MouseEvent) {
    event.stopPropagation() // don't also click whatever the heart sits on
    if (!user || isBusy) return
    setIsBusy(true)
    try {
      await toggle(kind, id)
    } catch {
      // toggle() has already put the heart back
    } finally {
      setIsBusy(false)
    }
  }

  const text = !user
    ? 'Log in to save favourites'
    : isSaved
      ? `Remove ${label} from favourites`
      : `Save ${label} to favourites`

  return (
    <button
      type="button"
      className={isSaved ? 'fav-button is-saved' : 'fav-button'}
      onClick={onClick}
      disabled={!user}
      aria-pressed={user ? isSaved : undefined}
      aria-label={text}
      title={text}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill={isSaved ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
      </svg>
    </button>
  )
}

export default FavouriteButton
