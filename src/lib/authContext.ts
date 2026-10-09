import { createContext } from 'react'
import type { AuthSession, AuthUser } from '@/lib/authApi'

export type AuthStatus = 'authenticated' | 'anonymous'

export type AuthContextValue = {
  status: AuthStatus
  /** Effective user — the View-as target while impersonating. */
  user: AuthUser | null
  /** Real signed-in user (platform admin when viewing as someone else). */
  actor: AuthUser | null
  isViewingAs: boolean
  session: AuthSession | null
  signInWithPassword: (
    email: string,
    password: string,
    options?: import('@/lib/authApi').SignInOptions,
  ) => Promise<AuthSession>
  selectWorkspace: (workspaceId: string) => Promise<AuthSession>
  /** Re-open the workspace picker without signing out. */
  requestWorkspacePicker: () => void
  startViewAs: (input: {
    userId: string
    email?: string
    name?: string
    role?: AuthUser['role']
    tenantId: string
    subAgentId?: string
  }) => Promise<AuthSession>
  stopViewAs: () => Promise<AuthSession>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
