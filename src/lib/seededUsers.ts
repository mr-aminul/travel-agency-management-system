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
export const SEED_PLATFORM_ADMIN_PASSWORD = '12345678'
export const SEED_AGENCY_PASSWORD = '12345678'

/**
 * Hashes for the default seed passwords above (pbkdf2$120000$…).
 * Must stay in sync with server seed defaults in server/src/auth.js.
 */
const PLATFORM_ADMIN_PASSWORD_HASH =
  'pbkdf2$120000$9267bb7eb285516ca2b64d561666d1c0$3b17627896f5d55c1ff5a9d11d88703ac179d680d2066767418d2619d4786ae0'
const AGENCY_PASSWORD_HASH =
  'pbkdf2$120000$a38a2b9cb713911327e4500eeac79bc5$f5c91ed8bc09898dc0c4df8c0cc02dbb60b6f0c1c135d5828be7e67f0301cf4c'

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
