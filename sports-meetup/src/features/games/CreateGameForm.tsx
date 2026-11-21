import { useState } from 'react'
import { SPORTS } from '../../shared/sports.ts'
import type { SkillLevel } from './api.ts'
import { createGame } from './api.ts'
import { PLACEHOLDER_VENUES } from './placeholderVenues.ts'

type CreateGameFormProps = {
  onCreated: () => void
  onCancel: () => void
}

const SKILL_LEVELS: { value: SkillLevel; label: string }[] = [
  { value: 'all', label: 'All levels' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
]

function CreateGameForm({ onCreated, onCancel }: CreateGameFormProps) {
  const [sport, setSport] = useState(SPORTS[0].slug)
  const [startsAtLocal, setStartsAtLocal] = useState('')
  const [venueId, setVenueId] = useState(PLACEHOLDER_VENUES[0].id)
  const [totalSpots, setTotalSpots] = useState(10)
  const [skillLevel, setSkillLevel] = useState<SkillLevel>('all')
  const [notes, setNotes] = useState('')

  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function submitGame() {
    // The input gives local time ("2026-11-21T19:30");
    // the backend wants UTC, which toISOString() produces.
    const startsAt = new Date(startsAtLocal)
    if (startsAt <= new Date()) {
      setErrorMessage('Pick a time in the future.')
      return
    }

    setIsSaving(true)
    setErrorMessage(null)
    try {
      await createGame({
        sport,
        starts_at: startsAt.toISOString(),
        venue_id: venueId,
        total_spots: totalSpots,
        skill_level: skillLevel,
        notes: notes.trim() || null,
      })
      onCreated()
    } catch {
      setErrorMessage('Could not create the game. Try again.')
      setIsSaving(false)
    }
  }

  return (
    <form
      className="create-game-form"
      onSubmit={(event) => {
        event.preventDefault() // stop the browser from reloading the page
        submitGame()
      }}
    >
      <label>
        Sport
        <select value={sport} onChange={(event) => setSport(event.target.value)}>
          {SPORTS.map((option) => (
            <option key={option.slug} value={option.slug}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label>
        When
        <input
          type="datetime-local"
          required
          value={startsAtLocal}
          onChange={(event) => setStartsAtLocal(event.target.value)}
        />
      </label>

      <label>
        Where
        <select value={venueId} onChange={(event) => setVenueId(event.target.value)}>
          {PLACEHOLDER_VENUES.map((venue) => (
            <option key={venue.id} value={venue.id}>
              {venue.name}
            </option>
          ))}
        </select>
      </label>

      <label>
        Total spots (including you)
        <input
          type="number"
          required
          min={2}
          max={50}
          value={totalSpots}
          onChange={(event) => setTotalSpots(Number(event.target.value))}
        />
      </label>

      <label>
        Skill level
        <select
          value={skillLevel}
          onChange={(event) => setSkillLevel(event.target.value as SkillLevel)}
        >
          {SKILL_LEVELS.map((level) => (
            <option key={level.value} value={level.value}>
              {level.label}
            </option>
          ))}
        </select>
      </label>

      <label>
        Notes (optional)
        <textarea
          rows={2}
          maxLength={200}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </label>

      {errorMessage && <p className="game-feed-error">{errorMessage}</p>}

      <div className="create-game-actions">
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="primary" disabled={isSaving}>
          {isSaving ? 'Creating…' : 'Create game'}
        </button>
      </div>
    </form>
  )
}

export default CreateGameForm
