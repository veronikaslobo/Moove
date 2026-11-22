import { useEffect, useState } from 'react'
import type { Post } from './api.ts'
import { createPost, deletePost, listPosts, MAX_POST_LENGTH } from './api.ts'
import FavouriteButton from '../favourites/FavouriteButton.tsx'
import './posts.css'

// "5 min ago", "yesterday", "3 days ago"…
const relativeTime = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
function timeAgo(isoDate: string): string {
  const seconds = (new Date(isoDate).getTime() - Date.now()) / 1000
  const steps: [Intl.RelativeTimeFormatUnit, number][] = [
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ]
  for (const [unit, size] of steps) {
    if (Math.abs(seconds) >= size) return relativeTime.format(Math.round(seconds / size), unit)
  }
  return 'just now'
}

// The top of the Community tab: "Let's get mooving!" doubles as the
// invitation to write a post. Tapping it opens the box to write one;
// otherwise it's just a friendly line above everyone's posts.
function CommunityPosts() {
  const [posts, setPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [problem, setProblem] = useState<string | null>(null)

  const [isWriting, setIsWriting] = useState(false)
  const [draft, setDraft] = useState('')
  const [isSending, setIsSending] = useState(false)

  useEffect(() => {
    listPosts()
      .then(setPosts)
      .catch(() => setProblem('Could not load posts. Is the backend running?'))
      .finally(() => setIsLoading(false))
  }, [])

  function closeComposer() {
    setIsWriting(false)
    setDraft('')
  }

  async function publish() {
    setIsSending(true)
    setProblem(null)
    try {
      const newPost = await createPost(draft.trim())
      setPosts((current) => [newPost, ...current]) // shows at the top right away
      closeComposer()
    } catch {
      setProblem('Could not publish your post. Try again.') // the draft is kept
    } finally {
      setIsSending(false)
    }
  }

  async function remove(postId: number) {
    setProblem(null)
    try {
      await deletePost(postId)
      setPosts((current) => current.filter((post) => post.id !== postId))
    } catch {
      setProblem('Could not delete that post. Try again.')
    }
  }

  const canPublish = draft.trim().length > 0 && !isSending

  return (
    <section className="community-posts">
      {isWriting ? (
        <form
          className="post-composer"
          onSubmit={(event) => {
            event.preventDefault()
            if (canPublish) publish()
          }}
        >
          <textarea
            autoFocus
            aria-label="Write a post"
            placeholder="Let's get mooving! Looking for players, a partner, a game tonight?"
            value={draft}
            maxLength={MAX_POST_LENGTH}
            rows={4}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') closeComposer()
            }}
          />
          <div className="post-composer-actions">
            {/* Only shown near the limit, so it isn't noise the rest of the time. */}
            <span className="post-composer-count">
              {draft.length > MAX_POST_LENGTH - 100 && `${MAX_POST_LENGTH - draft.length} left`}
            </span>
            <button type="button" onClick={closeComposer}>
              Cancel
            </button>
            <button type="submit" className="primary" disabled={!canPublish}>
              {isSending ? 'Posting…' : 'Post'}
            </button>
          </div>
        </form>
      ) : (
        // A real button (not just text), so it works with the keyboard too.
        <button type="button" className="post-prompt" onClick={() => setIsWriting(true)}>
          Let's get mooving!
        </button>
      )}

      {problem && <p className="posts-problem">{problem}</p>}

      {isLoading ? (
        <p>Loading posts…</p>
      ) : (
        <>
          {posts.length === 0 && !problem && (
            <p className="posts-empty">No posts yet. Be the first!</p>
          )}
          <ul className="post-list">
            {posts.map((post) => (
              <li key={post.id} className="post-card">
                <div className="post-card-header">
                  <span className="post-card-author">{post.author_name ?? 'A Moove member'}</span>
                  <time dateTime={post.created_at}>{timeAgo(post.created_at)}</time>
                </div>
                <p className="post-card-body">{post.body}</p>
                <div className="post-card-actions">
                  <FavouriteButton kind="post" id={post.id} label="this post" />
                  {post.mine && (
                    <button type="button" className="post-card-delete" onClick={() => remove(post.id)}>
                      Delete
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

export default CommunityPosts
