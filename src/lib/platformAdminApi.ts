import { apiFetch } from '@/lib/apiClient'
import { rehydratePlatformData } from '@/lib/data/rehydrate'

export type TenantIsolationRepairResult = {
  ok: boolean
  remappedSubAgentIds?: number
  removedDuplicateIds?: number
  removedDuplicatePhones?: number
  removedDuplicateCases?: number
  removedDuplicatePayments?: number
  clearedOrphanSubAgentLinks?: number
}

/** Platform admin: purge clients copied into the wrong agency. */
export async function repairTenantIsolation(): Promise<TenantIsolationRepairResult> {
  const body = await apiFetch<TenantIsolationRepairResult>(
    '/api/platform/admin/repair/tenant-isolation',
    { method: 'POST', body: {} },
  )
  await rehydratePlatformData()
  return body
}

export type PlatformAuditEntry = {
  id: string
  tenantId: string
  actorUserId: string
  actorEmail: string
  action: string
  entityType: string
  entityId: string
  summary: string
  meta: unknown
  createdAt: string
}

export async function listPlatformAudit(options?: {
  tenantId?: string
  limit?: number
}): Promise<PlatformAuditEntry[]> {
  try {
    const params = new URLSearchParams()
    if (options?.tenantId) params.set('tenantId', options.tenantId)
    if (options?.limit != null) params.set('limit', String(options.limit))
    const query = params.toString()
    const body = await apiFetch<{ entries?: PlatformAuditEntry[] }>(
      `/api/platform/audit${query ? `?${query}` : ''}`,
    )
    return Array.isArray(body.entries) ? body.entries : []
  } catch {
    return []
  }
}
