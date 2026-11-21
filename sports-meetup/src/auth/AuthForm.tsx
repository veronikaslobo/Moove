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
}

export default function AuthForm() {
  const { login, register } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const isRegister = mode === 'register'

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await (isRegister ? register : login)(email, password)
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
      {error && <p role="alert" className="auth-error">{error}</p>}
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
