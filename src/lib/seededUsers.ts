import { DEFAULT_TENANT_ID, type UserRole } from '@/types/tenant'

export type SeededAuthUser = {
  id: string
  email: string
  name: string
  role: UserRole
  /** Set when role is sub_agent. CRM record this login belongs to. */
  subAgentId?: string
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

/** Demo agency owner — fully furnished ABC Travel Agency workspace. */
export const ABC_OWNER_USER: SeededAuthUser = {
  id: 'user-abc-owner',
  email: 'demo@abctravel.com',
  name: 'ABC Travel Agency',
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
    user: ABC_OWNER_USER,
    tenantId: DEFAULT_TENANT_ID,
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
  if (value === 'platform_admin') return 'platform_admin'
  if (value === 'sub_agent') return 'sub_agent'
  return 'agency_user'
}
