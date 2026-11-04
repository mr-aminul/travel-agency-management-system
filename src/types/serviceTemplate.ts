/** When a dropdown (or other) document field matches, jump to this step. */
export type ServiceStepBranchRule = {
  documentId: string
  fieldKey: string
  equals: string
  nextStepId: string
}

/** One choice on a step decision (e.g. Finger → Yes / No). */
export type ServiceStepDecisionOption = {
  value: string
  /** Empty = follow the default next status in the list. */
  nextStepId?: string
  /** When this choice is picked, step documents are not required to complete. */
  skipDocuments?: boolean
}

/**
 * Step-level Yes/No (or multi) question that can route the pipeline
 * and optionally skip document requirements for a choice.
 */
export type ServiceStepDecision = {
  key: string
  label: string
  options: ServiceStepDecisionOption[]
}

/** Auto SMS/email when a client file enters this status. */
export type ServiceStepAutoNotify = {
  sms?: boolean
  email?: boolean
  /** Optional SMS template id (`pd-sms-templates`). */
  smsTemplateId?: string
  /** Optional email template id (`pd-sms-templates`, channel email). */
  emailTemplateId?: string
}

/** Custom form field on a pipeline status (shown when completing that step). */
export type ServiceStepField = {
  key: string
  label: string
  type: 'text' | 'date' | 'number' | 'textarea' | 'select'
  required?: boolean
  placeholder?: string
  options?: string[]
}

export type ServiceStepConfig = {
  id: string
  label: string
  /**
   * Catalog document ids attached to this status.
   * Only documents with `required: true` block completion (unless a decision skips docs).
   */
  requiredDocumentIds?: string[]
  /**
   * After this status completes, first matching rule picks the next step.
   * If none match, the journey continues to the next step in the list.
   */
  branchRules?: ServiceStepBranchRule[]
  /** Step questions (e.g. Finger Yes/No) answered when completing this status. */
  decisions?: ServiceStepDecision[]
  /**
   * Custom fields for Complete step. When the agency has a saved catalog flow,
   * only these (+ decisions) appear — not the builtin Employer/date forms.
   */
  fields?: ServiceStepField[]
  /** When the file reaches this status, optionally auto-send SMS and/or email. */
  autoNotify?: ServiceStepAutoNotify
}

export type ServiceDocumentConfig = {
  id: string
  name: string
  required: boolean
  unlockStepId?: string
}

export type ServiceTemplateOverride = {
  id: string
  tenantId: string
  serviceName: string
  /** Empty = default for every destination. Named country = that destination only. */
  country: string
  steps: ServiceStepConfig[]
  documents: ServiceDocumentConfig[]
}

export const DEFAULT_CUSTOM_STEPS: ServiceStepConfig[] = [
  { id: 'intake', label: 'Intake' },
  { id: 'processing', label: 'In progress' },
  { id: 'documents', label: 'Documents' },
  { id: 'delivered', label: 'Delivered' },
  { id: 'closed', label: 'Closed' },
]

export const DEFAULT_CUSTOM_DOCUMENTS: ServiceDocumentConfig[] = [
  { id: 'passport', name: 'Passport', required: true },
  {
    id: 'payment',
    name: 'Payment receipt',
    required: false,
    unlockStepId: 'documents',
  },
  {
    id: 'other',
    name: 'Supporting document',
    required: false,
    unlockStepId: 'documents',
  },
]
