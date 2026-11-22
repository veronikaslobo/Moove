import { useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError } from '../api/client.ts'
import { useAuth } from './useAuth.ts'
import './auth.css'

const MESSAGES: Record<string, string> = {
  invalid_credentials: 'Invalid email or password.',
  too_many_attempts: 'Too many attempts. Please wait a few minutes and try again.',
  email_already_registered: 'An account with this email already exists.',
  invalid_input: 'Please enter a valid email and a password of 10 to 128 characters.',
  under_minimum_age: 'Go back to school baby cow 🐮',
  invalid_birth_date: 'Please enter a real date of birth.',
}

// Sign-up is for adults only. The backend enforces it; the form just says so
// early, before the user has typed everything.
const MINIMUM_AGE = 18

// "2026-11-21" → "2008-11-21": the latest birth date that is old enough today.
function latestAllowedBirthDate(): string {
  const date = new Date()
  date.setFullYear(date.getFullYear() - MINIMUM_AGE)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export default function AuthForm() {
  const { login, register } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [birthDate, setBirthDate] = useState('') // "YYYY-MM-DD", sign-up only
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const isRegister = mode === 'register'

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    // Same date format on both sides, so comparing the text compares the dates.
    if (isRegister && birthDate > latestAllowedBirthDate()) {
      setError(MESSAGES.under_minimum_age)
      return
    }
    setBusy(true)
    try {
      if (isRegister) {
        await register(email, password, birthDate)
      } else {
        await login(email, password)
      }
      // On success the context updates and the gate disappears by itself.
    } catch (err) {
      const code = err instanceof ApiError ? err.detail : ''
      setError(MESSAGES[code] ?? 'Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="auth-form" onSubmit={onSubmit}>
      <h2>{isRegister ? 'Create your account' : 'Log in'}</h2>
      <label>
        Email
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
               autoComplete="email" required />
      </label>
      <label>
        Password
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
               autoComplete={isRegister ? 'new-password' : 'current-password'}
               minLength={isRegister ? 10 : undefined} maxLength={128} required />
      </label>
      {isRegister && <small>At least 10 characters.</small>}
      {isRegister && (
        <label>
          Date of birth
          <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)}
                 autoComplete="bday" required />
          {/* No max={…} on purpose: the browser would block the date with its own
              grey bubble, and our under-18 message would never show. */}
        </label>
      )}      {error && <p role="alert" className="auth-error">{error}</p>}
      <button type="submit" className="auth-primary" disabled={busy}>
        {busy ? 'Please wait…' : isRegister ? 'Sign up' : 'Log in'}
      </button>
      <button type="button" className="auth-link"
              onClick={() => { setMode(isRegister ? 'login' : 'register'); setError('') }}>
        {isRegister ? 'Already have an account? Log in' : 'New here? Create an account'}
      </button>
    </form>
  )
}
