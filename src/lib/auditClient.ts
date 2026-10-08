import { getAccessToken } from '@/lib/authApi'
import { shouldUseApiDataBackend } from '@/lib/data'

function apiBase(): string {
  const configured = import.meta.env.VITE_API_BASE_URL as string | undefined
  if (configured && configured.trim()) {
    return configured.replace(/\/$/, '')
  }
  return ''
}

export type AuditEventInput = {
  action: string
  entityType?: string
  entityId?: string
  summary?: string
  meta?: Record<string, unknown>
}

/** Best-effort server audit — never blocks the UI path. */
export async function logAuditEvent(input: AuditEventInput): Promise<void> {
  if (!shouldUseApiDataBackend()) return
  const token = getAccessToken()
  if (!token) return
  try {
    await fetch(`${apiBase()}/api/platform/audit`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(input),
    })
  } catch {
    // ignore
  }
}
