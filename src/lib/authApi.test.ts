import { afterEach, describe, expect, it } from 'vitest'
import {
  DEMO_USER,
  clearSession,
  getAccessToken,
  isSignedIn,
  readSession,
  signInDemo,
  signInWithGoogle,
  signInWithPassword,
  signOut,
  writeSession,
} from '@/lib/authApi'
import { DEFAULT_TENANT_ID, TENANT_IDS } from '@/types/tenant'

const store = new Map<string, string>()

const memorySessionStorage = {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => {
    store.set(key, value)
  },
  removeItem: (key: string) => {
    store.delete(key)
  },
  clear: () => store.clear(),
  key: () => null,
  get length() {
    return store.size
  },
}

Object.defineProperty(globalThis, 'sessionStorage', {
  value: memorySessionStorage,
  configurable: true,
})

afterEach(() => {
  store.clear()
})

describe('authApi session', () => {
  it('starts signed out', () => {
    expect(isSignedIn()).toBe(false)
    expect(readSession()).toBeNull()
  })

  it('persists a Google demo session', async () => {
    const session = await signInWithGoogle()
    expect(session.user).toEqual(DEMO_USER)
    expect(session.tenantId).toBe(DEFAULT_TENANT_ID)
    expect(isSignedIn()).toBe(true)
    expect(readSession()?.user.email).toBe(DEMO_USER.email)
  })

  it('signs into a chosen demo agency', async () => {
    const session = await signInDemo('leisure')
    expect(session.tenantId).toBe(TENANT_IDS.leisure)
    expect(session.user.email).toBe('leisure@example.com')
  })

  it('signs the owner email in as platform admin when password matches email', async () => {
    const session = await signInWithPassword(
      'aminulislamborhan@gmail.com',
      'aminulislamborhan@gmail.com',
    )
    expect(session.user.role).toBe('platform_admin')
    expect(session.user.email).toBe('aminulislamborhan@gmail.com')
  })

  it('rejects a password that is not the email', async () => {
    await expect(
      signInWithPassword('aminulislamborhan@gmail.com', 'wrong'),
    ).rejects.toThrow(/incorrect/)
  })

  it('clears session on sign out', async () => {
    await signInWithGoogle()
    await signOut()
    expect(isSignedIn()).toBe(false)
    expect(readSession()).toBeNull()
  })

  it('migrates the legacy demo flag', () => {
    sessionStorage.setItem('pd-demo-auth', '1')
    const session = readSession()
    expect(session?.user).toEqual(DEMO_USER)
    expect(sessionStorage.getItem('pd-demo-auth')).toBeNull()
    expect(sessionStorage.getItem('pd-auth-session')).toBeTruthy()
  })

  it('round-trips writeSession', () => {
    writeSession({
      user: DEMO_USER,
      tenantId: DEFAULT_TENANT_ID,
      signedInAt: '2026-01-01T00:00:00.000Z',
    })
    expect(readSession()?.signedInAt).toBe('2026-01-01T00:00:00.000Z')
    clearSession()
    expect(readSession()).toBeNull()
  })

  it('exposes accessToken via getAccessToken', () => {
    writeSession({
      user: DEMO_USER,
      tenantId: DEFAULT_TENANT_ID,
      signedInAt: '2026-01-01T00:00:00.000Z',
      accessToken: 'tok',
    })
    expect(getAccessToken()).toBe('tok')
    clearSession()
    expect(getAccessToken()).toBeNull()
  })
})
