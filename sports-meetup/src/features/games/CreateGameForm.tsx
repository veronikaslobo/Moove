import { useState } from 'react'
import { SPORTS } from '../../shared/sports.ts'
import type { Venue } from '../../shared/venues.ts'
import { venueDisplayName } from '../../shared/venues.ts'
import type { SkillLevel } from './api.ts'
import { createGame } from './api.ts'
import './games.css'

type CreateGameFormProps = {
  venue: Venue // chosen on the map, so the form doesn't ask "where"
  onCreated: () => void
  onCancel: () => void
}

const SKILL_LEVELS: { value: SkillLevel; label: string }[] = [
  { value: 'all', label: 'All levels' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
]

// Games start on 5-minute marks (7:00, 7:05, 7:10…).
const MINUTE_STEP = 5
const HOURS = Array.from({ length: 24 }, (_, hour) => hour)
const MINUTES = Array.from({ length: 60 / MINUTE_STEP }, (_, index) => index * MINUTE_STEP)

function hourLabel(hour: number): string {
  return `${hour % 12 || 12} ${hour < 12 ? 'a.m.' : 'p.m.'}`
}

// "2026-11-21", in the user's own time zone (what <input type="date"> uses).
function toDateInputValue(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

// Default start: one hour from now, rounded up to the next 5-minute mark.
function defaultStart(): Date {
  const start = new Date(Date.now() + 60 * 60 * 1000)
  const roundedMinutes = Math.ceil(start.getMinutes() / MINUTE_STEP) * MINUTE_STEP
  start.setMinutes(roundedMinutes, 0, 0) // 60 rolls over to the next hour by itself
  return start
}

function CreateGameForm({ venue, onCreated, onCancel }: CreateGameFormProps) {
  // Start on the venue's own sport: a tennis court almost always hosts tennis.
  const [sport, setSport] = useState(venue.sports[0] ?? SPORTS[0].slug)
  const [initialStart] = useState(defaultStart)
  const [date, setDate] = useState(toDateInputValue(initialStart))
  const [hour, setHour] = useState(initialStart.getHours())
  const [minute, setMinute] = useState(initialStart.getMinutes())
  const [totalSpots, setTotalSpots] = useState(10)
  const [skillLevel, setSkillLevel] = useState<SkillLevel>('all')
  const [notes, setNotes] = useState('')

  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function submitGame() {
    // Build the start in the user's local time from the three fields;
    // toISOString() below converts it to UTC for the backend.
    const [year, month, day] = date.split('-').map(Number)
    const startsAt = new Date(year, month - 1, day, hour, minute)
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
        venue_id: venue.id,
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
      <h2>New game at {venueDisplayName(venue)}</h2>

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

      <div className="create-game-when">
        <label>
          Date
          <input
            type="date"
            required
            min={toDateInputValue(new Date())}
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </label>
        <label>
          Hour
          <select value={hour} onChange={(event) => setHour(Number(event.target.value))}>
            {HOURS.map((option) => (
              <option key={option} value={option}>
                {hourLabel(option)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Minutes
          <select value={minute} onChange={(event) => setMinute(Number(event.target.value))}>
            {MINUTES.map((option) => (
              <option key={option} value={option}>
                {String(option).padStart(2, '0')}
              </option>
            ))}
          </select>
        </label>
      </div>

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
