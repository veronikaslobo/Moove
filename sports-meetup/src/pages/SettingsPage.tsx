import { useState } from 'react'
import { formatSettingDistance } from '../shared/geo.ts'
import type { Theme } from '../shared/preferences.ts'
import { updatePreferences, usePreferences } from '../shared/preferences.ts'
import './SettingsPage.css'

// Allowed range for the walking distance. Past 20 km nothing is "walkable".
const MIN_KM = 0.1
const MAX_KM = 20

const THEME_OPTIONS: { theme: Theme; label: string }[] = [
  { theme: 'system', label: 'Same as device' },
  { theme: 'light', label: 'Light' },
  { theme: 'dark', label: 'Dark' },
]

// Changes are saved right away: no Save button to forget.
function SettingsPage() {
  const { walkableKm, theme } = usePreferences()

  // What's in the box, as typed. Kept apart from the saved value so the user
  // can type "1." or clear the box without it jumping back.
  const [distanceText, setDistanceText] = useState(String(walkableKm))
  const typedKm = Number(distanceText)
  const isDistanceValid =
    distanceText.trim() !== '' && typedKm >= MIN_KM && typedKm <= MAX_KM

  function changeDistance(text: string) {
    setDistanceText(text)
    const km = Number(text)
    // Only save sensible values; the hint below explains otherwise.
    if (text.trim() !== '' && km >= MIN_KM && km <= MAX_KM) {
      updatePreferences({ walkableKm: km })
    }
  }

  return (
    <div className="page-content">
      <h1>Settings</h1>

      <section className="setting">
        <h2>Walking distance</h2>
        {/* Shows the saved distance, so it updates as the user types. */}
        <p>
          After "Near me", the map will display places within {formatSettingDistance(walkableKm)}{' '}
          in green.
        </p>
        <label className="setting-distance">
          <input
            type="number"
            inputMode="decimal"
            min={MIN_KM}
            max={MAX_KM}
            step={0.1}
            value={distanceText}
            onChange={(event) => changeDistance(event.target.value)}
          />
          km
        </label>
        {!isDistanceValid && (
          <p className="setting-error">
            Enter a distance between {MIN_KM} and {MAX_KM} km. Until then, the map will keep
            displaying places within {formatSettingDistance(walkableKm)} in green.
          </p>
        )}
      </section>

      <section className="setting">
        <h2>Theme</h2>
        <div className="setting-choices">
          {THEME_OPTIONS.map((option) => (
            <button
              key={option.theme}
              className={theme === option.theme ? 'selected' : ''}
              onClick={() => updatePreferences({ theme: option.theme })}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}

export default SettingsPage
