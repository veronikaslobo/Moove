import { useState } from 'react'
import FavouritesView from '../features/favourites/FavouritesView.tsx'
import ProfileView from '../features/profile/ProfileView.tsx'
import SettingsPage from './SettingsPage.tsx'
import './ProfilePage.css'

type Section = 'favourites' | 'details' | 'settings'

// The Settings tab used to have this gear, so it moved here with the settings.
function GearIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

// Only shown to logged-in users: App.tsx wraps this page in <RequireAuth>.
// Three views: the saved favourites, the user's own details, and the settings.
function ProfilePage() {
  const [section, setSection] = useState<Section>('favourites')

  return (
    <>
      <div className="page-content profile-nav">
        <div className="profile-sections" role="group" aria-label="Profile sections">
          <button
            type="button"
            className={section === 'favourites' ? 'selected' : ''}
            aria-pressed={section === 'favourites'}
            onClick={() => setSection('favourites')}
          >
            Favourites
          </button>
          <button
            type="button"
            className={section === 'details' ? 'selected' : ''}
            aria-pressed={section === 'details'}
            onClick={() => setSection('details')}
          >
            My details
          </button>
        </div>
        <button
          type="button"
          className={section === 'settings' ? 'profile-settings selected' : 'profile-settings'}
          aria-pressed={section === 'settings'}
          onClick={() => setSection('settings')}
        >
          <GearIcon />
          Settings
        </button>
      </div>

      {section === 'favourites' && <FavouritesView />}
      {section === 'details' && <ProfileView />}
      {section === 'settings' && <SettingsPage />}
    </>
  )
}

export default ProfilePage
