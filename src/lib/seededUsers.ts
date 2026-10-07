import { DEFAULT_TENANT_ID, TENANT_IDS, type UserRole } from '@/types/tenant'

export type SeededAuthUser = {
  id: string
  email: string
  name: string
  role: UserRole
}

export type SeededLoginAccount = {
  user: SeededAuthUser
  tenantId: string
  /** PBKDF2 hash for local/dev login when the platform API is unavailable. */
  passwordHash: string
}

export const PLATFORM_ADMIN_EMAIL = 'aminulislamborhan@gmail.com'

export const PLATFORM_ADMIN_USER: SeededAuthUser = {
  id: 'user-platform-admin',
  email: PLATFORM_ADMIN_EMAIL,
  name: 'Aminul Islam Borhan',
  role: 'platform_admin',
}

export const COASTAL_OWNER_USER: SeededAuthUser = {
  id: 'user-coastal-owner',
  email: 'ops@coastalleisure.com',
  name: 'Coastal Leisure',
  role: 'agency_user',
}

export const HORIZON_OWNER_USER: SeededAuthUser = {
  id: 'user-horizon-owner',
  email: 'ops@horizonmanpower.com',
  name: 'Horizon Manpower',
  role: 'agency_user',
}

export const ONETRACK_OWNER_USER: SeededAuthUser = {
  id: 'user-onetrack-owner',
  email: 'ops@onetrack.bd',
  name: 'OneTrack Agency',
  role: 'agency_user',
}

/**
 * Default seed passwords (local + server bootstrap).
 * Production should override via PLATFORM_ADMIN_PASSWORD / SEED_AGENCY_PASSWORD.
 */
export const SEED_PLATFORM_ADMIN_PASSWORD = '12345'
export const SEED_AGENCY_PASSWORD = '12345'

/**
 * Hashes for the default seed passwords above (pbkdf2$120000$…).
 * Must stay in sync with server seed defaults in server/src/auth.js.
 */
const PLATFORM_ADMIN_PASSWORD_HASH =
  'pbkdf2$120000$f14724a26c376c6c6f8cfceeb16817f7$184182a94da299befa6b0a47f40fcc4485702b175d9c223431c4ae0d06026f33'
const AGENCY_PASSWORD_HASH =
  'pbkdf2$120000$711fb23016c555a5e0889c9a1b365a14$c3762d0206013e7401ef04c5aafba7dfec4cdef0985ea2dab399bee3ba5e2bec'

export const SEEDED_LOGIN_ACCOUNTS: SeededLoginAccount[] = [
  {
    user: PLATFORM_ADMIN_USER,
    tenantId: DEFAULT_TENANT_ID,
    passwordHash: PLATFORM_ADMIN_PASSWORD_HASH,
  },
  {
    user: COASTAL_OWNER_USER,
    tenantId: TENANT_IDS.leisure,
    passwordHash: AGENCY_PASSWORD_HASH,
  },
  {
    user: HORIZON_OWNER_USER,
    tenantId: TENANT_IDS.manpower,
    passwordHash: AGENCY_PASSWORD_HASH,
  },
  {
    user: ONETRACK_OWNER_USER,
    tenantId: TENANT_IDS.full,
    passwordHash: AGENCY_PASSWORD_HASH,
  },
]

export function findSeededAccountByEmail(
  email: string,
): SeededLoginAccount | undefined {
  const normalized = email.trim().toLowerCase()
  return SEEDED_LOGIN_ACCOUNTS.find(
    (account) => account.user.email.toLowerCase() === normalized,
  )
}

export function asUserRole(value: unknown): UserRole {
  return value === 'platform_admin' ? 'platform_admin' : 'agency_user'
}
