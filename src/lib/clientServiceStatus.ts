import type { Case, CaseStatus } from '@/types/case'
import type { SubAgentStatus } from '@/types/subAgent'

/** Most actionable first — used when a client has multiple service files. */
const STATUS_PRIORITY: CaseStatus[] = [
  'On-Hold',
  'In-Progress',
  'Pending',
  'Completed',
  'Cancelled',
]

function isOpenStatus(status: CaseStatus): boolean {
  return status !== 'Completed' && status !== 'Cancelled'
}

/**
 * Roll up a client's service-file statuses into one chip for lists/profile.
 * Prefers open files; among those, the most actionable status wins.
 */
export function deriveClientServiceStatus(
  cases: readonly Case[],
): CaseStatus | null {
  if (cases.length === 0) return null
  const open = cases.filter((item) => isOpenStatus(item.status))
  const pool = open.length > 0 ? open : cases
  let best: CaseStatus | null = null
  let bestRank = Infinity
  for (const item of pool) {
    const rank = STATUS_PRIORITY.indexOf(item.status)
    if (rank >= 0 && rank < bestRank) {
      bestRank = rank
      best = item.status
    }
  }
  return best
}

/**
 * Sub agents stay Active while any referred client still has an open service.
 */
export function deriveSubAgentActivityStatus(
  cases: readonly Case[],
): SubAgentStatus {
  return cases.some((item) => isOpenStatus(item.status)) ? 'Active' : 'Inactive'
}

/** True when any of the client's files matches one of the selected statuses. */
export function clientMatchesServiceStatusFilters(
  cases: readonly Case[],
  statusFilters: readonly string[],
): boolean {
  if (statusFilters.length === 0) return true
  return cases.some((item) => statusFilters.includes(item.status))
}

export function groupCasesByClientId(
  cases: readonly Case[],
): Map<string, Case[]> {
  const map = new Map<string, Case[]>()
  for (const item of cases) {
    const list = map.get(item.clientId)
    if (list) list.push(item)
    else map.set(item.clientId, [item])
  }
  return map
}
