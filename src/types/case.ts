export type ServiceType =
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
 * Coarse bucket derived from the current service step.
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
  tenantId: string
  caseId: string
  clientId: string
  clientName: string
  service: ServiceType
  status: CaseStatus
  /** Derived from currentStepId — kept for filters/compat. */
  stage: CaseStage
  /** Source of truth for journey position. */
  currentStepId: string
  /** Completion records keyed by service step id. */
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
  clientId: string
  service: ServiceType
  status?: CaseStatus
  destination?: string
  balance?: number
  assignedTo?: string
  departureDate?: string
  description?: string
}

export type UpdateCaseInput = Partial<
  Omit<
    Case,
    | 'id'
    | 'tenantId'
    | 'caseId'
    | 'createdAt'
    | 'clientId'
    | 'steps'
    | 'documents'
  >
> & {
  steps?: Record<string, CaseStepRecord>
  documents?: CaseDocument[]
  currentStepId?: string
}

/** Nav slug ↔ service */
export const CASE_SERVICE_SLUGS: Record<string, ServiceType> = {
  manpower: 'Manpower',
  student: 'Student',
  'hajj-umrah': 'Hajj/Umrah',
  leisure: 'Leisure',
  ticketing: 'Ticketing',
}

export function serviceToSlug(service: ServiceType): string {
  const entry = Object.entries(CASE_SERVICE_SLUGS).find(
    ([, value]) => value === service,
  )
  return entry?.[0] ?? 'manpower'
}

export function isCaseServiceSlug(
  value: string,
): value is keyof typeof CASE_SERVICE_SLUGS {
  return value in CASE_SERVICE_SLUGS
}
