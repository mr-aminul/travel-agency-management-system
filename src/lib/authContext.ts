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
  selectWorkspace: (workspaceId: string) => Promise<AuthSession>
  /** Re-open the workspace picker without signing out. */
  requestWorkspacePicker: () => void
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
