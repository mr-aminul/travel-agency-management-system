import type { Case } from '@/types/case'

type CaseMoneySource = Pick<Case, 'balance'> & { serviceFee?: number }

/** Contracted charge for the service. Falls back to paid + remaining for older files. */
export function caseServiceFee(item: CaseMoneySource, paidTotal = 0): number {
  if (typeof item.serviceFee === 'number' && Number.isFinite(item.serviceFee)) {
    return Math.max(0, item.serviceFee)
  }
  return Math.max(0, paidTotal) + Math.max(0, item.balance)
}

export function caseBalanceDue(item: CaseMoneySource, paidTotal = 0): number {
  return Math.max(0, caseServiceFee(item, paidTotal) - Math.max(0, paidTotal))
}

export function parseMoneyInput(value: string): number {
  const parsed = Number(value.replace(/,/g, ''))
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0
}
