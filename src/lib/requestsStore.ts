import { useMemo } from 'react'
import { useSyncExternalStore } from 'react'
import { updateCase } from '@/lib/casesStore'
import { getActiveTenantId } from '@/lib/authApi'
import { useAuth } from '@/lib/useAuth'
import { DEFAULT_TENANT_ID } from '@/types/tenant'
import type { RequestReviewStatus, StatusUpdateRequest } from '@/types/request'

type Listener = () => void

let requests: StatusUpdateRequest[] = []
const listeners = new Set<Listener>()

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
  emit()

  if (reviewStatus === 'Approved') {
    updateCase(request.caseId, { status: request.toStatus })
  }
}
