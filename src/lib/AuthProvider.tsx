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
  updateOwnProfile as apiUpdateOwnProfile,
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
      // Clear caches before swapping identity so stores cannot persist the
      // previous agency's rows under the new tenantId.
      queryClient.clear()
      {
        const { setDataBackend, createApiSyncBackend } = await import(
          '@/lib/data'
        )
        setDataBackend(createApiSyncBackend({}))
        window.dispatchEvent(new Event('pd-data-rehydrated'))
      }
      const next = await startViewAsUser(input)
      setSession(next)
      const ok = await rehydratePlatformData()
      if (!ok) {
        const { setDataBackend, createApiSyncBackend } = await import(
          '@/lib/data'
        )
        setDataBackend(createApiSyncBackend({}))
        window.dispatchEvent(new Event('pd-data-rehydrated'))
      }
      return next
    },
    [],
  )

  const stopViewAs = useCallback(async () => {
    queryClient.clear()
    {
      const { setDataBackend, createApiSyncBackend } = await import(
        '@/lib/data'
      )
      setDataBackend(createApiSyncBackend({}))
      window.dispatchEvent(new Event('pd-data-rehydrated'))
    }
    const next = await stopViewAsUser()
    setSession(next)
    const ok = await rehydratePlatformData()
    if (!ok) {
      const { setDataBackend, createApiSyncBackend } = await import(
        '@/lib/data'
      )
      setDataBackend(createApiSyncBackend({}))
      window.dispatchEvent(new Event('pd-data-rehydrated'))
    }
    return next
  }, [])

  const signOut = useCallback(async () => {
    await apiSignOut()
    setSession(null)
  }, [])

  const updateProfile = useCallback(
    async (input: { name?: string; email?: string }) => {
      const user = await apiUpdateOwnProfile(input)
      const current = readSession()
      if (current) setSession(current)
      return user
    },
    [],
  )

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
      updateProfile,
      signOut,
    }),
    [
      session,
      signInWithPassword,
      selectWorkspace,
      requestWorkspacePicker,
      startViewAs,
      stopViewAs,
      updateProfile,
      signOut,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
