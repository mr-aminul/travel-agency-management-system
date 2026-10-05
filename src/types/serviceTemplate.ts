export type ServiceStepConfig = {
  id: string
  label: string
  /** Catalog document ids that must be filed before this status can complete. */
  requiredDocumentIds?: string[]
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
