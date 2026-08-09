import { useSyncExternalStore } from 'react'
import {
  buildInitialSteps,
  buildProgressAtStep,
  deriveStageFromStep,
  getNextStepDef,
  isLastStep,
} from '@/lib/caseChecklist'
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
import { getClientById, updateClient } from '@/lib/clientsStore'
import type {
  Case,
  CaseDocument,
  CaseDocumentStatus,
  CaseStatus,
  CaseVertical,
  CreateCaseInput,
  UpdateCaseInput,
} from '@/types/case'
import type { ServiceType } from '@/types/client'

type Listener = () => void

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function seedCase(
  partial: Omit<Case, 'currentStepId' | 'steps' | 'documents' | 'stage'> & {
    currentStepId: string
    stepDetails?: Record<string, string>
    documentOverrides?: Partial<Record<string, Partial<CaseDocument>>>
  },
): Case {
  const client = getClientById(partial.clientId)
  const progress = buildProgressAtStep(
    partial.vertical,
    partial.currentStepId,
    partial.createdAt,
    partial.stepDetails,
  )
  const documents = withSeedDocumentStatuses(
    buildCaseDocuments(partial.vertical, client),
    partial.documentOverrides ?? {},
  )
  const stage = deriveStageFromStep(
    partial.vertical,
    progress.currentStepId,
    partial.status,
  )
  const drafted: Case = {
    ...partial,
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
    caseId: 'CASE-00101',
    title: 'Saudi manpower — Al Rajhi Hospital',
    clientId: 'c-284',
    clientName: 'Md. Rahim Uddin',
    vertical: 'Manpower',
    status: 'In-Progress',
    currentStepId: 'medical',
    destination: 'Riyadh, Saudi Arabia',
    balance: 35000,
    assignedTo: 'Karim Ahmed',
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
    caseId: 'CASE-00102',
    title: 'Dhaka–Jeddah ticketing',
    clientId: 'c-284',
    clientName: 'Md. Rahim Uddin',
    vertical: 'Ticketing',
    status: 'Pending',
    currentStepId: 'request',
    destination: 'Jeddah, Saudi Arabia',
    balance: 10000,
    assignedTo: 'Sadia Rahman',
    departureDate: '2026-09-12',
    description:
      'One-way economy ticket aligned with manpower deployment date.',
    createdAt: '2026-07-28',
    updatedAt: '2026-07-28',
  }),
  seedCase({
    id: 'case-103',
    caseId: 'CASE-00103',
    title: 'Canada student — Concordia University',
    clientId: 'c-291',
    clientName: 'Farhana Akter',
    vertical: 'Student',
    status: 'In-Progress',
    currentStepId: 'visa',
    destination: 'Montreal, Canada',
    balance: 120000,
    assignedTo: 'Nabila Chowdhury',
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
    caseId: 'CASE-00104',
    title: 'Hajj 2026 — Nusrat Jahan',
    clientId: 'c-315',
    clientName: 'Nusrat Jahan',
    vertical: 'Hajj/Umrah',
    status: 'In-Progress',
    currentStepId: 'package',
    destination: 'Makkah, Saudi Arabia',
    balance: 85000,
    assignedTo: 'Imtiaz Hasan',
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
    caseId: 'CASE-00105',
    title: 'Cox’s Bazar leisure package',
    clientId: 'c-328',
    clientName: 'Imran Hossain',
    vertical: 'Leisure',
    status: 'Pending',
    currentStepId: 'enquiry',
    destination: 'Cox’s Bazar, Bangladesh',
    balance: 22000,
    assignedTo: 'Sadia Rahman',
    departureDate: '2026-08-22',
    description:
      '3N/4D family package for 4 guests. Quote shared; awaiting deposit.',
    createdAt: '2026-03-01',
    updatedAt: '2026-03-05',
  }),
  seedCase({
    id: 'case-106',
    caseId: 'CASE-00106',
    title: 'Malaysia factory — deployed',
    clientId: 'c-302',
    clientName: 'Jamal Haque',
    vertical: 'Manpower',
    status: 'Completed',
    currentStepId: 'departed',
    destination: 'Penang, Malaysia',
    balance: 0,
    assignedTo: 'Karim Ahmed',
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

function nextCaseId(): string {
  const max = cases.reduce((highest, item) => {
    const numeric = Number(item.caseId.replace(/\D/g, ''))
    return Number.isFinite(numeric) ? Math.max(highest, numeric) : highest
  }, 0)
  return `CASE-${String(max + 1).padStart(5, '0')}`
}

function isActiveStatus(status: CaseStatus): boolean {
  return status !== 'Completed' && status !== 'Cancelled'
}

function syncClientFromCases(clientId: string) {
  const client = getClientById(clientId)
  if (!client) return

  const clientCases = cases.filter((item) => item.clientId === clientId)
  const activeCases = clientCases.filter((item) =>
    isActiveStatus(item.status),
  ).length
  const balance = clientCases
    .filter((item) => isActiveStatus(item.status))
    .reduce((sum, item) => sum + item.balance, 0)
  const services = Array.from(
    new Set([
      ...client.services,
      ...clientCases.map((item) => item.vertical as ServiceType),
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
        item.vertical === 'Manpower' && item.status === 'Completed',
    )
    status = hasManpowerDeployed ? 'Deployed' : client.status === 'Lead' ? 'Lead' : 'Active'
  }

  updateClient(clientId, { activeCases, services, balance, status })
}

/** Recompute derived client fields for every client touched by seed. */
function syncAllSeedClients() {
  const ids = new Set(cases.map((item) => item.clientId))
  ids.forEach((id) => syncClientFromCases(id))
}

syncAllSeedClients()

export function useCases(): Case[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

export function useCasesByClientId(clientId: string): Case[] {
  return useCases().filter((item) => item.clientId === clientId)
}

export function getCaseById(id: string): Case | undefined {
  return cases.find((item) => item.id === id)
}

export function getCasesByClientId(clientId: string): Case[] {
  return cases.filter((item) => item.clientId === clientId)
}

export function getCasesByVertical(vertical: CaseVertical): Case[] {
  return cases.filter((item) => item.vertical === vertical)
}

export function createCase(input: CreateCaseInput): Case {
  const client = getClientById(input.clientId)
  if (!client) {
    throw new Error('Client not found for new case.')
  }

  const createdAt = today()
  const progress = buildInitialSteps(input.vertical, createdAt)
  const status = input.status ?? 'Pending'
  const created: Case = {
    id: `case-${Date.now().toString(36)}`,
    caseId: nextCaseId(),
    title: input.title.trim(),
    clientId: client.id,
    clientName: client.name,
    vertical: input.vertical,
    status,
    stage: deriveStageFromStep(input.vertical, progress.currentStepId, status),
    currentStepId: progress.currentStepId,
    steps: progress.steps,
    documents: buildCaseDocuments(input.vertical, client),
    destination: input.destination?.trim() || undefined,
    balance: input.balance ?? 0,
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
    if (item.id !== id) return item
    const nextStatus = patch.status ?? item.status
    const nextStepId = patch.currentStepId ?? item.currentStepId
    updated = {
      ...item,
      ...patch,
      title: patch.title?.trim() ?? item.title,
      destination:
        patch.destination !== undefined
          ? patch.destination.trim() || undefined
          : item.destination,
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
      stage: deriveStageFromStep(item.vertical, nextStepId, nextStatus),
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

  const requirement = getStepRequirement(item.vertical, stepId)
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

  const requirement = getStepRequirement(item.vertical, item.currentStepId)
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

  const collector = findStepForDocument(item.vertical, documentId)
  const unlockStepId = collector?.requirement.stepId
  if (unlockStepId) {
    const current = getStepIndex(item.vertical, item.currentStepId)
    const needed = getStepIndex(item.vertical, unlockStepId)
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

  const form = getDocumentForm(documentId)
  if (form.syncToClient) {
    const clientPatch: { passport?: string; nid?: string } = {}
    if (form.syncToClient.passport) {
      const value = input.fields[form.syncToClient.passport]?.trim()
      if (value) clientPatch.passport = value
    }
    if (form.syncToClient.nid) {
      const value = input.fields[form.syncToClient.nid]?.trim()
      if (value) clientPatch.nid = value
    }
    if (Object.keys(clientPatch).length > 0) {
      updateClient(item.clientId, clientPatch)
    }
  }

  return updateCase(caseId, { documents, steps })
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

export const CASE_STATUS_OPTIONS: { value: CaseStatus; label: string }[] = [
  { value: 'Pending', label: 'Pending' },
  { value: 'In-Progress', label: 'In progress' },
  { value: 'On-Hold', label: 'On hold' },
  { value: 'Completed', label: 'Completed' },
  { value: 'Cancelled', label: 'Cancelled' },
]

export const CASE_VERTICAL_OPTIONS: { value: CaseVertical; label: string }[] = [
  { value: 'Manpower', label: 'Manpower' },
  { value: 'Student', label: 'Student' },
  { value: 'Hajj/Umrah', label: 'Hajj / Umrah' },
  { value: 'Leisure', label: 'Leisure' },
  { value: 'Ticketing', label: 'Ticketing' },
]
