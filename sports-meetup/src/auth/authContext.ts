import { createContext } from 'react'

export type User = { id: string; email: string }

export type AuthState = {
  user: User | null
  loading: boolean // true until we know whether a session exists
  login: (email: string, password: string) => Promise<void>
  // birthDate: "YYYY-MM-DD". The backend refuses anyone under 18.
  register: (email: string, password: string, birthDate: string) => Promise<void>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthState | null>(null)
