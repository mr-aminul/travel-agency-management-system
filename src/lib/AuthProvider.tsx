import {
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  type AuthSession,
  type DemoAccountId,
  readSession,
  signInDemo as apiSignInDemo,
  signInWithGoogle as apiSignInWithGoogle,
  signInWithPassword as apiSignInWithPassword,
  signOut as apiSignOut,
} from '@/lib/authApi'
import { AuthContext, type AuthContextValue } from '@/lib/authContext'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() => readSession())

  const signInWithGoogle = useCallback(async () => {
    const next = await apiSignInWithGoogle()
    setSession(next)
  }, [])

  const signInDemo = useCallback(async (accountId: DemoAccountId) => {
    const next = await apiSignInDemo(accountId)
    setSession(next)
  }, [])

  const signInWithPassword = useCallback(
    async (email: string, password: string) => {
      const next = await apiSignInWithPassword(email, password)
      setSession(next)
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
      signInWithGoogle,
      signInWithPassword,
      signInDemo,
      signOut,
    }),
    [session, signInWithGoogle, signInWithPassword, signInDemo, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
