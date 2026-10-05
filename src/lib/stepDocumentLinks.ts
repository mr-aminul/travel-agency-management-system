import type { ServiceDocumentConfig, ServiceStepConfig } from '@/types/serviceTemplate'

/** Build step → document ids from each document’s unlock step. */
export function requiredDocumentIdsByStep(
  documents: ServiceDocumentConfig[],
): Map<string, string[]> {
  const byStep = new Map<string, string[]>()
  for (const doc of documents) {
    const stepId = doc.unlockStepId?.trim()
    if (!stepId) continue
    const list = byStep.get(stepId) ?? []
    if (!list.includes(doc.id)) list.push(doc.id)
    byStep.set(stepId, list)
  }
  return byStep
}

/** Attach Needs docs on steps when missing, using document unlock links. */
export function withRequiredDocumentIds(
  steps: ServiceStepConfig[],
  documents: ServiceDocumentConfig[],
): ServiceStepConfig[] {
  const hasConfigured = steps.some(
    (step) => (step.requiredDocumentIds?.length ?? 0) > 0,
  )
  if (hasConfigured) {
    return steps.map((step) => ({
      ...step,
      requiredDocumentIds: [
        ...(step.requiredDocumentIds ?? []).filter((id) =>
          documents.some((doc) => doc.id === id),
        ),
      ],
    }))
  }

  const byStep = requiredDocumentIdsByStep(documents)
  return steps.map((step) => ({
    ...step,
    requiredDocumentIds: byStep.get(step.id) ?? [],
  }))
}

/**
 * Keep document unlockStepId in sync with step Needs docs.
 * A document belongs to at most one status step.
 */
export function syncDocumentUnlockSteps(
  steps: ServiceStepConfig[],
  documents: ServiceDocumentConfig[],
): {
  steps: ServiceStepConfig[]
  documents: ServiceDocumentConfig[]
} {
  const docIds = new Set(documents.map((doc) => doc.id))
  const unlockByDoc = new Map<string, string>()

  const nextSteps = steps.map((step) => {
    const requiredDocumentIds = [
      ...new Set(
        (step.requiredDocumentIds ?? []).filter((id) => docIds.has(id)),
      ),
    ]
    for (const docId of requiredDocumentIds) {
      unlockByDoc.set(docId, step.id)
    }
    return { ...step, requiredDocumentIds }
  })

  const nextDocuments = documents.map((doc) => {
    const unlockStepId = unlockByDoc.get(doc.id)
    return {
      id: doc.id,
      name: doc.name,
      required: doc.required,
      ...(unlockStepId ? { unlockStepId } : {}),
    }
  })

  return { steps: nextSteps, documents: nextDocuments }
}

export function toggleStepRequiredDocument(
  steps: ServiceStepConfig[],
  stepId: string,
  documentId: string,
): ServiceStepConfig[] {
  return steps.map((step) => {
    const current = step.requiredDocumentIds ?? []
    if (step.id === stepId) {
      const has = current.includes(documentId)
      return {
        ...step,
        requiredDocumentIds: has
          ? current.filter((id) => id !== documentId)
          : [...current, documentId],
      }
    }
    // One status owns a document.
    if (current.includes(documentId)) {
      return {
        ...step,
        requiredDocumentIds: current.filter((id) => id !== documentId),
      }
    }
    return step
  })
}
