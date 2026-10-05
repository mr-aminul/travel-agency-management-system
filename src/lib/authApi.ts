import { DEFAULT_TENANT_ID, type UserRole } from '@/types/tenant'

export type AuthUser = {
  id: string
  email: string
  name: string
  role: UserRole
}

export type DemoAccountId = 'full' | 'leisure' | 'manpower' | 'admin'

export const DEMO_USER: AuthUser = {
  id: 'demo',
  email: 'demo@example.com',
  name: 'Demo User',
  role: 'agency_user',
}

export const LEISURE_USER: AuthUser = {
  id: 'demo-leisure',
  email: 'leisure@example.com',
  name: 'Coastal Leisure',
  role: 'agency_user',
}

export const MANPOWER_USER: AuthUser = {
  id: 'demo-manpower',
  email: 'manpower@example.com',
  name: 'Horizon Manpower',
  role: 'agency_user',
}

export const PLATFORM_ADMIN_EMAIL = 'aminulislamborhan@gmail.com'

export const PLATFORM_ADMIN_USER: AuthUser = {
  id: 'demo-admin',
  email: PLATFORM_ADMIN_EMAIL,
  name: 'Aminul',
  role: 'platform_admin',
}

export const DEMO_ACCOUNTS: {
  id: DemoAccountId
  user: AuthUser
  tenantId: string
  label: string
  description: string
}[] = [
  {
    id: 'leisure',
    user: LEISURE_USER,
    tenantId: 'tenant-leisure',
    label: 'Coastal Leisure',
    description: 'Tours, tickets, hotels, and payments',
  },
  {
    id: 'manpower',
    user: MANPOWER_USER,
    tenantId: 'tenant-manpower',
    label: 'Horizon Manpower',
    description: 'Work permits, payments, and HR',
  },
  {
    id: 'full',
    user: DEMO_USER,
    tenantId: DEFAULT_TENANT_ID,
    label: 'OneTrack Demo',
    description: 'Every module enabled',
  },
  {
    id: 'admin',
    user: PLATFORM_ADMIN_USER,
    tenantId: DEFAULT_TENANT_ID,
    label: 'Platform admin',
    description: 'Manage tenants only',
  },
]

const AUTH_SESSION_KEY = 'pd-auth-session'
const LEGACY_AUTH_KEY = 'pd-demo-auth'

export type AuthSession = {
  user: AuthUser
  tenantId: string
  /** ISO timestamp when the session was established. */
  signedInAt: string
  /**
   * Bearer token for API calls when the IdP returns one.
   * Prefer HttpOnly cookies in production; this field is for SPA token flows.
   */
  accessToken?: string
}

function readRawSession(): string | null {
  try {
    return sessionStorage.getItem(AUTH_SESSION_KEY)
  } catch {
    return null
  }
}

export function writeSession(session: AuthSession): void {
  sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session))
}

export function clearSession(): void {
  sessionStorage.removeItem(AUTH_SESSION_KEY)
}

function asUserRole(value: unknown): UserRole {
  return value === 'platform_admin' ? 'platform_admin' : 'agency_user'
}

function coerceUser(value: unknown): AuthUser | null {
  if (!value || typeof value !== 'object') return null
  const parsed = value as Record<string, unknown>
  if (
    typeof parsed.id !== 'string' ||
    typeof parsed.email !== 'string' ||
    typeof parsed.name !== 'string'
  ) {
    return null
  }
  return {
    id: parsed.id,
    email: parsed.email,
    name: parsed.name,
    role: asUserRole(parsed.role),
  }
}

function coerceSession(value: unknown): AuthSession | null {
  if (!value || typeof value !== 'object') return null
  const parsed = value as Record<string, unknown>
  const user = coerceUser(parsed.user)
  if (!user || typeof parsed.signedInAt !== 'string') return null
  const tenantId =
    typeof parsed.tenantId === 'string' && parsed.tenantId
      ? parsed.tenantId
      : DEFAULT_TENANT_ID
  const accessToken =
    parsed.accessToken === undefined || typeof parsed.accessToken === 'string'
      ? parsed.accessToken
      : undefined
  return { user, tenantId, signedInAt: parsed.signedInAt, accessToken }
}

