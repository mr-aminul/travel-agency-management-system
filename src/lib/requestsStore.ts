import { useMemo } from 'react'
import { useSyncExternalStore } from 'react'
import { updateCase } from '@/lib/casesStore'
import { getActiveTenantId } from '@/lib/authApi'
import { DATA_KEYS, loadJsonParsed, saveJson } from '@/lib/data'
import { logAuditEvent } from '@/lib/auditClient'
import { useAuth } from '@/lib/useAuth'
import { DEFAULT_TENANT_ID } from '@/types/tenant'
import type { RequestReviewStatus, StatusUpdateRequest } from '@/types/request'

type Listener = () => void

const STORAGE_KEY = DATA_KEYS.requestsCreated
const listeners = new Set<Listener>()

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeRequest(value: unknown): StatusUpdateRequest | undefined {
  if (!isRecord(value)) return undefined
  const id = typeof value.id === 'string' ? value.id.trim() : ''
  const tenantId =
    typeof value.tenantId === 'string' ? value.tenantId.trim() : ''
  const caseId = typeof value.caseId === 'string' ? value.caseId.trim() : ''
  if (!id || !tenantId || !caseId) return undefined
  return value as StatusUpdateRequest
}

function readAll(): StatusUpdateRequest[] {
  return loadJsonParsed(STORAGE_KEY, [] as StatusUpdateRequest[], (value) => {
    if (!Array.isArray(value)) return []
    return value
      .map(normalizeRequest)
      .filter((item): item is StatusUpdateRequest => item != null)
  })
}

let requests: StatusUpdateRequest[] = readAll()

function persist() {
  saveJson(STORAGE_KEY, requests)
}

function emit() {
  listeners.forEach((listener) => listener())
}

function subscribe(listener: Listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot() {
  return requests
}

function tenantId() {
  return getActiveTenantId() || DEFAULT_TENANT_ID
}

function reloadFromStorage() {
  requests = readAll()
  emit()
}

if (typeof window !== 'undefined') {
  window.addEventListener('pd-data-rehydrated', reloadFromStorage)
}

export function useRequests(): StatusUpdateRequest[] {
  const { session } = useAuth()
  const all = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const activeId = session?.tenantId ?? DEFAULT_TENANT_ID
  return useMemo(
    () => all.filter((item) => item.tenantId === activeId),
    [all, activeId],
  )
}

export function submitStatusRequest(
  input: Omit<
    StatusUpdateRequest,
    'id' | 'tenantId' | 'requestedAt' | 'reviewStatus'
  >,
): StatusUpdateRequest {
  const created: StatusUpdateRequest = {
    ...input,
    id: `req-${crypto.randomUUID().slice(0, 8)}`,
    tenantId: tenantId(),
    requestedAt: new Date().toISOString(),
    reviewStatus: 'Pending',
  }
  requests = [created, ...requests]
  persist()
  emit()
  return created
}

export function reviewStatusRequest(
  id: string,
  reviewStatus: Exclude<RequestReviewStatus, 'Pending'>,
  reviewedBy: string,
  reviewRemarks?: string,
): void {
  const request = requests.find(
    (item) => item.id === id && item.tenantId === tenantId(),
  )
  if (!request) return

  requests = requests.map((item) =>
    item.id === id
      ? {
          ...item,
          reviewStatus,
          reviewedBy,
          reviewedAt: new Date().toISOString(),
          reviewRemarks,
        }
      : item,
  )
  persist()
  emit()

  if (reviewStatus === 'Approved') {
    updateCase(request.caseId, { status: request.toStatus })
    void logAuditEvent({
      action: 'case.status',
      entityType: 'case',
      entityId: request.caseId,
      summary: `Status → ${request.toStatus}`,
    })
  }
}
