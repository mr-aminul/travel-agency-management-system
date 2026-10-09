import { apiFetch } from '@/lib/apiClient'
import type { ClientThreadMessage } from '@/types/clientMessage'

export type InboundSmsMessage = {
  id: string
  tenantId: string
  clientId: string | null
  fromPhone: string
  body: string
  circle?: string | null
  operator?: string | null
  createdAt: string
}

export async function fetchInboundSms(options: {
  clientId?: string
  limit?: number
}): Promise<InboundSmsMessage[]> {
  const params = new URLSearchParams()
  if (options.clientId) params.set('clientId', options.clientId)
  if (options.limit != null) params.set('limit', String(options.limit))
  const query = params.toString()
  const path = query
    ? `/api/platform/sms/inbound?${query}`
    : '/api/platform/sms/inbound'
  const body = await apiFetch<{ messages: InboundSmsMessage[] }>(path)
  return Array.isArray(body.messages) ? body.messages : []
}

/** Map server inbound rows onto the client SMS thread shape. */
export function inboundToThreadMessages(
  rows: InboundSmsMessage[],
  clientId: string,
): ClientThreadMessage[] {
  return rows
    .filter((row) => row.clientId === clientId)
    .map((row) => ({
      id: row.id,
      tenantId: row.tenantId,
      clientId,
      channel: 'sms' as const,
      to: row.fromPhone,
      body: row.body,
      direction: 'inbound' as const,
      createdAt: row.createdAt,
    }))
}
