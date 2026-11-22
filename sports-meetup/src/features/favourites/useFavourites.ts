import { useContext } from 'react'
import { FavouritesContext } from './favouritesContext.ts'

export function useFavourites() {
  const ctx = useContext(FavouritesContext)
  if (!ctx) throw new Error('useFavourites must be used inside <FavouritesProvider>')
  return ctx
}
