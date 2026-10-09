import { DATA_KEYS, loadJsonParsed, saveJson } from '@/lib/data'
import { saveProvisionedLogin } from '@/lib/provisionedUsers'
import { upsertSubAgentLogin } from '@/lib/subAgentLoginsStore'
import type { UserRole } from '@/types/tenant'
import type { InviteCreateResult } from '@/lib/authApi'

type LocalInvite = {
  id: string
  token: string
  tenantId: string
  email: string
  name: string
  memberRole: string
  role: UserRole
  subAgentId?: string
  expiresAt: string
  acceptedAt?: string
  createdAt: string
}

const STORAGE_KEY = DATA_KEYS.localInvites
const INVITE_TTL_MS = 1000 * 60 * 60 * 24 * 7

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeInvite(value: unknown): LocalInvite | undefined {
  if (!isRecord(value)) return undefined
  const id = typeof value.id === 'string' ? value.id : ''
  const token = typeof value.token === 'string' ? value.token : ''
  const tenantId = typeof value.tenantId === 'string' ? value.tenantId : ''
  const email = typeof value.email === 'string' ? value.email.toLowerCase() : ''
  const name = typeof value.name === 'string' ? value.name : ''
  const expiresAt = typeof value.expiresAt === 'string' ? value.expiresAt : ''
  const createdAt = typeof value.createdAt === 'string' ? value.createdAt : ''
  if (!id || !token || !tenantId || !email || !name || !expiresAt || !createdAt) {
    return undefined
  }
  return {
    id,
    token,
    tenantId,
    email,
    name,
    memberRole:
      typeof value.memberRole === 'string' ? value.memberRole : 'staff',
    role: value.role === 'sub_agent' ? 'sub_agent' : 'agency_user',
    subAgentId:
      typeof value.subAgentId === 'string' ? value.subAgentId : undefined,
    expiresAt,
    acceptedAt:
      typeof value.acceptedAt === 'string' ? value.acceptedAt : undefined,
    createdAt,
  }
}

function readAll(): LocalInvite[] {
  return loadJsonParsed(STORAGE_KEY, [] as LocalInvite[], (value) => {
    if (!Array.isArray(value)) return []
    return value
      .map(normalizeInvite)
      .filter((row): row is LocalInvite => row != null)
  })
}

let cache = readAll()

function persist() {
  saveJson(STORAGE_KEY, cache)
}

export function createLocalInvite(input: {
  email: string
  name: string
  memberRole: string
  tenantId: string
  subAgentId?: string
  role?: UserRole
}): InviteCreateResult {
  const email = input.email.trim().toLowerCase()
  const name = input.name.trim()
  const tenantId = input.tenantId.trim()
  const role: UserRole =
    input.role ?? (input.subAgentId ? 'sub_agent' : 'agency_user')
  const id = `inv-${crypto.randomUUID()}`
  const token = crypto.randomUUID().replace(/-/g, '')
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS).toISOString()
  const created: LocalInvite = {
    id,
    token,
    tenantId,
    email,
    name,
    memberRole: input.memberRole || 'staff',
    role,
    subAgentId: input.subAgentId,
    expiresAt,
    createdAt: new Date().toISOString(),
  }
  cache = [
    created,
    ...cache.filter(
      (row) =>
        !(
          row.tenantId === tenantId &&
          row.email === email &&
          !row.acceptedAt
        ),
    ),
  ]
  persist()
  return {
    id,
    token,
    email,
    name,
    memberRole: created.memberRole,
    tenantId,
    expiresAt,
    subAgentId: created.subAgentId,
    role,
  }
}

export function getLocalInviteView(token: string) {
  const row = cache.find((invite) => invite.token === token)
  if (!row) return null
  if (row.acceptedAt) {
    throw new Error('This invite was already used.')
  }
  if (new Date(row.expiresAt).getTime() <= Date.now()) {
    throw new Error('This invite has expired.')
  }
  return {
    email: row.email,
    name: row.name,
    memberRole: row.memberRole,
    tenantId: row.tenantId,
    agencyName: 'Your agency',
    expiresAt: row.expiresAt,
    subAgentId: row.subAgentId,
    role: row.role,
  }
}

export async function acceptLocalInvite(token: string, password: string) {
  const row = cache.find((invite) => invite.token === token)
  if (!row) throw new Error('Invite not found.')
  if (row.acceptedAt) throw new Error('This invite was already used.')
  if (new Date(row.expiresAt).getTime() <= Date.now()) {
    throw new Error('This invite has expired.')
  }
  if (!password || password.length < 8) {
    throw new Error('Password must be at least 8 characters.')
  }

  const userId = `user-${crypto.randomUUID()}`
  await saveProvisionedLogin({
    id: userId,
    email: row.email,
    name: row.name,
    tenantId: row.tenantId,
    password,
    role: row.role,
    subAgentId: row.subAgentId,
  })

  if (row.role === 'sub_agent' && row.subAgentId) {
    upsertSubAgentLogin({
      subAgentId: row.subAgentId,
      tenantId: row.tenantId,
      userId,
      email: row.email,
      status: 'active',
      invitedAt: row.createdAt,
      activatedAt: new Date().toISOString(),
    })
  }

  cache = cache.map((invite) =>
    invite.token === token
      ? { ...invite, acceptedAt: new Date().toISOString() }
      : invite,
  )
  persist()

  return {
    userId,
    email: row.email,
    name: row.name,
    tenantId: row.tenantId,
    memberRole: row.memberRole,
    subAgentId: row.subAgentId,
    role: row.role,
  }
}
