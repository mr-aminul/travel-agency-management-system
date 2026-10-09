import { DATA_KEYS, loadJsonParsed, saveJson } from '@/lib/data'
import { getActiveTenantId } from '@/lib/authApi'
import { useSyncExternalStore } from 'react'
import type { SubAgentLoginLink } from '@/types/subAgentAccess'

const STORAGE_KEY = DATA_KEYS.subAgentLogins
const listeners = new Set<() => void>()

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asStatus(
  value: unknown,
): SubAgentLoginLink['status'] {
  if (value === 'active' || value === 'invited' || value === 'disabled') {
    return value
  }
  return 'invited'
}

function normalizeLink(value: unknown): SubAgentLoginLink | undefined {
  if (!isRecord(value)) return undefined
  const subAgentId =
    typeof value.subAgentId === 'string' ? value.subAgentId.trim() : ''
  const tenantId = typeof value.tenantId === 'string' ? value.tenantId.trim() : ''
  const userId = typeof value.userId === 'string' ? value.userId.trim() : ''
  const email = typeof value.email === 'string' ? value.email.trim().toLowerCase() : ''
  if (!subAgentId || !tenantId || !userId || !email) return undefined
  return {
    subAgentId,
    tenantId,
    userId,
    email,
    status: asStatus(value.status),
    invitedAt: typeof value.invitedAt === 'string' ? value.invitedAt : undefined,
    activatedAt:
      typeof value.activatedAt === 'string' ? value.activatedAt : undefined,
  }
}

function readAll(): SubAgentLoginLink[] {
  return loadJsonParsed(STORAGE_KEY, [] as SubAgentLoginLink[], (value) => {
    if (!Array.isArray(value)) return []
    return value
      .map(normalizeLink)
      .filter((row): row is SubAgentLoginLink => row != null)
  })
}

let cache = readAll()

function persist() {
  saveJson(STORAGE_KEY, cache)
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return cache
}

export function getSubAgentLogin(
  subAgentId: string,
  tenantId = getActiveTenantId(),
): SubAgentLoginLink | undefined {
  return cache.find(
    (row) => row.subAgentId === subAgentId && row.tenantId === tenantId,
  )
}

export function findLoginByUserId(
  userId: string,
): SubAgentLoginLink | undefined {
  return cache.find((row) => row.userId === userId)
}

export function findLoginByEmail(
  email: string,
  tenantId = getActiveTenantId(),
): SubAgentLoginLink | undefined {
  const normalized = email.trim().toLowerCase()
  return cache.find(
    (row) => row.email === normalized && row.tenantId === tenantId,
  )
}

export function listSubAgentLoginsForEmail(email: string): SubAgentLoginLink[] {
  const normalized = email.trim().toLowerCase()
  return cache.filter((row) => row.email === normalized)
}

export function upsertSubAgentLogin(
  link: SubAgentLoginLink,
): SubAgentLoginLink {
  const index = cache.findIndex(
    (row) =>
      row.subAgentId === link.subAgentId && row.tenantId === link.tenantId,
  )
  if (index < 0) {
    cache = [link, ...cache]
  } else {
    cache = cache.map((row, i) => (i === index ? link : row))
  }
  persist()
  return link
}

export function setSubAgentLoginStatus(
  subAgentId: string,
  status: SubAgentLoginLink['status'],
  tenantId = getActiveTenantId(),
): SubAgentLoginLink | undefined {
  const current = getSubAgentLogin(subAgentId, tenantId)
  if (!current) return undefined
  return upsertSubAgentLogin({ ...current, status })
}

export function useSubAgentLogin(
  subAgentId: string,
  tenantId = getActiveTenantId(),
): SubAgentLoginLink | undefined {
  const all = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  return all.find(
    (row) => row.subAgentId === subAgentId && row.tenantId === tenantId,
  )
}
