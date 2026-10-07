import { useSyncExternalStore } from 'react'
import {
  COASTAL_OWNER_USER,
  HORIZON_OWNER_USER,
  ONETRACK_OWNER_USER,
} from '@/lib/authApi'
import { staffMemberCreateErrors } from '@/lib/agencyUserRules'
import {
  DATA_KEYS,
  loadJsonParsed,
  removeJson,
  saveJson,
} from '@/lib/data'
import { getTenantById } from '@/lib/tenantsStore'
import {
  TENANT_IDS,
  type CreateTenantMemberInput,
  type TenantMember,
  type TenantMemberRole,
  type TenantMemberStatus,
  type UpdateTenantMemberInput,
} from '@/types/tenant'

type Listener = () => void

const SEED_MEMBERS: TenantMember[] = [
  {
    id: 'member-leisure-owner',
    tenantId: TENANT_IDS.leisure,
    name: COASTAL_OWNER_USER.name,
    email: COASTAL_OWNER_USER.email,
    role: 'owner',
    status: 'active',
  },
  {
    id: 'member-leisure-manager',
    tenantId: TENANT_IDS.leisure,
    name: 'Farzana Rahman',
    email: 'farzana@coastalleisure.com',
    role: 'manager',
    status: 'active',
  },
  {
    id: 'member-leisure-staff',
    tenantId: TENANT_IDS.leisure,
    name: 'Imran Chowdhury',
    email: 'imran@coastalleisure.com',
    role: 'staff',
    status: 'invited',
  },
  {
    id: 'member-manpower-owner',
    tenantId: TENANT_IDS.manpower,
    name: HORIZON_OWNER_USER.name,
    email: HORIZON_OWNER_USER.email,
    role: 'owner',
    status: 'active',
  },
  {
    id: 'member-manpower-manager',
    tenantId: TENANT_IDS.manpower,
    name: 'Nadia Sultana',
    email: 'nadia@horizonmanpower.com',
    role: 'manager',
    status: 'active',
  },
  {
    id: 'member-manpower-staff',
    tenantId: TENANT_IDS.manpower,
    name: 'Rafiq Hasan',
    email: 'rafiq@horizonmanpower.com',
    role: 'staff',
    status: 'disabled',
  },
  {
    id: 'member-full-owner',
    tenantId: TENANT_IDS.full,
    name: ONETRACK_OWNER_USER.name,
    email: ONETRACK_OWNER_USER.email,
    role: 'owner',
    status: 'active',
  },
  {
    id: 'member-full-manager',
    tenantId: TENANT_IDS.full,
    name: 'Shila Akter',
    email: 'shila@onetrack.bd',
    role: 'manager',
    status: 'active',
  },
  {
    id: 'member-full-staff',
    tenantId: TENANT_IDS.full,
    name: 'Tanvir Ahmed',
    email: 'tanvir@onetrack.bd',
    role: 'staff',
    status: 'active',
  },
]

const STORAGE_KEY = DATA_KEYS.tenantMembersCreated
const SEED_IDS = new Set(SEED_MEMBERS.map((member) => member.id))

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asRole(value: unknown): TenantMemberRole {
  if (value === 'owner' || value === 'manager' || value === 'staff') return value
  return 'staff'
}

function asStatus(value: unknown): TenantMemberStatus {
  if (value === 'active' || value === 'invited' || value === 'disabled') {
    return value
  }
  return 'invited'
}

function normalizeStoredMember(value: unknown): TenantMember | undefined {
  if (!isRecord(value)) return undefined
  const id = typeof value.id === 'string' ? value.id.trim() : ''
  const tenantId = typeof value.tenantId === 'string' ? value.tenantId.trim() : ''
  const name = typeof value.name === 'string' ? value.name.trim() : ''
  const email = typeof value.email === 'string' ? value.email.trim() : ''
  if (!id || !tenantId || !name || !email) return undefined
  return {
    id,
    tenantId,
    name,
    email,
    role: asRole(value.role),
    status: asStatus(value.status),
  }
}

