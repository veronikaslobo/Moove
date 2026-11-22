// All calls to the backend for community posts live here.
import { api } from '../../api/client.ts'

export const MAX_POST_LENGTH = 1000 // same limit as the backend (posts.py)

export type Post = {
  id: number
  body: string
  created_at: string // UTC, e.g. 2026-11-21T19:30:00Z
  author_name: string | null // from the author's profile; null = no name set
  mine: boolean // written by the current user? (shows "Delete")
}

export function listPosts(): Promise<Post[]> {
  return api<Post[]>('/posts')
}

export function createPost(body: string): Promise<Post> {
  return api<Post>('/posts', { method: 'POST', body: { body } })
}

export function deletePost(postId: number): Promise<unknown> {
  return api(`/posts/${postId}`, { method: 'DELETE' })
}
