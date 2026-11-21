import type { ReactNode } from 'react'
import './TabBar.css'

export type TabId = 'map' | 'profile' | 'community' | 'settings'

// Simple line icons, drawn inline so there is no icon library to install.
// They use currentColor, so they follow the tab's text colour.
function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

// To add or rename a tab: change this list, then add its page in App.tsx.
const TABS: { id: TabId; label: string; icon: ReactNode }[] = [
  {
    id: 'map',
    label: 'Map',
    icon: (
      <Icon>
        <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" />
        <circle cx="12" cy="10" r="2.5" />
      </Icon>
    ),
  },
  {
    id: 'profile',
    label: 'Profile',
    icon: (
      <Icon>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
      </Icon>
    ),
  },
  {
    id: 'community',
    label: 'Community',
    icon: (
      <Icon>
        <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />
      </Icon>
    ),
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: (
      <Icon>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" />
      </Icon>
    ),
  },
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
          aria-current={tab.id === activeTab ? 'page' : undefined}
          onClick={() => onSelect(tab.id)}
        >
          {tab.icon}
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  )
}

export default TabBar
