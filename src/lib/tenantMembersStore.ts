import { useSyncExternalStore } from 'react'
import { ABC_OWNER_USER } from '@/lib/authApi'
import { staffMemberCreateErrors } from '@/lib/agencyUserRules'
import {
  DATA_KEYS,
  injectClientSideSeeds,
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
    id: 'member-abc-owner',
    tenantId: TENANT_IDS.demo,
    name: ABC_OWNER_USER.name,
    email: ABC_OWNER_USER.email,
    role: 'owner',
    status: 'active',
  },
  {
    id: 'member-abc-manager',
    tenantId: TENANT_IDS.demo,
    name: 'Shila Akter',
    email: 'shila@abctravel.com',
    role: 'manager',
    status: 'active',
  },
  {
    id: 'member-abc-staff',
    tenantId: TENANT_IDS.demo,
    name: 'Tanvir Ahmed',
    email: 'tanvir@abctravel.com',
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
  if (!injectClientSideSeeds()) return created
  const createdIds = new Set(created.map((member) => member.id))
  return [
    ...created,
    ...seedMembers().filter((member) => !createdIds.has(member.id)),
  ]
}

function persistCreatedMembers() {
  saveJson(
    STORAGE_KEY,
    injectClientSideSeeds()
      ? members.filter((member) => !SEED_IDS.has(member.id))
      : members,
  )
}

const listeners = new Set<Listener>()
let members: TenantMember[] = mergeWithSeeds(readCreatedMembers())

function emit(persist = true) {
  if (persist) persistCreatedMembers()
  listeners.forEach((listener) => listener())
}

function reloadMembersFromStorage() {
  members = mergeWithSeeds(readCreatedMembers())
  emit(false)
}

if (typeof window !== 'undefined') {
  window.addEventListener('pd-data-rehydrated', reloadMembersFromStorage)
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
  const id =
    (input.id?.trim() || '').length > 0
      ? input.id!.trim()
      : `member-${Date.now().toString(36)}`

  // Upsert by id or email so a successful login create that lost its People
  // roster row can be restored without a false "already exists" error.
  const existingIndex = members.findIndex(
    (member) =>
      member.id === id ||
      (member.tenantId === input.tenantId &&
        member.email.toLowerCase() === email),
  )
  const resolvedId =
    (input.id?.trim() || '').length > 0
      ? input.id!.trim()
      : existingIndex >= 0
        ? members[existingIndex]!.id
        : id
  const created: TenantMember = {
    id: resolvedId,
    tenantId: input.tenantId,
    name: input.name.trim(),
    email,
    role: input.role ?? 'staff',
    // Password was set by admin. Member can sign in immediately.
    status: input.status ?? 'active',
  }
  if (existingIndex >= 0) {
    members = members.map((member, index) =>
      index === existingIndex ? { ...member, ...created } : member,
    )
  } else {
    members = [created, ...members]
  }
  emit()
  return existingIndex >= 0 ? members[existingIndex]! : created
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
  const nextEmail =
    patch.email !== undefined
      ? patch.email.trim().toLowerCase()
      : current.email
  if (!nextEmail) throw new Error('Email is required.')
  if (nextEmail !== current.email.toLowerCase()) {
    const duplicate = members.find(
      (member) =>
        member.id !== memberId &&
        member.tenantId === current.tenantId &&
        member.email.toLowerCase() === nextEmail,
    )
    if (duplicate) {
      throw new Error('A user with this email already exists in this agency.')
    }
  }
  const next: TenantMember = {
    ...current,
    name: patch.name !== undefined ? patch.name.trim() : current.name,
    email: nextEmail,
    role: patch.role ?? current.role,
    status: patch.status ?? current.status,
  }
  if (!next.name) throw new Error('Full name is required.')
  members = members.map((member, i) => (i === index ? next : member))
  emit()
  return next
}

export function removeTenantMember(memberId: string): boolean {
  const before = members.length
  members = members.filter((member) => member.id !== memberId)
  if (members.length === before) return false
  emit()
  return true
}

export function removeTenantMembers(memberIds: string[]): number {
  const idSet = new Set(memberIds.filter(Boolean))
  if (idSet.size === 0) return 0
  const before = members.length
  members = members.filter((member) => !idSet.has(member.id))
  const removed = before - members.length
  if (removed > 0) emit()
  return removed
}

export function resetTenantMembers() {
  removeJson(STORAGE_KEY)
  members = seedMembers()
  emit(false)
}