function migrateLegacySession(): AuthSession | null {
  try {
    if (sessionStorage.getItem(LEGACY_AUTH_KEY) !== '1') return null
    const session: AuthSession = {
      user: DEMO_USER,
      tenantId: DEFAULT_TENANT_ID,
      signedInAt: new Date().toISOString(),
    }
    writeSession(session)
    sessionStorage.removeItem(LEGACY_AUTH_KEY)
    return session
  } catch {
    return null
  }
}

function demoSession(accountId: DemoAccountId): AuthSession {
  const account = DEMO_ACCOUNTS.find((item) => item.id === accountId)
  const resolved = account ?? DEMO_ACCOUNTS.find((item) => item.id === 'full')!
  return {
    user: resolved.user,
    tenantId: resolved.tenantId,
    signedInAt: new Date().toISOString(),
  }
}

export function readSession(): AuthSession | null {
  const raw = readRawSession()
  if (!raw) return migrateLegacySession()
  try {
    const parsed = JSON.parse(raw) as unknown
    const session = coerceSession(parsed)
    if (session) {
      if (
        session.tenantId !== (parsed as { tenantId?: string }).tenantId ||
        session.user.role !== (parsed as { user?: { role?: string } }).user?.role
      ) {
        writeSession(session)
      }
      return session
    }
  } catch {
    /* migrate legacy flag stored under the new key */
  }
  if (raw === '1') {
    const session = demoSession('full')
    writeSession(session)
    return session
  }
  return migrateLegacySession()
}

export function getAccessToken(): string | null {
  return readSession()?.accessToken ?? null
}

export function getActiveTenantId(): string {
  return readSession()?.tenantId ?? DEFAULT_TENANT_ID
}

export function isSignedIn(): boolean {
  return readSession() !== null
}

/**
 * Demo Google sign-in. Replace the body with a real OAuth redirect / token
 * exchange when wiring a production identity provider. Persist `accessToken`
 * on the returned session so `apiFetch` can attach Authorization.
 */
export async function signInWithGoogle(): Promise<AuthSession> {
  return signInDemo('full')
}

export async function signInDemo(accountId: DemoAccountId): Promise<AuthSession> {
  await Promise.resolve()
  const session = demoSession(accountId)
  writeSession(session)
  return session
}

function normalizeLoginEmail(value: string): string {
  return value.trim().toLowerCase()
}

function isPlatformAdminEmail(email: string): boolean {
  return (
    email === PLATFORM_ADMIN_EMAIL || email === 'admin@example.com'
  )
}

/**
 * Demo password login: password must match the email.
 * `aminulislamborhan@gmail.com` is the platform admin.
 */
export async function signInWithPassword(
  email: string,
  password: string,
): Promise<AuthSession> {
  await Promise.resolve()
  const normalizedEmail = normalizeLoginEmail(email)
  const normalizedPassword = password.trim().toLowerCase()

  if (!normalizedEmail) {
    throw new Error('Enter your email.')
  }
  if (!normalizedPassword) {
    throw new Error('Enter your password.')
  }
  if (normalizedPassword !== normalizedEmail) {
    throw new Error('Email or password is incorrect.')
  }

  if (isPlatformAdminEmail(normalizedEmail)) {
    const session: AuthSession = {
      user: PLATFORM_ADMIN_USER,
      tenantId: DEFAULT_TENANT_ID,
      signedInAt: new Date().toISOString(),
    }
    writeSession(session)
    return session
  }

  const account = DEMO_ACCOUNTS.find(
    (item) => item.user.email.toLowerCase() === normalizedEmail,
  )
  if (!account) {
    throw new Error('This account is not authorized.')
  }

  const session = demoSession(account.id)
  writeSession(session)
  return session
}

export async function signOut(): Promise<void> {
  await Promise.resolve()
  clearSession()
}
