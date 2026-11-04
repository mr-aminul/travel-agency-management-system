import { templateCountry } from '@/lib/caseChecklist'
import {
  findStepForDocument,
  getStepRequirement,
  type StepCompletionInput,
  type StepFieldDef,
  type StepRequirement,
  type StepUploadDef,
  type StepUploadValue,
} from '@/lib/caseStepRequirements'
import { resolveServiceTemplate } from '@/lib/resolveServiceTemplate'
import {
  decisionFieldKey,
  stepDecisionsSkipDocuments,
} from '@/lib/stepDecisions'
import type { Case, ServiceType } from '@/types/case'

function catalogUploadKey(documentId: string) {
  return `doc:${documentId}`
}

function requiredDocumentIdsForStep(
  service: ServiceType,
  stepId: string,
  country?: string,
): { documentId: string; name: string; required: boolean }[] {
  const template = resolveServiceTemplate(service, country)
  const step = template.steps.find((item) => item.id === stepId)
  const ids =
    step?.requiredDocumentIds?.length
      ? step.requiredDocumentIds
      : template.documents
          .filter((doc) => doc.unlockStepId === stepId)
          .map((doc) => doc.id)

  return ids
    .map((documentId) => {
      const doc =
        template.documents.find((item) => item.id === documentId) ??
        undefined
      return doc
        ? {
            documentId: doc.id,
            name: doc.name,
            // Catalog Required switch only — attached ≠ required.
            required: doc.required === true,
          }
        : null
    })
    .filter(
      (
        item,
      ): item is { documentId: string; name: string; required: boolean } =>
        item != null,
    )
}

/** Step form/rules including catalog fields / docs / decisions. */
export function getCaseStepRequirement(
  item: Case,
  stepId: string,
  fieldAnswers?: Record<string, string>,
): StepRequirement {
  const base = getStepRequirement(item.service, stepId)
  const country = templateCountry(item)
  const template = resolveServiceTemplate(item.service, country)
  const step = template.steps.find((entry) => entry.id === stepId)
  const needed = requiredDocumentIdsForStep(item.service, stepId, country)
  // Saved Service catalog flow → only what the agency configured (no builtin Employer/date).
  const catalogOnly = template.hasCatalogOverride

  const decisionFields: StepFieldDef[] = (step?.decisions ?? []).map(
    (decision) => ({
      key: decisionFieldKey(decision.key),
      label: decision.label,
      type: 'select' as const,
      required: true,
      options: decision.options.map((option) => option.value),
    }),
  )

  const catalogFields: StepFieldDef[] = (step?.fields ?? []).map((field) => ({
    key: field.key,
    label: field.label,
    type: field.type,
    required: field.required === true,
    placeholder: field.placeholder,
    options: field.options,
  }))

  const fields = catalogOnly
    ? [...decisionFields, ...catalogFields]
    : [...decisionFields, ...base.fields]

  const help = catalogOnly
    ? step
      ? `Complete “${step.label || stepId}”.`
      : 'Complete this step.'
    : base.help

  if (catalogOnly) {
    const uploads: StepUploadDef[] = needed.map((doc) => ({
      key: catalogUploadKey(doc.documentId),
      label: doc.name,
      required: doc.required,
      documentId: doc.documentId,
    }))
    return applyDecisionSkipToRequirement(
      { stepId, help, fields, uploads },
      stepDecisionsSkipDocuments(step, fieldAnswers),
    )
  }

  if (needed.length === 0) {
    return applyDecisionSkipToRequirement(
      { ...base, help, fields },
      stepDecisionsSkipDocuments(step, fieldAnswers),
    )
  }

  const covered = new Set(
    base.uploads
      .map((upload) => upload.documentId)
      .filter((id): id is string => Boolean(id)),
  )

  const uploads: StepUploadDef[] = base.uploads.map((upload) => {
    const match = needed.find((entry) => entry.documentId === upload.documentId)
    // Only block complete when the catalog doc is marked Required.
    return match ? { ...upload, required: match.required } : upload
  })

  for (const doc of needed) {
    if (covered.has(doc.documentId)) continue
    uploads.push({
      key: catalogUploadKey(doc.documentId),
      label: doc.name,
      required: doc.required,
      documentId: doc.documentId,
    })
  }

  return applyDecisionSkipToRequirement(
    { ...base, help, fields, uploads },
    stepDecisionsSkipDocuments(step, fieldAnswers),
  )
}

/**
 * Soften document uploads when a step decision says skip documents
 * (e.g. Finger = No → complete without uploads).
 */
export function applyDecisionSkipToRequirement(
  requirement: StepRequirement,
  skipDocuments: boolean,
): StepRequirement {
  if (!skipDocuments) return requirement
  return {
    ...requirement,
    uploads: requirement.uploads.map((upload) =>
      upload.documentId ? { ...upload, required: false } : upload,
    ),
  }
}

/** Which progress step collects this catalog document (hardcoded or Needs docs). */
export function findCaseStepForDocument(
  item: Case,
  documentId: string,
): { requirement: StepRequirement; uploadKey: string } | undefined {
  const hardcoded = findStepForDocument(item.service, documentId)
  if (hardcoded) return hardcoded

  const country = templateCountry(item)
  const template = resolveServiceTemplate(item.service, country)
  const step = template.steps.find((itemStep) =>
    (itemStep.requiredDocumentIds ?? []).includes(documentId),
  )
  const unlockStepId =
    step?.id ??
    template.documents.find((doc) => doc.id === documentId)?.unlockStepId
  if (!unlockStepId) return undefined

  const requirement = getCaseStepRequirement(item, unlockStepId)
  const upload = requirement.uploads.find(
    (itemUpload) => itemUpload.documentId === documentId,
  )
  if (!upload) return undefined
  return { requirement, uploadKey: upload.key }
}

/** Fill missing required doc uploads from files already on the case. */
export function hydrateStepUploadsFromCase(
  item: Case,
  requirement: StepRequirement,
  input: StepCompletionInput,
): StepCompletionInput {
  const uploads: StepUploadValue[] = [...input.uploads]
  // Keys already in the payload (even with empty fileName) were intentional —
  // empty means the staff removed the file; do not refill from the case.
  const keyed = new Set(uploads.map((entry) => entry.key))

  for (const upload of requirement.uploads) {
    if (!upload.documentId) continue
    if (keyed.has(upload.key)) continue
    const doc = item.documents.find((entry) => entry.id === upload.documentId)
    if (!doc) continue
    const onFile =
      Boolean(doc.fileName?.trim()) ||
      doc.status === 'approved' ||
      doc.status === 'under_review'
    if (!onFile) continue
    uploads.push({
      key: upload.key,
      fileName: doc.fileName?.trim() || doc.detail || doc.name,
      fileId: doc.fileId,
      mimeType: doc.mimeType,
    })
  }

  return { fields: input.fields, uploads }
}

export function splitStepUploads(requirement: StepRequirement): {
  requiredDocs: StepUploadDef[]
  attachments: StepUploadDef[]
} {
  return {
    requiredDocs: requirement.uploads.filter((upload) => Boolean(upload.documentId)),
    attachments: requirement.uploads.filter((upload) => !upload.documentId),
  }
}
