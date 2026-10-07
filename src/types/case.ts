export const BUILTIN_SERVICE_TYPES = [
  'Tourist Visa',
  'Student Visa',
  'Work Permit Visa',
  'Hajj/Umrah Visa',
  'Medical Visa',
  'Air Ticket',
  'Hotel Booking',
  'Tour Package',
] as const

export type BuiltinServiceType = (typeof BUILTIN_SERVICE_TYPES)[number]

/** Built-in templates plus agency-defined service names. */
export type ServiceType = BuiltinServiceType | (string & {})

export const BUILTIN_SERVICE_OPTIONS: {
  value: BuiltinServiceType
  label: string
}[] = [
  { value: 'Tourist Visa', label: 'Tourist Visa' },
  { value: 'Student Visa', label: 'Student Visa' },
  { value: 'Work Permit Visa', label: 'Work Permit Visa' },
  { value: 'Hajj/Umrah Visa', label: 'Hajj / Umrah Visa' },
  { value: 'Medical Visa', label: 'Medical Visa' },
  { value: 'Air Ticket', label: 'Air Ticket' },
  { value: 'Hotel Booking', label: 'Hotel Booking' },
  { value: 'Tour Package', label: 'Tour Package' },
]

export function isBuiltinService(
  service: string,
): service is BuiltinServiceType {
  return (BUILTIN_SERVICE_TYPES as readonly string[]).includes(service)
}

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

/** One piece of work on a client. Generic across service templates. */
export type ServiceRequest = {
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
  /** Country used to pick this file’s status journey and document checklist. */
  serviceCountry?: string
  /** Amount charged for this service. */
  serviceFee: number
  /** Amount still due after payments. */
  balance: number
  /** Employee id from HR (`EMP-…`). */
  assignedTo?: string
  departureDate?: string
  description?: string
  createdAt: string
  updatedAt: string
}

/** @deprecated Use ServiceRequest */
export type Case = ServiceRequest

/**
 * Create rules (locked) — see `caseServiceRules.ts`:
 * required: clientId + service; everything else optional.
 */
export type CreateCaseInput = {
  clientId: string
  service: ServiceType
  status?: CaseStatus
  destination?: string
  serviceCountry?: string
  /** Amount charged for this service. Balance due starts equal to this. */
  serviceFee?: number
  balance?: number
  /** Employee id from HR (`EMP-…`). */
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

/** Nav slug ↔ built-in service */
export const CASE_SERVICE_SLUGS: Record<string, BuiltinServiceType> = {
  'tourist-visa': 'Tourist Visa',
  'student-visa': 'Student Visa',
  'work-permit-visa': 'Work Permit Visa',
  'hajj-umrah-visa': 'Hajj/Umrah Visa',
  'medical-visa': 'Medical Visa',
  'air-ticket': 'Air Ticket',
  'hotel-booking': 'Hotel Booking',
  'tour-package': 'Tour Package',
  manpower: 'Work Permit Visa',
  student: 'Student Visa',
  'hajj-umrah': 'Hajj/Umrah Visa',
  leisure: 'Tour Package',
  ticketing: 'Air Ticket',
}

export function slugifyServiceName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function serviceToSlug(service: ServiceType): string {
  const entry = Object.entries(CASE_SERVICE_SLUGS).find(
    ([, value]) => value === service,
  )
  return entry?.[0] ?? slugifyServiceName(service)
}

export function isCaseServiceSlug(
  value: string,
): value is keyof typeof CASE_SERVICE_SLUGS {
  return value in CASE_SERVICE_SLUGS
}
