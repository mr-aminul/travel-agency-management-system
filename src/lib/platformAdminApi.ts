import { apiFetch } from '@/lib/apiClient'

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
