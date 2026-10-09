import { DATA_KEYS, loadJsonParsed, saveJson } from '@/lib/data'
import { getActiveTenantId } from '@/lib/authApi'
import { useSyncExternalStore } from 'react'
import type { SubAgentAccessSettings } from '@/types/subAgentAccess'

const STORAGE_KEY = DATA_KEYS.subAgentAccessSettings
const listeners = new Set<() => void>()

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeSettings(value: unknown): SubAgentAccessSettings | undefined {
  if (!isRecord(value)) return undefined
  const tenantId = typeof value.tenantId === 'string' ? value.tenantId.trim() : ''
  if (!tenantId) return undefined
  const approverMemberIds = Array.isArray(value.approverMemberIds)
    ? value.approverMemberIds.filter(
        (id): id is string => typeof id === 'string' && id.trim().length > 0,
      )
    : []
  return {
    tenantId,
    requireApproval: value.requireApproval !== false,
    approverMemberIds,
  }
}

function readAll(): SubAgentAccessSettings[] {
  return loadJsonParsed(STORAGE_KEY, [] as SubAgentAccessSettings[], (value) => {
    if (!Array.isArray(value)) return []
    return value
      .map(normalizeSettings)
      .filter((row): row is SubAgentAccessSettings => row != null)
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

export function defaultSubAgentAccessSettings(
  tenantId: string,
): SubAgentAccessSettings {
  return {
    tenantId,
    requireApproval: true,
    approverMemberIds: [],
  }
}

export function readSubAgentAccessSettings(
  tenantId = getActiveTenantId(),
): SubAgentAccessSettings {
  return (
    cache.find((row) => row.tenantId === tenantId) ??
    defaultSubAgentAccessSettings(tenantId)
  )
}

export function saveSubAgentAccessSettings(
  next: SubAgentAccessSettings,
): SubAgentAccessSettings {
  const cleaned: SubAgentAccessSettings = {
    tenantId: next.tenantId,
    requireApproval: Boolean(next.requireApproval),
    approverMemberIds: [...new Set(next.approverMemberIds.filter(Boolean))],
  }
  const index = cache.findIndex((row) => row.tenantId === cleaned.tenantId)
  if (index < 0) {
    cache = [cleaned, ...cache]
  } else {
    cache = cache.map((row, i) => (i === index ? cleaned : row))
  }
  persist()
  return cleaned
}

export function useSubAgentAccessSettings(
  tenantId = getActiveTenantId(),
): SubAgentAccessSettings {
  const all = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  return (
    all.find((row) => row.tenantId === tenantId) ??
    defaultSubAgentAccessSettings(tenantId)
  )
}
