import type { Client } from '@/types/client'

/**
 * Client field rules:
 * - Required at create: name, phone
 * - Recommended (badge / highlight only): passport number, issue + expiry
 *   (dates only after a number is entered), NID, address, email
 * - Client profile gaps never block service progress
 * - Sub Agent is optional. Never required, never blocks progress.
 */

export type ClientInfoGapId =
  | 'passport'
  | 'passportIssuedOn'
  | 'passportExpiry'
  | 'nid'
  | 'address'
  | 'email'

export type ClientInfoGap = {
  id: ClientInfoGapId
  label: string
  /** Blocks completing a service step until filled. */
  blocksProgress: boolean
  hint: string
}

type ClientInfoSource = Pick<
  Client,
  | 'passport'
  | 'passportIssuedOn'
  | 'passportExpiry'
  | 'nid'
  | 'address'
  | 'presentAddress'
  | 'email'
>

function hasText(value?: string | null): boolean {
  return Boolean(value?.trim())
}

function addressValue(client: ClientInfoSource): string {
  return client.presentAddress?.trim() || client.address?.trim() || ''
}

const GAP_DEFS: {
  id: ClientInfoGapId
  label: string
  blocksProgress: boolean
  hint: string
  isMissing: (client: ClientInfoSource) => boolean
}[] = [
  {
    id: 'passport',
    label: 'Passport number',
    blocksProgress: false,
    hint: 'Recommended for visa paperwork',
    isMissing: (client) => !hasText(client.passport),
  },
  {
    id: 'passportIssuedOn',
    label: 'Passport date of issue',
    blocksProgress: false,
    hint: 'Recommended once a passport number is entered',
    isMissing: (client) =>
      hasText(client.passport) && !hasText(client.passportIssuedOn),
  },
  {
    id: 'passportExpiry',
    label: 'Passport date of expiry',
    blocksProgress: false,
    hint: 'Recommended once a passport number is entered',
    isMissing: (client) =>
      hasText(client.passport) && !hasText(client.passportExpiry),
  },
  {
    id: 'nid',
    label: 'NID number',
    blocksProgress: false,
    hint: 'Recommended for identity checks',
    isMissing: (client) => !hasText(client.nid),
  },
  {
    id: 'address',
    label: 'Address',
    blocksProgress: false,
    hint: 'Recommended for contact and paperwork',
    isMissing: (client) => !addressValue(client),
  },
  {
    id: 'email',
    label: 'Email',
    blocksProgress: false,
    hint: 'Recommended for invoices and updates',
    isMissing: (client) => !hasText(client.email),
  },
]

/** Passport / NID gaps — filled from the Identity sidebar, not the Profile form. */
export const IDENTITY_DOC_GAP_IDS: ReadonlySet<ClientInfoGapId> = new Set([
  'passport',
  'passportIssuedOn',
  'passportExpiry',
  'nid',
])

/** Email / address gaps — filled on the Profile tab. */
export const PROFILE_FORM_GAP_IDS: ReadonlySet<ClientInfoGapId> = new Set([
  'email',
  'address',
])

/** Missing profile details to show staff on the client page. */
export function listClientInfoGaps(client: ClientInfoSource): ClientInfoGap[] {
  return GAP_DEFS.filter((gap) => gap.isMissing(client)).map(
    ({ id, label, blocksProgress, hint }) => ({
      id,
      label,
      blocksProgress,
      hint,
    }),
  )
}

/** Gaps editable on the Profile tab (excludes passport / NID). */
export function listProfileFormGaps(client: ClientInfoSource): ClientInfoGap[] {
  return listClientInfoGaps(client).filter((gap) =>
    PROFILE_FORM_GAP_IDS.has(gap.id),
  )
}

/** Gaps editable from the Identity document windows. */
export function listIdentityDocGaps(client: ClientInfoSource): ClientInfoGap[] {
  return listClientInfoGaps(client).filter((gap) =>
    IDENTITY_DOC_GAP_IDS.has(gap.id),
  )
}

/** Gaps that must be filled before a service step can advance. */
export function clientProgressBlockers(
  client: ClientInfoSource,
): ClientInfoGap[] {
  return listClientInfoGaps(client).filter((gap) => gap.blocksProgress)
}

export function clientCanAdvanceServices(client: ClientInfoSource): boolean {
  return clientProgressBlockers(client).length === 0
}

export function progressBlockedMessage(blockers: ClientInfoGap[]): string {
  if (blockers.length === 0) return ''
  if (blockers.length === 1) {
    return `Add the client’s ${blockers[0].label.toLowerCase()} before moving this service forward.`
  }
  const labels = blockers.map((gap) => gap.label.toLowerCase())
  const last = labels[labels.length - 1]
  const head = labels.slice(0, -1).join(', ')
  return `Add the client’s ${head} and ${last} before moving this service forward.`
}
