import ProfileView from '../features/profile/ProfileView.tsx'

// Only shown to logged-in users: App.tsx wraps this page in <RequireAuth>.
function ProfilePage() {
  return <ProfileView />
}

export default ProfilePage
