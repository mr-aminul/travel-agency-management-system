export type CaseVertical =
  | 'Manpower'
  | 'Student'
  | 'Hajj/Umrah'
  | 'Leisure'
  | 'Ticketing'

/** Operational health — not the same as journey progress. */
export type CaseStatus =
  | 'Pending'
  | 'In-Progress'
  | 'On-Hold'
  | 'Completed'
  | 'Cancelled'

/**
 * Coarse bucket derived from the current vertical step.
 * Prefer `currentStepId` as the source of truth in UI.
 */
export type CaseStage =
  | 'Intake'
  | 'Processing'
  | 'Documents'
  | 'Travel'
  | 'Closed'

export type CaseStepUpload = {
  key: string
  fileName: string
  /** Points at an in-memory blob in the file store for preview. */
  fileId?: string
  mimeType?: string
}

/** Data captured to complete a step — required before the step can advance. */
export type CaseStepRecord = {
  completedAt: string | null
  detail?: string
  fields?: Record<string, string>
  uploads?: CaseStepUpload[]
}

export type CaseDocumentStatus =
  | 'approved'
  | 'under_review'
  | 'missing'
  | 'not_due'

export type CaseDocumentIcon =
  | 'passport'
  | 'nid'
  | 'medical'
  | 'demand'
  | 'bmet'
  | 'offer'
  | 'financial'
  | 'visa'
  | 'vaccine'
  | 'package'
  | 'id'
  | 'itinerary'
  | 'deposit'
  | 'payment'
  | 'ticket'
  | 'other'

export type CaseDocument = {
  id: string
  name: string
  detail: string
  status: CaseDocumentStatus
  expiry: string | null
  required: boolean
  /** Step that unlocks this document; omitted = available from intake. */
  unlockStepId?: string
  icon: CaseDocumentIcon
  /** Structured details collected in the document modal. */
  fields?: Record<string, string>
  /** Optional attachment filename (details are the source of truth). */
  fileName?: string
  /** Points at an in-memory blob in the file store for preview. */
  fileId?: string
  mimeType?: string
}

export type Case = {
  id: string
  caseId: string
  title: string
  clientId: string
  clientName: string
  vertical: CaseVertical
  status: CaseStatus
  /** Derived from currentStepId — kept for filters/compat. */
  stage: CaseStage
  /** Source of truth for journey position. */
  currentStepId: string
  /** Completion records keyed by vertical step id. */
  steps: Record<string, CaseStepRecord>
  documents: CaseDocument[]
  destination?: string
  balance: number
  assignedTo?: string
  departureDate?: string
  description?: string
  createdAt: string
  updatedAt: string
}

export type CreateCaseInput = {
  title: string
  clientId: string
  vertical: CaseVertical
  status?: CaseStatus
  destination?: string
  balance?: number
  assignedTo?: string
  departureDate?: string
  description?: string
}

export type UpdateCaseInput = Partial<
  Omit<Case, 'id' | 'caseId' | 'createdAt' | 'clientId' | 'steps' | 'documents'>
> & {
  steps?: Record<string, CaseStepRecord>
  documents?: CaseDocument[]
  currentStepId?: string
}

/** Nav slug ↔ vertical */
export const CASE_VERTICAL_SLUGS: Record<string, CaseVertical> = {
  manpower: 'Manpower',
  student: 'Student',
  'hajj-umrah': 'Hajj/Umrah',
  leisure: 'Leisure',
  ticketing: 'Ticketing',
}

export function verticalToSlug(vertical: CaseVertical): string {
  const entry = Object.entries(CASE_VERTICAL_SLUGS).find(
    ([, value]) => value === vertical,
  )
  return entry?.[0] ?? 'manpower'
}

export function isCaseVerticalSlug(
  value: string,
): value is keyof typeof CASE_VERTICAL_SLUGS {
  return value in CASE_VERTICAL_SLUGS
}
