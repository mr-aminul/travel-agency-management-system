import { DATA_KEYS, loadJsonParsed, saveJson } from '@/lib/data'
import { getActiveTenantId } from '@/lib/authApi'
import { useSyncExternalStore } from 'react'
import type {
  PendingChangeAction,
  PendingChangeEntityType,
  PendingChangeStatus,
  SubAgentPendingChange,
} from '@/types/subAgentAccess'

const STORAGE_KEY = DATA_KEYS.subAgentPendingChanges
const listeners = new Set<() => void>()

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asStatus(value: unknown): PendingChangeStatus {
  if (value === 'approved' || value === 'rejected' || value === 'pending') {
    return value
  }
  return 'pending'
}

function normalizeChange(value: unknown): SubAgentPendingChange | undefined {
  if (!isRecord(value)) return undefined
  const id = typeof value.id === 'string' ? value.id.trim() : ''
  const tenantId = typeof value.tenantId === 'string' ? value.tenantId.trim() : ''
  const subAgentId =
    typeof value.subAgentId === 'string' ? value.subAgentId.trim() : ''
  const submittedByUserId =
    typeof value.submittedByUserId === 'string'
      ? value.submittedByUserId.trim()
      : ''
  const submittedByName =
    typeof value.submittedByName === 'string'
      ? value.submittedByName.trim()
      : 'Sub agent'
  const summary = typeof value.summary === 'string' ? value.summary.trim() : ''
  const createdAt =
    typeof value.createdAt === 'string' ? value.createdAt : ''
  const entityType = value.entityType as PendingChangeEntityType
  const action = value.action as PendingChangeAction
  if (
    !id ||
    !tenantId ||
    !subAgentId ||
    !submittedByUserId ||
    !summary ||
    !createdAt
  ) {
    return undefined
  }
  if (
    entityType !== 'client' &&
    entityType !== 'case' &&
    entityType !== 'document' &&
    entityType !== 'payment' &&
    entityType !== 'profile'
  ) {
    return undefined
  }
  if (action !== 'create' && action !== 'update' && action !== 'delete') {
    return undefined
  }
  return {
    id,
    tenantId,
    subAgentId,
    submittedByUserId,
    submittedByName,
    entityType,
    action,
    entityId:
      typeof value.entityId === 'string' ? value.entityId.trim() : undefined,
    summary,
    payload: value.payload,
    status: asStatus(value.status),
    createdAt,
    reviewedAt:
      typeof value.reviewedAt === 'string' ? value.reviewedAt : undefined,
    reviewedByUserId:
      typeof value.reviewedByUserId === 'string'
        ? value.reviewedByUserId
        : undefined,
    reviewedByName:
      typeof value.reviewedByName === 'string'
        ? value.reviewedByName
        : undefined,
    rejectReason:
      typeof value.rejectReason === 'string' ? value.rejectReason : undefined,
  }
}

function readAll(): SubAgentPendingChange[] {
  return loadJsonParsed(
    STORAGE_KEY,
    [] as SubAgentPendingChange[],
    (value) => {
      if (!Array.isArray(value)) return []
      return value
        .map(normalizeChange)
        .filter((row): row is SubAgentPendingChange => row != null)
    },
  )
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

export type SubmitPendingChangeInput = {
  tenantId?: string
  subAgentId: string
  submittedByUserId: string
  submittedByName: string
  entityType: PendingChangeEntityType
  action: PendingChangeAction
  entityId?: string
  summary: string
  payload: unknown
}

export function submitPendingChange(
  input: SubmitPendingChangeInput,
): SubAgentPendingChange {
  const created: SubAgentPendingChange = {
    id: `pch-${crypto.randomUUID()}`,
    tenantId: input.tenantId?.trim() || getActiveTenantId(),
    subAgentId: input.subAgentId,
    submittedByUserId: input.submittedByUserId,
    submittedByName: input.submittedByName,
    entityType: input.entityType,
    action: input.action,
    entityId: input.entityId,
    summary: input.summary,
    payload: input.payload,
    status: 'pending',
    createdAt: new Date().toISOString(),
  }
  cache = [created, ...cache]
  persist()
  return created
}

export function listPendingChanges(
  tenantId = getActiveTenantId(),
): SubAgentPendingChange[] {
  return cache.filter((row) => row.tenantId === tenantId)
}

export function listOpenPendingChanges(
  tenantId = getActiveTenantId(),
): SubAgentPendingChange[] {
  return listPendingChanges(tenantId).filter((row) => row.status === 'pending')
}

export function getPendingChangeById(
  id: string,
): SubAgentPendingChange | undefined {
  return cache.find((row) => row.id === id)
}

export function markPendingChange(
  id: string,
  patch: {
    status: 'approved' | 'rejected'
    reviewedByUserId: string
    reviewedByName: string
    rejectReason?: string
  },
): SubAgentPendingChange | undefined {
  const index = cache.findIndex((row) => row.id === id)
  if (index < 0) return undefined
  const current = cache[index]!
  if (current.status !== 'pending') return current
  const updated: SubAgentPendingChange = {
    ...current,
    status: patch.status,
    reviewedAt: new Date().toISOString(),
    reviewedByUserId: patch.reviewedByUserId,
    reviewedByName: patch.reviewedByName,
    rejectReason: patch.rejectReason,
  }
  cache = cache.map((row, i) => (i === index ? updated : row))
  persist()
  return updated
}

export function usePendingChanges(
  tenantId = getActiveTenantId(),
): SubAgentPendingChange[] {
  const all = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  return all.filter((row) => row.tenantId === tenantId)
}

export function useOpenPendingChangeCount(
  tenantId = getActiveTenantId(),
): number {
  return usePendingChanges(tenantId).filter((row) => row.status === 'pending')
    .length
}
