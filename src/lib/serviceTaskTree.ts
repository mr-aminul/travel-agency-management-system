import {
  getCaseComplianceDocuments,
  type ComplianceDocument,
} from '@/lib/caseDocuments'
import {
  documentHasFile,
  identityKindForDocumentId,
  isIdentityCaseDocument,
} from '@/lib/clientDocuments'
import { buildServiceJourney } from '@/lib/serviceJourney'
import type { Case } from '@/types/case'

export type ServiceTreeCondition = {
  id: string
  title: string
  done: boolean
  locked: boolean
  required: boolean
  statusLabel: string
  document: ComplianceDocument
  isIdentity: boolean
  identityKind: 'passport' | 'nid' | null
}

export type ServiceTreeStage = {
  id: string
  label: string
  state: 'done' | 'current' | 'upcoming'
  dateLabel: string
  note: string | null
  conditions: ServiceTreeCondition[]
  conditionsDone: number
  conditionsTotal: number
  requiredOpen: number
}

export type ServiceTaskTree = {
  stages: ServiceTreeStage[]
  completedCount: number
  totalCount: number
  progressPercent: number
  stageLabel: string
}

function conditionMeta(doc: ComplianceDocument): {
  done: boolean
  statusLabel: string
} {
  if (doc.locked) return { done: false, statusLabel: 'Later' }
  // Uploaded/saved is done — checkmark is enough; no status chip.
  if (
    doc.status === 'approved' ||
    doc.status === 'under_review' ||
    documentHasFile(doc)
  ) {
    return { done: true, statusLabel: '' }
  }
  if (!doc.required) return { done: false, statusLabel: 'Optional' }
  return { done: false, statusLabel: 'Needed' }
}

function toCondition(doc: ComplianceDocument): ServiceTreeCondition {
  const meta = conditionMeta(doc)
  return {
    id: doc.id,
    title: doc.name,
    done: meta.done,
    locked: doc.locked,
    required: doc.required === true,
    statusLabel: meta.statusLabel,
    document: doc,
    isIdentity: isIdentityCaseDocument(doc.id),
    identityKind: identityKindForDocumentId(doc.id),
  }
}

/** Attach each paper to its collecting stage; leftovers go on the first stage. */
function conditionsByStepId(
  item: Case,
  stepIds: string[],
): Map<string, ServiceTreeCondition[]> {
  const docs = getCaseComplianceDocuments(item)
  const byStep = new Map<string, ServiceTreeCondition[]>()
  for (const id of stepIds) byStep.set(id, [])

  const leftovers: ServiceTreeCondition[] = []
  for (const doc of docs) {
    const stepId = doc.sourceStepId || doc.unlockStepId
    const condition = toCondition(doc)
    if (stepId && byStep.has(stepId)) {
      byStep.get(stepId)!.push(condition)
    } else {
      leftovers.push(condition)
    }
  }

  if (leftovers.length > 0 && stepIds[0]) {
    byStep.get(stepIds[0])!.unshift(...leftovers)
  }

  return byStep
}

/**
 * Journey stages with nested document conditions for the hybrid service tree.
 * Stage state follows the existing journey; conditions are live case papers.
 */
export function buildServiceTaskTree(item: Case): ServiceTaskTree {
  const journey = buildServiceJourney(item, {
    interactive: true,
    hideUpcoming: false,
  })
  const stepIds = journey.steps.map((step) => step.id)
  const byStep = conditionsByStepId(item, stepIds)

  const stages: ServiceTreeStage[] = journey.steps.map((step) => {
    const conditions = byStep.get(step.id) ?? []
    const conditionsDone = conditions.filter((entry) => entry.done).length
    const requiredOpen = conditions.filter(
      (entry) => entry.required && !entry.done && !entry.locked,
    ).length
    return {
      id: step.id,
      label: step.label,
      state: step.state,
      dateLabel: step.dateLabel,
      note: step.note,
      conditions,
      conditionsDone,
      conditionsTotal: conditions.length,
      requiredOpen,
    }
  })

  return {
    stages,
    completedCount: journey.completedCount,
    totalCount: journey.totalCount,
    progressPercent: journey.progressPercent,
    stageLabel: journey.stageLabel,
  }
}
