import { createContext } from 'react'
import type { FavouriteKind } from './api.ts'

export type FavouritesState = {
  // Has the logged-in user saved this? (Always false when logged out.)
  isFavourite: (kind: FavouriteKind, id: number) => boolean
  // Saves it if it isn't saved yet, removes it if it is. The heart changes right away;
  // if the backend refuses, the heart goes back and this rejects.
  toggle: (kind: FavouriteKind, id: number) => Promise<void>
}

export const FavouritesContext = createContext<FavouritesState | null>(null)
