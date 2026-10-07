import {
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  type AuthSession,
  readSession,
  signInWithPassword as apiSignInWithPassword,
  signOut as apiSignOut,
} from '@/lib/authApi'
import { AuthContext, type AuthContextValue } from '@/lib/authContext'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() => readSession())

  const signInWithPassword = useCallback(
    async (email: string, password: string) => {
      const next = await apiSignInWithPassword(email, password)
      setSession(next)
      return next
    },
    [],
  )

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
      signOut,
    }),
    [session, signInWithPassword, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
