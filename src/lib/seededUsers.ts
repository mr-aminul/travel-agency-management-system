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
export const SEED_PLATFORM_ADMIN_PASSWORD = 'Borhan!OneTrack2026'
export const SEED_AGENCY_PASSWORD = 'Agency!OneTrack2026'

/**
 * Hashes for the default seed passwords above (pbkdf2$120000$…).
 * Must stay in sync with server seed defaults in server/src/auth.js.
 */
const PLATFORM_ADMIN_PASSWORD_HASH =
  'pbkdf2$120000$751d67b262a70cf7c95af5049834a24b$940cdaceb6dcabf3be7d13e32f8d11b9fad39ee0f364f478beede2e3193cccb5'
const AGENCY_PASSWORD_HASH =
  'pbkdf2$120000$ecbd4e8c93387ba6bd3b99dd6358b87a$a5823e26f062e2b40538d7d1b5fe6faa39c3bd415a53eca225f9062562044775'

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
