import { useState } from 'react'
import type { ReactNode } from 'react'
import AuthForm from './AuthForm.tsx'
import { useAuth } from './useAuth.ts'
import './auth.css'

// Wrap any page that needs an account. Logged out: a placeholder with a button that
// opens the login/sign-up form. Logged in: the page itself.
export default function RequireAuth({ feature, children }: { feature: string; children: ReactNode }) {
  const { user, loading } = useAuth()
  const [showForm, setShowForm] = useState(false)

  if (loading) return <p className="auth-gate">Loading…</p>
  if (user) return <>{children}</>

  return (
    <section className="auth-gate">
      <h2>Log in to access {feature}</h2>
      {showForm ? (
        <AuthForm />
      ) : (
        <>
          <p>You need an account to use this section.</p>
          <button type="button" className="auth-primary" onClick={() => setShowForm(true)}>
            Log in to access
          </button>
        </>
      )}
    </section>
  )
}
