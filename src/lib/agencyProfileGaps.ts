import type { AgencyProfile } from '@/lib/agencyProfile'

/**
 * Business profile fields needed for branding and invoices.
 * Website and logo stay optional.
 */
export type AgencyProfileGapId = 'businessName' | 'address' | 'mobile'

export type AgencyProfileGap = {
  id: AgencyProfileGapId
  label: string
}

type AgencyProfileSource = Pick<
  AgencyProfile,
  'businessName' | 'address' | 'mobile'
>

function hasText(value?: string | null): boolean {
  return Boolean(value?.trim())
}

const GAP_DEFS: {
  id: AgencyProfileGapId
  label: string
  isMissing: (profile: AgencyProfileSource) => boolean
}[] = [
  {
    id: 'businessName',
    label: 'Business name',
    isMissing: (profile) => !hasText(profile.businessName),
  },
  {
    id: 'address',
    label: 'Address',
    isMissing: (profile) => !hasText(profile.address),
  },
  {
    id: 'mobile',
    label: 'Mobile number',
    isMissing: (profile) => !hasText(profile.mobile),
  },
]

/** Missing required business profile details. */
export function listAgencyProfileGaps(
  profile: AgencyProfileSource,
): AgencyProfileGap[] {
  return GAP_DEFS.filter((gap) => gap.isMissing(profile)).map(
    ({ id, label }) => ({ id, label }),
  )
}

export function agencyProfileIsIncomplete(
  profile: AgencyProfileSource,
): boolean {
  return listAgencyProfileGaps(profile).length > 0
}

/**
 * Sidebar Settings badge: one attention item when the business profile
 * is incomplete (not a per-field count).
 */
export function settingsNavAlertCount(profile: AgencyProfileSource): number {
  return agencyProfileIsIncomplete(profile) ? 1 : 0
}
