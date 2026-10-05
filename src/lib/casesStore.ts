import { useMemo } from 'react'
import { useSyncExternalStore } from 'react'
import {
  buildInitialSteps,
  buildProgressAtStep,
  deriveStageFromStep,
  getNextStepDef,
  isLastStep,
} from '@/lib/caseChecklist'
import { identityKindForDocumentId, type IdentityKind } from '@/lib/clientDocuments'
import {
  buildCaseDocuments,
  syncDocumentsWithProgress,
  withSeedDocumentStatuses,
} from '@/lib/caseDocuments'
import {
  findStepForDocument,
  getStepRequirement,
  summarizeStepCompletion,
  validateStepCompletion,
  type StepCompletionInput,
  type StepUploadDef,
} from '@/lib/caseStepRequirements'
import { getDocumentForm } from '@/lib/caseDocumentForms'
import { getStepIndex } from '@/lib/caseChecklist'
import {
  findClientRecord,
  getClientById,
  updateClient,
  updateClientRecord,
} from '@/lib/clientsStore'
import { getActiveTenantId } from '@/lib/authApi'
import { BUILTIN_SERVICE_OPTIONS } from '@/types/case'
import { activeTenantAllowsService } from '@/lib/activeTenant'
import { resolveServiceCountry } from '@/lib/serviceTemplatesStore'
import { useAuth } from '@/lib/useAuth'
import { DEFAULT_TENANT_ID, TENANT_IDS } from '@/types/tenant'
import { getEnabledServiceOptions } from '@/lib/serviceCatalog'
import type {
  Case,
  CaseDocument,
  CaseDocumentStatus,
  CaseStatus,
  ServiceType,
  CreateCaseInput,
  UpdateCaseInput,
} from '@/types/case'

type Listener = () => void

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function seedCase(
  partial: Omit<
    Case,
    'currentStepId' | 'steps' | 'documents' | 'stage' | 'serviceFee'
  > & {
    currentStepId: string
    serviceFee?: number
    stepDetails?: Record<string, string>
    documentOverrides?: Partial<Record<string, Partial<CaseDocument>>>
  },
): Case {
  const client = findClientRecord(partial.clientId)
  const country = partial.serviceCountry
  const progress = buildProgressAtStep(
    partial.service,
    partial.currentStepId,
    partial.createdAt,
    partial.stepDetails,
    country,
  )
  const documents = withSeedDocumentStatuses(
    buildCaseDocuments(partial.service, client, country),
    partial.documentOverrides ?? {},
  )
  const stage = deriveStageFromStep(
    partial.service,
    progress.currentStepId,
    partial.status,
    country,
  )
  const drafted: Case = {
    ...partial,
    serviceFee: partial.serviceFee ?? partial.balance,
    stage,
    currentStepId: progress.currentStepId,
    steps: progress.steps,
    documents,
  }
  return { ...drafted, documents: syncDocumentsWithProgress(drafted) }
}

