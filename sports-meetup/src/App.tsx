import { useState } from 'react'
import AuthProvider from './auth/AuthProvider.tsx'
import RequireAuth from './auth/RequireAuth.tsx'
import { useAuth } from './auth/useAuth.ts'
import CommunityPage from './pages/CommunityPage.tsx'
import MapPage from './pages/MapPage.tsx'
import ProfilePage from './pages/ProfilePage.tsx'
import SettingsPage from './pages/SettingsPage.tsx'
import type { TabId } from './shared/TabBar.tsx'
import TabBar from './shared/TabBar.tsx'
import './shared/AppShell.css'

function AppContent() {
  const [activeTab, setActiveTab] = useState<TabId>('map')
  const { user, logout } = useAuth()

  return (
    <>
      <header className="app-header">
        {/* The wrapper crops the empty space around the word in the PNG. */}
        <span className="app-wordmark">
          <img src="/moove-logo.png" alt="Moove" />
        </span>
        <img className="app-mascot" src="/moove-cow.png" alt="" />
        {user && (
          <span className="app-auth">
            {user.email}
            <button type="button" onClick={logout}>Log out</button>
          </span>
        )}
      </header>

      <main className="app-page">
        {activeTab === 'map' && <MapPage />}
        {activeTab === 'profile' && (
          <RequireAuth feature="your profile"><ProfilePage /></RequireAuth>
        )}
        {activeTab === 'community' && (
          <RequireAuth feature="the community"><CommunityPage /></RequireAuth>
        )}
        {activeTab === 'settings' && <SettingsPage />}
      </main>

      <TabBar activeTab={activeTab} onSelect={setActiveTab} />
    </>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
