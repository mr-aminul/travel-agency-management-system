import { createContext } from 'react'
import type { AuthSession, AuthUser, DemoAccountId } from '@/lib/authApi'

export type AuthStatus = 'authenticated' | 'anonymous'

export type AuthContextValue = {
  status: AuthStatus
  user: AuthUser | null
  session: AuthSession | null
  signInWithGoogle: () => Promise<void>
  signInWithPassword: (email: string, password: string) => Promise<void>
  signInDemo: (accountId: DemoAccountId) => Promise<void>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
