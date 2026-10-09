import {
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  type AuthSession,
  readSession,
  selectAuthWorkspace,
  signInWithPassword as apiSignInWithPassword,
  signOut as apiSignOut,
  writeSession,
} from '@/lib/authApi'
import { AuthContext, type AuthContextValue } from '@/lib/authContext'
import { rehydratePlatformData } from '@/lib/data/rehydrate'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() => readSession())

  const signInWithPassword = useCallback(
    async (
      email: string,
      password: string,
      options?: Parameters<typeof apiSignInWithPassword>[2],
    ) => {
      const next = await apiSignInWithPassword(email, password, options)
      setSession(next)
      await rehydratePlatformData()
      return next
    },
    [],
  )

  const selectWorkspace = useCallback(async (workspaceId: string) => {
    const next = await selectAuthWorkspace(workspaceId)
    setSession(next)
    await rehydratePlatformData()
    return next
  }, [])

  const requestWorkspacePicker = useCallback(() => {
    void (async () => {
      const current = readSession()
      if (!current) return
      const { listWorkspacesForUser } = await import('@/lib/authWorkspaces')
      const workspaces =
        current.workspaces && current.workspaces.length > 0
          ? current.workspaces
          : listWorkspacesForUser(current.user, current.tenantId)
      if (workspaces.length < 2) return
      const next = {
        ...current,
        workspaces,
        workspacePending: true,
      }
      writeSession(next)
      setSession(next)
    })()
  }, [])

  const signOut = useCallback(async () => {
    await apiSignOut()
    setSession(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      status: session ? 'authenticated' : 'anonymous',
      user: session?.user ?? null,
      session,
      signInWithPassword,
      selectWorkspace,
      requestWorkspacePicker,
      signOut,
    }),
    [
      session,
      signInWithPassword,
      selectWorkspace,
      requestWorkspacePicker,
      signOut,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
