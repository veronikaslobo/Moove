// All calls to the backend's /favorites endpoints live here.
import { api } from '../../api/client.ts'
import type { Game } from '../games/api.ts'
import type { Post } from '../posts/api.ts'

// What can be saved: a game, a free trial (a club from data/clubs.ts) or a community post.
export type FavouriteKind = 'game' | 'trial' | 'post'

// A saved game, in the same shape as the games feed, plus whether it already started.
export type FavouriteGame = Game & { past: boolean }

export type Favourites = {
  games: FavouriteGame[]
  trials: string[] // club ids; the club details come from data/clubs.ts
  posts: Post[]
}

export const getFavourites = () => api<Favourites>('/favorites')

export const addFavourite = (kind: FavouriteKind, id: number) =>
  api<null>(`/favorites/${kind}/${id}`, { method: 'PUT' })

export const removeFavourite = (kind: FavouriteKind, id: number) =>
  api<null>(`/favorites/${kind}/${id}`, { method: 'DELETE' })
