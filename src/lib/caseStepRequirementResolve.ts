import { templateCountry } from '@/lib/caseChecklist'
import {
  findStepForDocument,
  getStepRequirement,
  type StepCompletionInput,
  type StepRequirement,
  type StepUploadDef,
  type StepUploadValue,
} from '@/lib/caseStepRequirements'
import { resolveServiceTemplate } from '@/lib/resolveServiceTemplate'
import type { Case, ServiceType } from '@/types/case'

function catalogUploadKey(documentId: string) {
  return `doc:${documentId}`
}

function requiredDocumentIdsForStep(
  service: ServiceType,
  stepId: string,
  country?: string,
): { documentId: string; name: string }[] {
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
      return doc ? { documentId: doc.id, name: doc.name } : null
    })
    .filter((item): item is { documentId: string; name: string } => item != null)
}

/** Step form/rules including catalog “Needs docs” for this file. */
export function getCaseStepRequirement(
  item: Case,
  stepId: string,
): StepRequirement {
  const base = getStepRequirement(item.service, stepId)
  const country = templateCountry(item)
  const needed = requiredDocumentIdsForStep(item.service, stepId, country)
  if (needed.length === 0) return base

  const covered = new Set(
    base.uploads
      .map((upload) => upload.documentId)
      .filter((id): id is string => Boolean(id)),
  )

  const uploads: StepUploadDef[] = base.uploads.map((upload) =>
    upload.documentId &&
    needed.some((item) => item.documentId === upload.documentId)
      ? { ...upload, required: true }
      : upload,
  )

  for (const doc of needed) {
    if (covered.has(doc.documentId)) continue
    uploads.push({
      key: catalogUploadKey(doc.documentId),
      label: doc.name,
      required: true,
      documentId: doc.documentId,
    })
  }

  return { ...base, uploads }
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

  for (const upload of requirement.uploads) {
    if (!upload.documentId) continue
    if (uploads.some((item) => item.key === upload.key && item.fileName.trim())) {
      continue
    }
    const doc = item.documents.find((item) => item.id === upload.documentId)
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
