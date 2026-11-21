import './TabBar.css'

export type TabId = 'map' | 'profile' | 'community' | 'settings'

// To add or rename a tab: change this list, then add its page in App.tsx.
const TABS: { id: TabId; label: string }[] = [
  { id: 'map', label: 'Map' },
  { id: 'profile', label: 'Profile' },
  { id: 'community', label: 'Community posts' },
  { id: 'settings', label: 'Settings' },
]

type TabBarProps = {
  activeTab: TabId
  onSelect: (tab: TabId) => void
}

function TabBar({ activeTab, onSelect }: TabBarProps) {
  return (
    <nav className="tab-bar">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          className={tab.id === activeTab ? 'active' : ''}
          onClick={() => onSelect(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  )
}

export default TabBar
