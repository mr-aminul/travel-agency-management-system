import type { Case, CaseStatus, ServiceType } from '@/types/case'

function isOpenStatus(status: CaseStatus): boolean {
  return status !== 'Completed' && status !== 'Cancelled'
}

/** Open service files for this person (not Completed / Cancelled). */
export function deriveClientActiveCases(cases: readonly Case[]): number {
  return cases.filter((item) => isOpenStatus(item.status)).length
}

/** Sum of open balances across this person's service files. */
export function deriveClientBalance(cases: readonly Case[]): number {
  return cases
    .filter((item) => isOpenStatus(item.status))
    .reduce((sum, item) => sum + item.balance, 0)
}

/** Distinct service lines from this person's files. */
export function deriveClientServices(cases: readonly Case[]): ServiceType[] {
  return Array.from(new Set(cases.map((item) => item.service)))
}

export function summarizeClientFromCases(cases: readonly Case[]): {
  activeCases: number
  balance: number
  services: ServiceType[]
} {
  return {
    activeCases: deriveClientActiveCases(cases),
    balance: deriveClientBalance(cases),
    services: deriveClientServices(cases),
  }
}