const SEED_CASES: Case[] = [
  seedCase({
    id: 'case-101',
    tenantId: TENANT_IDS.full,
    caseId: 'SR-00101',
    clientId: 'c-284',
    clientName: 'Md. Rahim Uddin',
    service: 'Work Permit Visa',
    status: 'In-Progress',
    currentStepId: 'medical',
    destination: 'Riyadh, Saudi Arabia',
    serviceFee: 50000,
    balance: 35000,
    assignedTo: 'EMP-7001',
    departureDate: '2026-09-15',
    description:
      'Nurse recruitment for Al Rajhi Hospital. Medical + police clearance in progress.',
    createdAt: '2025-11-20',
    updatedAt: '2026-08-01',
    stepDetails: {
      registered: 'Candidate profile verified',
      shortlisted: 'Shortlisted for employer',
      interview: 'Interview completed',
      selected: 'Selected after employer interview',
      medical: 'GAMCA medical in progress',
    },
    documentOverrides: {
      medical: { status: 'under_review', detail: 'GAMCA / approved clinic' },
      demand: { status: 'missing', detail: 'Employer authorization required' },
    },
  }),
  seedCase({
    id: 'case-102',
    tenantId: TENANT_IDS.full,
    caseId: 'SR-00102',
    clientId: 'c-284',
    clientName: 'Md. Rahim Uddin',
    service: 'Air Ticket',
    status: 'Pending',
    currentStepId: 'request',
    destination: 'Jeddah, Saudi Arabia',
    serviceFee: 10000,
    balance: 10000,
    assignedTo: 'EMP-7007',
    departureDate: '2026-09-12',
    description:
      'One-way economy ticket aligned with manpower deployment date.',
    createdAt: '2026-07-28',
    updatedAt: '2026-07-28',
  }),
  seedCase({
    id: 'case-103',
    tenantId: TENANT_IDS.full,
    caseId: 'SR-00103',
    clientId: 'c-291',
    clientName: 'Farhana Akter',
    service: 'Student Visa',
    status: 'In-Progress',
    currentStepId: 'visa',
    destination: 'Montreal, Canada',
    serviceFee: 170000,
    balance: 120000,
    assignedTo: 'EMP-7004',
    departureDate: '2026-12-01',
    description:
      'Fall 2026 intake. Offer letter received; visa file under preparation.',
    createdAt: '2026-01-10',
    updatedAt: '2026-07-20',
    stepDetails: {
      registered: 'Case opened',
      counselled: 'Counselling complete',
      applied: 'Application lodged',
      offer: 'Offer letter received',
      visa: 'Visa file under preparation',
    },
    documentOverrides: {
      offer: { status: 'approved', detail: 'Unconditional offer' },
      financial: { status: 'under_review' },
      visa: { status: 'missing' },
    },
  }),
  seedCase({
    id: 'case-104',
    tenantId: TENANT_IDS.full,
    caseId: 'SR-00104',
    clientId: 'c-315',
    clientName: 'Nusrat Jahan',
    service: 'Hajj/Umrah Visa',
    status: 'In-Progress',
    currentStepId: 'package',
    destination: 'Makkah, Saudi Arabia',
    serviceFee: 110000,
    balance: 85000,
    assignedTo: 'EMP-7005',
    departureDate: '2026-05-20',
    description: 'Package B — 21 days. Passport submitted; visa quota pending.',
    createdAt: '2026-02-14',
    updatedAt: '2026-07-15',
    stepDetails: {
      registered: 'Registration complete',
      package: 'Package selection in progress',
    },
  }),
  seedCase({
    id: 'case-105',
    tenantId: TENANT_IDS.full,
    caseId: 'SR-00105',
    clientId: 'c-328',
    clientName: 'Imran Hossain',
    service: 'Tour Package',
    status: 'Pending',
    currentStepId: 'enquiry',
    destination: 'Cox’s Bazar, Bangladesh',
    balance: 22000,
    assignedTo: 'EMP-7006',
    departureDate: '2026-08-22',
    description:
      '3N/4D family package for 4 guests. Quote shared; awaiting deposit.',
    createdAt: '2026-03-01',
    updatedAt: '2026-03-05',
  }),
  seedCase({
    id: 'case-106',
    tenantId: TENANT_IDS.full,
    caseId: 'SR-00106',
    clientId: 'c-302',
    clientName: 'Jamal Haque',
    service: 'Work Permit Visa',
    status: 'Completed',
    currentStepId: 'departed',
    destination: 'Penang, Malaysia',
    balance: 0,
    assignedTo: 'EMP-7001',
    departureDate: '2025-10-01',
    description: 'Successfully deployed. Case closed after arrival confirmation.',
    createdAt: '2025-08-20',
    updatedAt: '2025-10-15',
    stepDetails: {
      registered: 'Registered',
      shortlisted: 'Shortlisted',
      interview: 'Interviewed',
      selected: 'Selected',
      medical: 'Medical cleared',
      visa: 'Visa issued',
      clearance: 'BMET cleared',
      ticket: 'Ticket issued',
      departed: 'Arrived in Penang',
    },
    documentOverrides: {
      medical: { status: 'approved' },
      demand: { status: 'approved' },
      bmet: { status: 'approved' },
    },
  }),
  seedCase({
    id: 'case-107',
    tenantId: TENANT_IDS.full,
    caseId: 'SR-00107',
    clientId: 'c-328',
    clientName: 'Imran Hossain',
    service: 'Hotel Booking',
    status: 'Pending',
    currentStepId: 'enquiry',
    destination: 'Cox’s Bazar, Bangladesh',
    serviceFee: 18000,
    balance: 18000,
    assignedTo: 'EMP-7006',
    departureDate: '2026-08-22',
    description: 'Sea Pearl 3 nights for a family of four. Awaiting confirmation.',
    createdAt: '2026-03-02',
    updatedAt: '2026-03-05',
  }),
  seedCase({
    id: 'case-108',
    tenantId: TENANT_IDS.full,
    caseId: 'SR-00108',
    clientId: 'c-340',
    clientName: 'Ayesha Rahman',
    service: 'Tourist Visa',
    status: 'In-Progress',
    currentStepId: 'applied',
    destination: 'Bangkok, Thailand',
    serviceFee: 12000,
    balance: 7000,
    assignedTo: 'EMP-7006',
    departureDate: '2026-11-12',
    description: '7-night Bangkok visit. Visa file lodged; awaiting embassy.',
    createdAt: '2026-06-18',
    updatedAt: '2026-07-22',
    stepDetails: {
      registered: 'Passport and itinerary collected',
      applied: 'Tourist visa applied at VAC',
    },
    documentOverrides: {
      itinerary: { status: 'under_review', detail: 'Flights + hotel plan' },
    },
  }),
  seedCase({
    id: 'case-109',
    tenantId: TENANT_IDS.full,
    caseId: 'SR-00109',
    clientId: 'c-351',
    clientName: 'Dr. Kamal Uddin',
    service: 'Medical Visa',
    status: 'In-Progress',
    currentStepId: 'medical',
    destination: 'Chennai, India',
    serviceFee: 25000,
    balance: 15000,
    assignedTo: 'EMP-7008',
    departureDate: '2026-10-05',
    description: 'Apollo Chennai cardiac review. Hospital invitation pending.',
    createdAt: '2026-07-01',
    updatedAt: '2026-07-28',
    stepDetails: {
      registered: 'Patient profile opened',
      medical: 'Awaiting hospital invitation letter',
    },
    documentOverrides: {
      medical: { status: 'under_review', detail: 'Apollo appointment requested' },
    },
  }),
  seedCase({
    id: 'case-l-105',
    tenantId: TENANT_IDS.leisure,
    caseId: 'SR-20105',
    clientId: 'c-l-328',
    clientName: 'Imran Hossain',
    service: 'Tour Package',
    status: 'Pending',
    currentStepId: 'enquiry',
    destination: 'Cox’s Bazar, Bangladesh',
    serviceFee: 27000,
    balance: 22000,
    assignedTo: 'EMP-L001',
    departureDate: '2026-08-22',
    description:
      '3N/4D family package for 4 guests. Quote shared; awaiting deposit.',
    createdAt: '2026-03-01',
    updatedAt: '2026-03-05',
  }),
  seedCase({
    id: 'case-l-110',
    tenantId: TENANT_IDS.leisure,
    caseId: 'SR-20110',
    clientId: 'c-l-401',
    clientName: 'Sadia Karim',
    service: 'Air Ticket',
    status: 'Pending',
    currentStepId: 'request',
    destination: 'Cox’s Bazar, Bangladesh',
    balance: 8500,
    assignedTo: 'EMP-L002',
    departureDate: '2026-08-20',
    description: 'Return tickets for a family of four.',
    createdAt: '2026-04-04',
    updatedAt: '2026-04-04',
  }),
  seedCase({
    id: 'case-m-101',
    tenantId: TENANT_IDS.manpower,
    caseId: 'SR-30101',
    clientId: 'c-m-284',
    clientName: 'Md. Rahim Uddin',
    service: 'Work Permit Visa',
    status: 'In-Progress',
    currentStepId: 'medical',
    destination: 'Riyadh, Saudi Arabia',
    serviceFee: 50000,
    balance: 35000,
    assignedTo: 'EMP-M001',
    departureDate: '2026-09-15',
    description:
      'Nurse recruitment for Al Rajhi Hospital. Medical + police clearance in progress.',
    createdAt: '2025-11-20',
    updatedAt: '2026-08-01',
    stepDetails: {
      registered: 'Candidate profile verified',
      shortlisted: 'Shortlisted for employer',
      interview: 'Interview completed',
      selected: 'Selected after employer interview',
      medical: 'GAMCA medical in progress',
    },
    documentOverrides: {
      medical: { status: 'under_review', detail: 'GAMCA / approved clinic' },
      demand: { status: 'missing', detail: 'Employer authorization required' },
    },
  }),
  seedCase({
    id: 'case-m-106',
    tenantId: TENANT_IDS.manpower,
    caseId: 'SR-30106',
    clientId: 'c-m-302',
    clientName: 'Jamal Haque',
    service: 'Work Permit Visa',
    status: 'Completed',
    currentStepId: 'departed',
    destination: 'Penang, Malaysia',
    balance: 0,
    assignedTo: 'EMP-M001',
    departureDate: '2025-10-01',
    description: 'Successfully deployed. Case closed after arrival confirmation.',
    createdAt: '2025-08-20',
    updatedAt: '2025-10-15',
    stepDetails: {
      registered: 'Registered',
      shortlisted: 'Shortlisted',
      interview: 'Interviewed',
      selected: 'Selected',
      medical: 'Medical cleared',
      visa: 'Visa issued',
      clearance: 'BMET cleared',
      ticket: 'Ticket issued',
      departed: 'Arrived in Penang',
    },
    documentOverrides: {
      medical: { status: 'approved' },
      demand: { status: 'approved' },
      bmet: { status: 'approved' },
    },
  }),
]

