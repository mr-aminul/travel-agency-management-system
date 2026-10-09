import {
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  type AuthSession,
  isViewingAsSession,
  readSession,
  selectAuthWorkspace,
  sessionActor,
  signInWithPassword as apiSignInWithPassword,
  signOut as apiSignOut,
  startViewAsUser,
  stopViewAsUser,
  writeSession,
} from '@/lib/authApi'
import { AuthContext, type AuthContextValue } from '@/lib/authContext'
import { rehydratePlatformData } from '@/lib/data/rehydrate'
import { queryClient } from '@/lib/queryClient'

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
      if (!current || isViewingAsSession(current)) return
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

  const startViewAs = useCallback(
    async (input: Parameters<typeof startViewAsUser>[0]) => {
      const next = await startViewAsUser(input)
      setSession(next)
      queryClient.clear()
      await rehydratePlatformData()
      return next
    },
    [],
  )

  const stopViewAs = useCallback(async () => {
    const next = await stopViewAsUser()
    setSession(next)
    queryClient.clear()
    await rehydratePlatformData()
    return next
  }, [])

  const signOut = useCallback(async () => {
    await apiSignOut()
    setSession(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      status: session ? 'authenticated' : 'anonymous',
      user: session?.user ?? null,
      actor: sessionActor(session),
      isViewingAs: isViewingAsSession(session),
      session,
      signInWithPassword,
      selectWorkspace,
      requestWorkspacePicker,
      startViewAs,
      stopViewAs,
      signOut,
    }),
    [
      session,
      signInWithPassword,
      selectWorkspace,
      requestWorkspacePicker,
      startViewAs,
      stopViewAs,
      signOut,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
