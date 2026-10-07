import type { Case } from '@/types/case'

/**
 * Service / case field rules (locked):
 * - Required at create: client, service type
 * - Optional at create: country, city/destination, assigned staff,
 *   departure date, service fee, notes
 * - Blocks step progress (client): passport — see clientMissingInfo
 * - Blocks step progress (service): that step’s required fields + uploads
 *   from the service template (and catalog “Needs docs”)
 * - Recommended (highlight only, never blocks create or steps): country,
 *   assigned staff
 * - Balance due is a payments concern — never blocks a service step
 */

export type CaseInfoGapId = 'country' | 'assignee'

export type CaseInfoGap = {
  id: CaseInfoGapId
  label: string
  /** Always false for service create/setup gaps — steps use their own rules. */
  blocksProgress: false
  hint: string
}

type CaseInfoSource = Pick<Case, 'serviceCountry' | 'destination' | 'assignedTo'>

function hasText(value?: string | null): boolean {
  return Boolean(value?.trim())
}

function countryValue(item: CaseInfoSource): string {
  return item.serviceCountry?.trim() || item.destination?.trim() || ''
}

const GAP_DEFS: {
  id: CaseInfoGapId
  label: string
  hint: string
  isMissing: (item: CaseInfoSource) => boolean
}[] = [
  {
    id: 'country',
    label: 'Country',
    hint: 'Recommended so the right checklist and steps apply',
    isMissing: (item) => !countryValue(item),
  },
  {
    id: 'assignee',
    label: 'Assigned staff',
    hint: 'Recommended so someone owns the file',
    isMissing: (item) => !hasText(item.assignedTo),
  },
]

/** Setup details worth highlighting on a service — never block progress. */
export function listCaseInfoGaps(item: CaseInfoSource): CaseInfoGap[] {
  return GAP_DEFS.filter((gap) => gap.isMissing(item)).map(
    ({ id, label, hint }) => ({
      id,
      label,
      blocksProgress: false as const,
      hint,
    }),
  )
}

export function caseHasRecommendedGaps(item: CaseInfoSource): boolean {
  return listCaseInfoGaps(item).length > 0
}
