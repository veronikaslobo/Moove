import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useAuth } from '../../auth/useAuth.ts'
import { addFavourite, getFavourites, removeFavourite } from './api.ts'
import type { FavouriteKind } from './api.ts'
import { FavouritesContext } from './favouritesContext.ts'

// Which items the logged-in user has saved, as keys like "game:12", "trial:3", "post:7".
// This is only what the hearts need; the Favourites page loads the full details itself.
// ownerId = whose list this is, so one person's hearts never show for the next person who logs in.
type Saved = { ownerId: string; keys: Set<string> }

const keyOf = (kind: FavouriteKind, id: number) => `${kind}:${id}`
const NOBODY_YET = new Set<string>()

function FavouritesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const [saved, setSaved] = useState<Saved | null>(null)

  useEffect(() => {
    if (userId === null) return
    let cancelled = false
    getFavourites()
      .then((favourites) => {
        if (cancelled) return
        const keys = new Set<string>()
        favourites.games.forEach((game) => keys.add(keyOf('game', game.id)))
        favourites.posts.forEach((post) => keys.add(keyOf('post', post.id)))
        favourites.trials.forEach((id) => keys.add(`trial:${id}`))
        setSaved({ ownerId: userId, keys })
      })
      .catch(() => {
        // Hearts simply show as empty if the list can't be loaded.
      })
    return () => {
      cancelled = true
    }
  }, [userId])

  const keys = saved !== null && saved.ownerId === userId ? saved.keys : NOBODY_YET

  const isFavourite = useCallback(
    (kind: FavouriteKind, id: number) => keys.has(keyOf(kind, id)),
    [keys],
  )

  const toggle = useCallback(
    async (kind: FavouriteKind, id: number) => {
      if (userId === null) return
      const key = keyOf(kind, id)
      const wasSaved = keys.has(key)

      const show = (isSaved: boolean) =>
        setSaved((previous) => {
          const next = new Set<string>(previous?.ownerId === userId ? previous.keys : [])
          if (isSaved) next.add(key)
          else next.delete(key)
          return { ownerId: userId, keys: next }
        })

      show(!wasSaved) // heart changes right away
      try {
        await (wasSaved ? removeFavourite : addFavourite)(kind, id)
      } catch (error) {
        show(wasSaved) // the backend said no: put the heart back
        throw error
      }
    },
    [userId, keys],
  )

  return (
    <FavouritesContext.Provider value={{ isFavourite, toggle }}>
      {children}
    </FavouritesContext.Provider>
  )
}

export default FavouritesProvider
