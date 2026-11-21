import { useSyncExternalStore } from 'react'

// The user's settings (Settings tab). Saved in the browser for now; once the
// profile has a real account, the personal ones can move to the backend
// without the rest of the app changing.

export type Theme = 'system' | 'light' | 'dark'

export type Preferences = {
  walkableKm: number // places within this distance turn green after "Near me"
  theme: Theme // 'system' = follow the device's light/dark setting
}

export const DEFAULT_PREFERENCES: Preferences = {
  walkableKm: 1,
  theme: 'system',
}

const STORAGE_KEY = 'sportsmap-preferences'

// Reads the saved settings. Anything missing or unreadable (first visit,
// private window, old format) falls back to the defaults.
function loadPreferences(): Preferences {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    return { ...DEFAULT_PREFERENCES, ...saved }
  } catch {
    return DEFAULT_PREFERENCES
  }
}

let current = loadPreferences()

// Components showing a setting (Settings page, map) register here, so they
// all re-render when it changes.
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function updatePreferences(changes: Partial<Preferences>) {
  current = { ...current, ...changes }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current))
  } catch {
    // Storage blocked (e.g. private window): the change still works until reload.
  }
  applyTheme(current.theme)
  listeners.forEach((listener) => listener())
}

// The hook components use: const { walkableKm } = usePreferences()
export function usePreferences(): Preferences {
  return useSyncExternalStore(subscribe, () => current)
}

// The colours live in index.css. "system" removes the attribute, so the
// device's light/dark setting decides; "light"/"dark" force one.
export function applyTheme(theme: Theme) {
  if (theme === 'system') {
    delete document.documentElement.dataset.theme
  } else {
    document.documentElement.dataset.theme = theme
  }
}

// Apply the saved theme as soon as the app starts, before anything is drawn.
applyTheme(current.theme)
