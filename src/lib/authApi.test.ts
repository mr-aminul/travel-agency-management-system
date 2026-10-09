import { afterEach, describe, expect, it } from 'vitest'
import {
  COASTAL_OWNER_USER,
  DEMO_USER,
  PLATFORM_ADMIN_USER,
  SEED_AGENCY_PASSWORD,
  SEED_PLATFORM_ADMIN_PASSWORD,
  clearSession,
  getAccessToken,
  isSignedIn,
  isViewingAsSession,
  readSession,
  sessionActor,
  signInWithPassword,
  signOut,
  startViewAsUser,
  stopViewAsUser,
  writeSession,
} from '@/lib/authApi'
import { TENANT_IDS } from '@/types/tenant'

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

  it('signs in the platform admin with email and password', async () => {
    const session = await signInWithPassword(
      'aminulislamborhan@gmail.com',
      SEED_PLATFORM_ADMIN_PASSWORD,
    )
    expect(session.user).toEqual(PLATFORM_ADMIN_USER)
    expect(session.user.name).toBe('Aminul Islam Borhan')
    expect(session.user.role).toBe('platform_admin')
    expect(isSignedIn()).toBe(true)
  })

  it('signs in a seeded agency owner', async () => {
    const session = await signInWithPassword(
      'ops@coastalleisure.com',
      SEED_AGENCY_PASSWORD,
    )
    expect(session.tenantId).toBe(TENANT_IDS.leisure)
    expect(session.user.email).toBe('ops@coastalleisure.com')
    expect(session.user.role).toBe('agency_user')
  })

  it('rejects a wrong password', async () => {
    await expect(
      signInWithPassword('aminulislamborhan@gmail.com', 'wrong-password'),
    ).rejects.toThrow(/incorrect/)
  })

  it('rejects an unknown account', async () => {
    await expect(
      signInWithPassword('nobody@example.com', SEED_AGENCY_PASSWORD),
    ).rejects.toThrow(/not authorized/)
  })

  it('clears session on sign out', async () => {
    await signInWithPassword('ops@onetrack.bd', SEED_AGENCY_PASSWORD)
    await signOut()
    expect(isSignedIn()).toBe(false)
    expect(readSession()).toBeNull()
  })

  it('drops the legacy demo flag without auto-signing in', () => {
    sessionStorage.setItem('pd-demo-auth', '1')
    const session = readSession()
    expect(session).toBeNull()
    expect(sessionStorage.getItem('pd-demo-auth')).toBeNull()
  })

  it('round-trips writeSession', () => {
    writeSession({
      user: DEMO_USER,
      tenantId: 'tenant-full',
      signedInAt: '2026-01-01T00:00:00.000Z',
    })
    expect(readSession()?.signedInAt).toBe('2026-01-01T00:00:00.000Z')
    clearSession()
    expect(readSession()).toBeNull()
  })

  it('exposes accessToken via getAccessToken', () => {
    writeSession({
      user: DEMO_USER,
      tenantId: 'tenant-full',
      signedInAt: '2026-01-01T00:00:00.000Z',
      accessToken: 'tok',
    })
    expect(getAccessToken()).toBe('tok')
    clearSession()
    expect(getAccessToken()).toBeNull()
  })

  it('lets the platform admin view as an agency user and exit', async () => {
    await signInWithPassword(
      'aminulislamborhan@gmail.com',
      SEED_PLATFORM_ADMIN_PASSWORD,
    )
    const viewing = await startViewAsUser({
      userId: COASTAL_OWNER_USER.id,
      email: COASTAL_OWNER_USER.email,
      name: COASTAL_OWNER_USER.name,
      role: 'agency_user',
      tenantId: TENANT_IDS.leisure,
    })
    expect(isViewingAsSession(viewing)).toBe(true)
    expect(viewing.user.email).toBe(COASTAL_OWNER_USER.email)
    expect(viewing.user.role).toBe('agency_user')
    expect(viewing.tenantId).toBe(TENANT_IDS.leisure)
    expect(sessionActor(viewing)?.email).toBe(PLATFORM_ADMIN_USER.email)

    const restored = await stopViewAsUser()
    expect(isViewingAsSession(restored)).toBe(false)
    expect(restored.user.role).toBe('platform_admin')
    expect(restored.actor).toBeUndefined()
  })

  it('rejects View as user for non-admin sessions', async () => {
    await signInWithPassword('ops@coastalleisure.com', SEED_AGENCY_PASSWORD)
    await expect(
      startViewAsUser({
        userId: DEMO_USER.id,
        email: DEMO_USER.email,
        name: DEMO_USER.name,
        role: 'agency_user',
        tenantId: TENANT_IDS.full,
      }),
    ).rejects.toThrow(/platform admin/i)
  })
})