function readCreatedMembers(): TenantMember[] {
  return loadJsonParsed(STORAGE_KEY, [] as TenantMember[], (value) => {
    if (!Array.isArray(value)) return []
    return value
      .map(normalizeStoredMember)
      .filter((member): member is TenantMember => member != null)
  })
}

function seedMembers(): TenantMember[] {
  return SEED_MEMBERS.map((member) => ({ ...member }))
}

function mergeWithSeeds(created: TenantMember[]): TenantMember[] {
  const createdIds = new Set(created.map((member) => member.id))
  return [
    ...created,
    ...seedMembers().filter((member) => !createdIds.has(member.id)),
  ]
}

function persistCreatedMembers() {
  saveJson(
    STORAGE_KEY,
    members.filter((member) => !SEED_IDS.has(member.id)),
  )
}

const listeners = new Set<Listener>()
let members: TenantMember[] = mergeWithSeeds(readCreatedMembers())

function emit(persist = true) {
  if (persist) persistCreatedMembers()
  listeners.forEach((listener) => listener())
}

function subscribe(listener: Listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot() {
  return members
}

export function useTenantMembers(): TenantMember[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

export function getTenantMembers(tenantId: string): TenantMember[] {
  return members.filter((member) => member.tenantId === tenantId)
}

export function useTenantMembersByTenantId(tenantId: string): TenantMember[] {
  return useTenantMembers().filter((member) => member.tenantId === tenantId)
}

export function memberCountByTenantId(tenantId: string): number {
  return members.filter((member) => member.tenantId === tenantId).length
}

export function createTenantMember(
  input: CreateTenantMemberInput,
): TenantMember {
  const errors = staffMemberCreateErrors(input)
  const firstError =
    errors.tenantId ??
    errors.name ??
    errors.email ??
    errors.role ??
    errors.password
  if (firstError) throw new Error(firstError)

  if (!getTenantById(input.tenantId)) {
    throw new Error('Agency not found.')
  }

  const email = input.email.trim().toLowerCase()
  const duplicate = members.find(
    (member) =>
      member.tenantId === input.tenantId &&
      member.email.toLowerCase() === email,
  )
  if (duplicate) {
    throw new Error('A user with this email already exists in this agency.')
  }

  const id =
    (input.id?.trim() || '').length > 0
      ? input.id!.trim()
      : `member-${Date.now().toString(36)}`
  if (members.some((member) => member.id === id)) {
    throw new Error('A user with this id already exists.')
  }

  const created: TenantMember = {
    id,
    tenantId: input.tenantId,
    name: input.name.trim(),
    email,
    role: input.role ?? 'staff',
    // Password was set by admin — member can sign in immediately.
    status: input.status ?? 'active',
  }
  members = [created, ...members]
  emit()
  return created
}

export function getTenantMemberById(id: string): TenantMember | undefined {
  return members.find((member) => member.id === id)
}

/** Resolve the member row for a signed-in user (id match, else email). */
export function findTenantMemberForUser(
  tenantId: string,
  userId: string,
  email: string,
): TenantMember | undefined {
  const byId = members.find(
    (member) => member.tenantId === tenantId && member.id === userId,
  )
  if (byId) return byId
  const normalized = email.trim().toLowerCase()
  return members.find(
    (member) =>
      member.tenantId === tenantId && member.email.toLowerCase() === normalized,
  )
}

export function updateTenantMember(
  memberId: string,
  patch: UpdateTenantMemberInput,
): TenantMember {
  const index = members.findIndex((member) => member.id === memberId)
  if (index < 0) throw new Error('User not found.')
  const current = members[index]!
  const next: TenantMember = {
    ...current,
    name: patch.name !== undefined ? patch.name.trim() : current.name,
    role: patch.role ?? current.role,
    status: patch.status ?? current.status,
  }
  if (!next.name) throw new Error('Full name is required.')
  members = members.map((member, i) => (i === index ? next : member))
  emit()
  return next
}

export function resetTenantMembers() {
  removeJson(STORAGE_KEY)
  members = seedMembers()
  emit(false)
}