let cases: Case[] = SEED_CASES.map((item) => ({
  ...item,
  steps: { ...item.steps },
  documents: item.documents.map((doc) => ({ ...doc })),
}))
const listeners = new Set<Listener>()

function emit() {
  listeners.forEach((listener) => listener())
}

function subscribe(listener: Listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot() {
  return cases
}

function tenantId() {
  return getActiveTenantId() || DEFAULT_TENANT_ID
}

function inActiveTenant(item: Case) {
  return item.tenantId === tenantId()
}

function nextCaseId(): string {
  const scoped = cases.filter((item) => item.tenantId === tenantId())
  const max = scoped.reduce((highest, item) => {
    const numeric = Number(item.caseId.replace(/\D/g, ''))
    return Number.isFinite(numeric) ? Math.max(highest, numeric) : highest
  }, 0)
  return `SR-${String(max + 1).padStart(5, '0')}`
}

function isActiveStatus(status: CaseStatus): boolean {
  return status !== 'Completed' && status !== 'Cancelled'
}

function syncClientFromCases(clientId: string) {
  const client = findClientRecord(clientId)
  if (!client) return

  const clientCases = cases.filter(
    (item) => item.clientId === clientId && item.tenantId === client.tenantId,
  )
  const activeCases = clientCases.filter((item) =>
    isActiveStatus(item.status),
  ).length
  const balance = clientCases
    .filter((item) => isActiveStatus(item.status))
    .reduce((sum, item) => sum + item.balance, 0)
  const services = Array.from(
    new Set([
      ...client.services,
      ...clientCases.map((item) => item.service),
    ]),
  )

  let status = client.status
  if (activeCases > 0 && status === 'Lead') status = 'Active'
  if (
    activeCases === 0 &&
    clientCases.some((item) => item.status === 'Completed') &&
    clientCases.every(
      (item) => item.status === 'Completed' || item.status === 'Cancelled',
    )
  ) {
    const hasManpowerDeployed = clientCases.some(
      (item) =>
        item.service === 'Work Permit Visa' && item.status === 'Completed',
    )
    status = hasManpowerDeployed ? 'Deployed' : client.status === 'Lead' ? 'Lead' : 'Active'
  }

  updateClientRecord(clientId, { activeCases, services, balance, status })
}

/** Recompute derived client fields for every client touched by seed. */
function syncAllSeedClients() {
  const ids = new Set(cases.map((item) => item.clientId))
  ids.forEach((id) => syncClientFromCases(id))
}

syncAllSeedClients()

export function useCases(): Case[] {
  const { session } = useAuth()
  const all = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const activeId = session?.tenantId ?? DEFAULT_TENANT_ID
  return useMemo(
    () => all.filter((item) => item.tenantId === activeId),
    [all, activeId],
  )
}

export function useCasesByClientId(clientId: string): Case[] {
  return useCases().filter((item) => item.clientId === clientId)
}

export function getCaseById(id: string): Case | undefined {
  return cases.find((item) => item.id === id && inActiveTenant(item))
}

export function getCasesByClientId(clientId: string): Case[] {
  return cases.filter(
    (item) => item.clientId === clientId && inActiveTenant(item),
  )
}

export function findCasesByClientIdAnyTenant(clientId: string): Case[] {
  return cases.filter((item) => item.clientId === clientId)
}

export function getCasesByService(service: ServiceType): Case[] {
  return cases.filter(
    (item) => item.service === service && inActiveTenant(item),
  )
}

export function createCase(input: CreateCaseInput): Case {
  const client = getClientById(input.clientId)
  if (!client) {
    throw new Error('Client not found for new service.')
  }
  if (!activeTenantAllowsService(input.service)) {
    throw new Error('This service line is not enabled for your agency.')
  }

  const createdAt = today()
  const serviceCountry =
    input.serviceCountry?.trim() ||
    resolveServiceCountry(input.service, input.destination)
  const progress = buildInitialSteps(input.service, createdAt, serviceCountry)
  const status = input.status ?? 'Pending'
  const created: Case = {
    id: `case-${Date.now().toString(36)}`,
    tenantId: tenantId(),
    caseId: nextCaseId(),
    clientId: client.id,
    clientName: client.name,
    service: input.service,
    status,
    stage: deriveStageFromStep(
      input.service,
      progress.currentStepId,
      status,
      serviceCountry,
    ),
    currentStepId: progress.currentStepId,
    steps: progress.steps,
    documents: buildCaseDocuments(input.service, client, serviceCountry),
    destination: input.destination?.trim() || undefined,
    serviceCountry: serviceCountry || undefined,
    serviceFee: Math.max(0, input.serviceFee ?? input.balance ?? 0),
    balance: Math.max(0, input.balance ?? input.serviceFee ?? 0),
    assignedTo: input.assignedTo?.trim() || undefined,
    departureDate: input.departureDate || undefined,
    description: input.description?.trim() || undefined,
    createdAt,
    updatedAt: createdAt,
  }

  cases = [created, ...cases]
  syncClientFromCases(client.id)
  emit()
  return created
}

export function updateCase(
  id: string,
  patch: UpdateCaseInput,
): Case | undefined {
  let updated: Case | undefined
  const updatedAt = today()

  cases = cases.map((item) => {
    if (item.id !== id || !inActiveTenant(item)) return item
    const nextStatus = patch.status ?? item.status
    const nextStepId = patch.currentStepId ?? item.currentStepId
    updated = {
      ...item,
      ...patch,
      destination:
        patch.destination !== undefined
          ? patch.destination.trim() || undefined
          : item.destination,
      serviceCountry:
        patch.serviceCountry !== undefined
          ? patch.serviceCountry.trim() || undefined
          : item.serviceCountry,
      assignedTo:
        patch.assignedTo !== undefined
          ? patch.assignedTo.trim() || undefined
          : item.assignedTo,
      description:
        patch.description !== undefined
          ? patch.description.trim() || undefined
          : item.description,
      currentStepId: nextStepId,
      steps: patch.steps ?? item.steps,
      documents: patch.documents ?? item.documents,
      stage: deriveStageFromStep(
        item.service,
        nextStepId,
        nextStatus,
        patch.serviceCountry !== undefined
          ? patch.serviceCountry.trim() || undefined
          : item.serviceCountry,
      ),
      updatedAt,
    }
    updated.documents = syncDocumentsWithProgress(updated)
    return updated
  })

  if (updated) {
    syncClientFromCases(updated.clientId)
    emit()
  }
  return updated
}

export type CompleteStepResult =
  | { ok: true; case: Case }
  | { ok: false; errors: Record<string, string> }

function applyUploadsToDocuments(
  documents: CaseDocument[],
  uploadDefs: StepUploadDef[],
  uploads: StepCompletionInput['uploads'],
): CaseDocument[] {
  let next = documents.map((doc) => ({ ...doc }))
  for (const uploadDef of uploadDefs) {
    const uploaded = uploads.find((itemUpload) => itemUpload.key === uploadDef.key)
    if (!uploaded?.fileName.trim() || !uploadDef.documentId) continue
    next = next.map((doc) =>
      doc.id === uploadDef.documentId
        ? {
            ...doc,
            status:
              doc.status === 'approved'
                ? ('approved' as CaseDocumentStatus)
                : ('under_review' as CaseDocumentStatus),
            detail: uploaded.fileName,
            fileName: uploaded.fileName,
            fileId: uploaded.fileId ?? doc.fileId,
            mimeType: uploaded.mimeType ?? doc.mimeType,
          }
        : doc,
    )
  }
  return next
}

/**
 * Update a completed (or in-progress) step’s saved fields/uploads without advancing.
 */
export function updateCaseStep(
  id: string,
  stepId: string,
  input: StepCompletionInput,
): CompleteStepResult {
  const item = getCaseById(id)
  if (!item || item.status === 'Cancelled') {
    return { ok: false, errors: { form: 'This case cannot be updated.' } }
  }

  const requirement = getStepRequirement(item.service, stepId)
  if (!requirement) {
    return {
      ok: false,
      errors: { form: 'No requirements defined for this step.' },
    }
  }

  const validation = validateStepCompletion(requirement, input)
  if (!validation.ok) return validation

  const existing = item.steps[stepId]
  if (!existing?.completedAt && stepId !== item.currentStepId) {
    return {
      ok: false,
      errors: { form: 'This step has not been started yet.' },
    }
  }

  const documents = applyUploadsToDocuments(
    item.documents,
    requirement.uploads,
    input.uploads,
  )
  const summary = summarizeStepCompletion(requirement, input)
  const steps = {
    ...item.steps,
    [stepId]: {
      ...existing,
      completedAt: existing?.completedAt ?? null,
      detail: summary,
      fields: { ...input.fields },
      uploads: input.uploads.map((upload) => ({ ...upload })),
    },
  }

  const departureFromFields =
    input.fields.departureDate ||
    input.fields.departedOn ||
    input.fields.travelledOn ||
    input.fields.departureConfirmedOn

  const updated = updateCase(id, {
    steps,
    documents,
    departureDate: departureFromFields || item.departureDate,
  })

  return updated
    ? { ok: true, case: updated }
    : { ok: false, errors: { form: 'Could not update step.' } }
}

/**
 * Save required fields/uploads for the current step, then advance.
 * Steps cannot be skipped — each stage needs its data first.
 */
export function completeCurrentStep(
  id: string,
  input: StepCompletionInput,
): CompleteStepResult {
  const item = getCaseById(id)
  if (!item || item.status === 'Cancelled') {
    return { ok: false, errors: { form: 'This case cannot be updated.' } }
  }
  if (item.status === 'Completed') {
    return { ok: false, errors: { form: 'This case is already completed.' } }
  }

  const requirement = getStepRequirement(item.service, item.currentStepId)
  if (!requirement) {
    return {
      ok: false,
      errors: { form: 'No requirements defined for this step.' },
    }
  }

  const validation = validateStepCompletion(requirement, input)
  if (!validation.ok) {
    return validation
  }

  const completedAt = today()
  const currentId = item.currentStepId
  const summary = summarizeStepCompletion(requirement, input)

  const documents = applyUploadsToDocuments(
    item.documents,
    requirement.uploads,
    input.uploads,
  )

  const steps = {
    ...item.steps,
    [currentId]: {
      completedAt,
      detail: summary,
      fields: { ...input.fields },
      uploads: input.uploads.map((upload) => ({ ...upload })),
    },
  }

  // Sync departure date from common field keys when present.
  const departureFromFields =
    input.fields.departureDate ||
    input.fields.departedOn ||
    input.fields.travelledOn ||
    input.fields.departureConfirmedOn

  if (isLastStep(item)) {
    const updated = updateCase(id, {
      steps,
      documents,
      status: 'Completed',
      currentStepId: currentId,
      departureDate: departureFromFields || item.departureDate,
    })
    return updated
      ? { ok: true, case: updated }
      : { ok: false, errors: { form: 'Could not complete step.' } }
  }

  const next = getNextStepDef(item)
  if (!next) {
    const updated = updateCase(id, {
      steps,
      documents,
      status: 'Completed',
      departureDate: departureFromFields || item.departureDate,
    })
    return updated
      ? { ok: true, case: updated }
      : { ok: false, errors: { form: 'Could not complete step.' } }
  }

  steps[next.id] = {
    completedAt: null,
    detail: 'Waiting for required information',
  }

  const updated = updateCase(id, {
    steps,
    documents,
    currentStepId: next.id,
    status: item.status === 'Pending' ? 'In-Progress' : item.status,
    departureDate: departureFromFields || item.departureDate,
  })

  return updated
    ? { ok: true, case: updated }
    : { ok: false, errors: { form: 'Could not complete step.' } }
}

export type RecordCaseDocumentInput = {
  fields: Record<string, string>
  detail: string
  expiry: string | null
  fileName?: string
  fileId?: string
  mimeType?: string
}

function applyRecordedDocument(
  item: Case,
  documentId: string,
  input: RecordCaseDocumentInput,
  skipUnlock = false,
): Pick<Case, 'documents' | 'steps'> | undefined {
  const collector = findStepForDocument(item.service, documentId)
  const unlockStepId = collector?.requirement.stepId
  if (!skipUnlock && unlockStepId) {
    const current = getStepIndex(
      item.service,
      item.currentStepId,
      item.serviceCountry,
    )
    const needed = getStepIndex(
      item.service,
      unlockStepId,
      item.serviceCountry,
    )
    if (item.status !== 'Completed' && current < needed) {
      return undefined
    }
  }

  const marker =
    input.fileName?.trim() ||
    input.fields.number?.trim() ||
    input.fields.reference?.trim() ||
    input.detail

  const documents = item.documents.map((doc) =>
    doc.id === documentId
      ? {
          ...doc,
          status: 'under_review' as CaseDocumentStatus,
          detail: input.detail,
          expiry: input.expiry,
          fields: { ...input.fields },
          fileName: input.fileName?.trim() || undefined,
          fileId: input.fileId ?? doc.fileId,
          mimeType: input.mimeType ?? doc.mimeType,
        }
      : doc,
  )

  let steps = item.steps
  if (collector) {
    const stepId = collector.requirement.stepId
    const record = steps[stepId] ?? { completedAt: null }
    const uploads = [
      ...(record.uploads ?? []).filter(
        (file) => file.key !== collector.uploadKey,
      ),
      {
        key: collector.uploadKey,
        fileName: marker,
        fileId: input.fileId,
        mimeType: input.mimeType,
      },
    ]
    const mergedFields = {
      ...(record.fields ?? {}),
      ...input.fields,
    }
    steps = {
      ...steps,
      [stepId]: {
        ...record,
        uploads,
        fields: mergedFields,
        detail: record.detail,
      },
    }
  }

  return { documents, steps }
}

function syncIdentityFieldsToClient(
  clientId: string,
  documentId: string,
  input: RecordCaseDocumentInput,
) {
  const form = getDocumentForm(documentId)
  if (!form.syncToClient) return
  const clientPatch: {
    passport?: string
    nid?: string
    passportExpiry?: string
  } = {}
  if (form.syncToClient.passport) {
    const value = input.fields[form.syncToClient.passport]?.trim()
    if (value) clientPatch.passport = value
    const expiry = input.expiry?.trim() || input.fields.expiry?.trim()
    if (expiry) clientPatch.passportExpiry = expiry
  }
  if (form.syncToClient.nid) {
    const value = input.fields[form.syncToClient.nid]?.trim()
    if (value) clientPatch.nid = value
  }
  if (Object.keys(clientPatch).length > 0) {
    updateClient(clientId, clientPatch)
  }
}

/**
 * Record essential document details from the Documents modal.
 * Syncs into Progress step upload records and client identity when relevant.
 */
export function recordCaseDocument(
  caseId: string,
  documentId: string,
  input: RecordCaseDocumentInput,
): Case | undefined {
  const item = getCaseById(caseId)
  if (!item || item.status === 'Cancelled') return undefined

  const applied = applyRecordedDocument(item, documentId, input)
  if (!applied) return undefined

  syncIdentityFieldsToClient(item.clientId, documentId, input)
  return updateCase(caseId, applied)
}

/** Identity papers live on the client and copy onto every open service. */
export function recordIdentityDocument(
  clientId: string,
  kind: IdentityKind,
  input: RecordCaseDocumentInput,
): void {
  const client = getClientById(clientId)
  if (!client) return

  const number = input.fields.number?.trim()
  const expiry = input.expiry?.trim() || input.fields.expiry?.trim()
  const scan =
    input.fileId || input.fileName?.trim()
      ? {
          fileId: input.fileId ?? `${kind}-${clientId}`,
          fileName: input.fileName?.trim() || 'Scan',
          mimeType: input.mimeType,
        }
      : undefined

  if (kind === 'passport') {
    updateClient(clientId, {
      ...(number ? { passport: number } : {}),
      ...(expiry ? { passportExpiry: expiry } : {}),
      ...(scan ? { passportFile: scan } : {}),
    })
  } else {
    updateClient(clientId, {
      ...(number ? { nid: number } : {}),
      ...(scan ? { nidFile: scan } : {}),
    })
  }

  for (const item of getCasesByClientId(clientId)) {
    if (item.status === 'Cancelled') continue
    let working: Case = item
    let changed = false
    for (const doc of item.documents) {
      if (identityKindForDocumentId(doc.id) !== kind) continue
      const applied = applyRecordedDocument(working, doc.id, input, true)
      if (!applied) continue
      working = { ...working, ...applied }
      changed = true
    }
    if (changed) {
      updateCase(item.id, {
        documents: working.documents,
        steps: working.steps,
      })
    }
  }
}

/** @deprecated Use recordCaseDocument — kept for older call sites/tests. */
export function uploadCaseDocument(
  caseId: string,
  documentId: string,
  fileName: string,
): Case | undefined {
  return recordCaseDocument(caseId, documentId, {
    fields: { reference: fileName },
    detail: fileName,
    expiry: null,
    fileName,
  })
}

export function renameServiceOnCases(
  from: ServiceType,
  to: ServiceType,
): number {
  if (from === to) return 0
  let changed = 0
  cases = cases.map((item) => {
    if (!inActiveTenant(item) || item.service !== from) return item
    changed += 1
    return { ...item, service: to, updatedAt: today() }
  })
  if (changed) emit()
  return changed
}

export const CASE_STATUS_OPTIONS: { value: CaseStatus; label: string }[] = [
  { value: 'Pending', label: 'Pending' },
  { value: 'In-Progress', label: 'In progress' },
  { value: 'On-Hold', label: 'On hold' },
  { value: 'Completed', label: 'Completed' },
  { value: 'Cancelled', label: 'Cancelled' },
]

export { getEnabledServiceOptions }

export const CASE_SERVICE_OPTIONS = BUILTIN_SERVICE_OPTIONS
