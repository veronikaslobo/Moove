import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { api } from '../api/client.ts'
import { AuthContext } from './authContext.ts'
import type { User } from './authContext.ts'

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // On every page load, ask the backend "who am I?". The browser sends the login
  // cookie automatically, so this is what keeps you logged in after a refresh.
  useEffect(() => {
    let cancelled = false
    api<User>('/auth/me')
      .then((u) => !cancelled && setUser(u))
      .catch(() => !cancelled && setUser(null))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [])

  const login = async (email: string, password: string) =>
    setUser(await api<User>('/auth/login', { method: 'POST', body: { email, password } }))

  const register = async (email: string, password: string, birthDate: string) =>
    setUser(
      await api<User>('/auth/register', {
        method: 'POST',
        body: { email, password, birth_date: birthDate },
      }),
    )

  const logout = async () => {
    try {
      await api('/auth/logout', { method: 'POST' })
    } finally {
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
