import { createContext } from 'react'
import type { AuthSession, AuthUser } from '@/lib/authApi'

export type AuthStatus = 'authenticated' | 'anonymous'

export type AuthContextValue = {
  status: AuthStatus
  user: AuthUser | null
  session: AuthSession | null
  signInWithPassword: (
    email: string,
    password: string,
  ) => Promise<AuthSession>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
