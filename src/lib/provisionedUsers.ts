import { DATA_KEYS } from '@/lib/data/keys'
import {
  loadJsonParsed,
  removeJson,
  saveJson,
} from '@/lib/data/jsonStore'
import { hashPasswordForTests, verifyPasswordHash } from '@/lib/passwordHash'
import {
  asUserRole,
  findSeededAccountByEmail,
  type SeededAuthUser,
} from '@/lib/seededUsers'
import type { UserRole } from '@/types/tenant'

export type ProvisionedLoginAccount = {
  user: SeededAuthUser
  tenantId: string
  passwordHash: string
}

type Listener = () => void

const STORAGE_KEY = DATA_KEYS.provisionedLogins
const listeners = new Set<Listener>()

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeAccount(value: unknown): ProvisionedLoginAccount | undefined {
  if (!isRecord(value) || !isRecord(value.user)) return undefined
  const id = typeof value.user.id === 'string' ? value.user.id.trim() : ''
  const email = typeof value.user.email === 'string' ? value.user.email.trim() : ''
  const name = typeof value.user.name === 'string' ? value.user.name.trim() : ''
  const tenantId = typeof value.tenantId === 'string' ? value.tenantId.trim() : ''
  const passwordHash =
    typeof value.passwordHash === 'string' ? value.passwordHash.trim() : ''
  if (!id || !email || !name || !tenantId || !passwordHash) return undefined
  return {
    user: {
      id,
      email: email.toLowerCase(),
      name,
      role: asUserRole(value.user.role) as UserRole,
    },
    tenantId,
    passwordHash,
  }
}

function readAccounts(): ProvisionedLoginAccount[] {
  return loadJsonParsed(STORAGE_KEY, [] as ProvisionedLoginAccount[], (value) => {
    if (!Array.isArray(value)) return []
    return value
      .map(normalizeAccount)
      .filter((account): account is ProvisionedLoginAccount => account != null)
  })
}

let accounts = readAccounts()

function persist() {
  saveJson(STORAGE_KEY, accounts)
  listeners.forEach((listener) => listener())
}

export function findProvisionedAccountByEmail(
  email: string,
): ProvisionedLoginAccount | undefined {
  const normalized = email.trim().toLowerCase()
  return accounts.find(
    (account) => account.user.email.toLowerCase() === normalized,
  )
}

export async function saveProvisionedLogin(input: {
  id: string
  email: string
  name: string
  tenantId: string
  password: string
  role?: UserRole
}): Promise<ProvisionedLoginAccount> {
  const email = input.email.trim().toLowerCase()
  if (findSeededAccountByEmail(email) || findProvisionedAccountByEmail(email)) {
    throw new Error('An account with this email already exists.')
  }

  const passwordHash = await hashPasswordForTests(input.password)
  const created: ProvisionedLoginAccount = {
    user: {
      id: input.id,
      email,
      name: input.name.trim(),
      role: input.role ?? 'agency_user',
    },
    tenantId: input.tenantId,
    passwordHash,
  }
  accounts = [created, ...accounts]
  persist()
  return created
}

export async function verifyProvisionedLogin(
  email: string,
  password: string,
): Promise<ProvisionedLoginAccount | null> {
  const account = findProvisionedAccountByEmail(email)
  if (!account) return null
  const valid = await verifyPasswordHash(password, account.passwordHash)
  return valid ? account : null
}

export async function updateProvisionedPassword(
  userId: string,
  password: string,
  email?: string,
): Promise<void> {
  let index = accounts.findIndex((account) => account.user.id === userId)
  if (index < 0 && email) {
    const normalized = email.trim().toLowerCase()
    index = accounts.findIndex(
      (account) => account.user.email.toLowerCase() === normalized,
    )
  }
  if (index < 0) {
    throw new Error('Local login not found for this user.')
  }
  const passwordHash = await hashPasswordForTests(password)
  const current = accounts[index]!
  accounts = accounts.map((account, i) =>
    i === index ? { ...current, passwordHash } : account,
  )
  persist()
}

export function resetProvisionedLogins() {
  removeJson(STORAGE_KEY)
  accounts = []
  listeners.forEach((listener) => listener())
}
