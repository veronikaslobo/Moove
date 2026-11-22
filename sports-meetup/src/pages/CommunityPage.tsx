import GameFeed from '../features/games/GameFeed.tsx'
import CommunityPosts from '../features/posts/CommunityPosts.tsx'

// Only shown to logged-in users (App.tsx wraps it in RequireAuth).
function CommunityPage() {
  return (
    <div className="page-content">
      <h1>Community</h1>
      <CommunityPosts />

      <h2>Upcoming games</h2>
      <GameFeed />
    </div>
  )
}

export default CommunityPage
