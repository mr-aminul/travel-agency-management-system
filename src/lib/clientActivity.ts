import { formatBalance } from '@/lib/clientsStore'
import { getEmployeeDisplayName } from '@/lib/employeesStore'
import { formatPaymentAmount } from '@/lib/paymentsStore'
import type { Case } from '@/types/case'
import type { ClientThreadMessage } from '@/types/clientMessage'
import type { Payment } from '@/types/payment'
import type { StatusUpdateRequest } from '@/types/request'

export type ClientActivityType =
  | 'Services'
  | 'Payments'
  | 'SMS'
  | 'Email'
  | 'Requests'

export type ClientActivityItem = {
  id: string
  at: string
  staff: string
  summary: string
  type: ClientActivityType
  reference: string
  caseId?: string
  channel?: 'sms' | 'email'
}

function sortNewest(a: ClientActivityItem, b: ClientActivityItem) {
  return Date.parse(b.at) - Date.parse(a.at)
}

/** Timeline for one client: services, payments, messages, status requests. */
export function buildClientActivity(input: {
  cases: Case[]
  payments: Payment[]
  messages: ClientThreadMessage[]
  requests: StatusUpdateRequest[]
  limit?: number
}): ClientActivityItem[] {
  const rows: ClientActivityItem[] = []

  for (const item of input.cases) {
    rows.push({
      id: `case-open-${item.id}`,
      at: item.createdAt,
      staff: getEmployeeDisplayName(item.assignedTo) || '—',
      summary: `Service opened — ${item.service}`,
      type: 'Services',
      reference: item.caseId,
      caseId: item.id,
    })
    if (
      item.updatedAt &&
      item.updatedAt.slice(0, 10) !== item.createdAt.slice(0, 10)
    ) {
      rows.push({
        id: `case-update-${item.id}-${item.updatedAt}`,
        at: item.updatedAt,
        staff: getEmployeeDisplayName(item.assignedTo) || '—',
        summary: `Service updated — ${item.service}`,
        type: 'Services',
        reference: item.caseId,
        caseId: item.id,
      })
    }
  }

  for (const item of input.payments) {
    const linked = input.cases.find((entry) => entry.id === item.caseId)
    rows.push({
      id: `pay-${item.id}`,
      at: item.createdAt,
      staff: '—',
      summary: `Collected ${formatPaymentAmount(item.amount)} via ${item.method}`,
      type: 'Payments',
      reference: linked?.caseId || formatBalance(item.amount),
      caseId: item.caseId,
    })
  }

  for (const item of input.messages) {
    const detail =
      item.body
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 80) ||
      (item.attachment ? item.attachment.name : 'Message')
    rows.push({
      id: `msg-${item.id}`,
      at: item.createdAt,
      staff: '—',
      summary:
        item.channel === 'email'
          ? `Email sent — ${detail}`
          : `SMS sent — ${detail}`,
      type: item.channel === 'email' ? 'Email' : 'SMS',
      reference: item.channel === 'email' ? 'Email' : 'SMS',
      channel: item.channel,
    })
  }

  for (const item of input.requests) {
    const linked = input.cases.find((entry) => entry.id === item.caseId)
    rows.push({
      id: `req-${item.id}`,
      at: item.requestedAt,
      staff: item.reviewedBy?.trim() || '—',
      summary: `Status ${item.fromStatus} → ${item.toStatus} (${item.reviewStatus})`,
      type: 'Requests',
      reference: linked?.caseId || item.caseId,
      caseId: item.caseId,
    })
  }

  const limit = input.limit ?? 40
  return rows.sort(sortNewest).slice(0, limit)
}
