import { useState } from 'react'
import CommunityPage from './pages/CommunityPage.tsx'
import MapPage from './pages/MapPage.tsx'
import ProfilePage from './pages/ProfilePage.tsx'
import SettingsPage from './pages/SettingsPage.tsx'
import type { TabId } from './shared/TabBar.tsx'
import TabBar from './shared/TabBar.tsx'

function App() {
  const [activeTab, setActiveTab] = useState<TabId>('map')

  return (
    <>
      <main className="app-page">
        {activeTab === 'map' && <MapPage />}
        {activeTab === 'profile' && <ProfilePage />}
        {activeTab === 'community' && <CommunityPage />}
        {activeTab === 'settings' && <SettingsPage />}
      </main>
      <TabBar activeTab={activeTab} onSelect={setActiveTab} />
    </>
  )
}

export default App
