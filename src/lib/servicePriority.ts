import type { Case, CaseStatus, ServicePriority } from '@/types/case'
import { SERVICE_PRIORITIES } from '@/types/case'

export function normalizeServicePriority(
  value?: string | null,
): ServicePriority {
  if (
    value &&
    (SERVICE_PRIORITIES as readonly string[]).includes(value)
  ) {
    return value as ServicePriority
  }
  return 'Normal'
}

export function servicePriority(item: Pick<Case, 'priority'>): ServicePriority {
  return normalizeServicePriority(item.priority)
}

function isOpenServiceStatus(status: CaseStatus): boolean {
  return status !== 'Completed' && status !== 'Cancelled'
}

/** Work deadline is past and the service is still open. */
export function isWorkDueOverdue(
  item: Pick<Case, 'dueDate' | 'status'>,
  today = new Date().toISOString().slice(0, 10),
): boolean {
  const due = item.dueDate?.trim()
  if (!due || !isOpenServiceStatus(item.status)) return false
  return due < today
}
