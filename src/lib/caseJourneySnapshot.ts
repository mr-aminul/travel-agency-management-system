import {
  getStepDefs,
  templateCountry,
} from '@/lib/caseChecklist'
import { getDefaultDocumentConfigs } from '@/lib/caseDocuments'
import { resolveServiceTemplateOverride } from '@/lib/serviceTemplatesStore'
import type {
  Case,
  CaseJourneyDocumentSnapshot,
  CaseJourneySnapshot,
  CaseJourneyStepSnapshot,
  ServiceType,
} from '@/types/case'

function titleFromStepId(stepId: string): string {
  const cleaned = stepId.replace(/[-_]+/g, ' ').trim()
  if (!cleaned) return stepId
  return cleaned.replace(/\b\w/g, (char) => char.toUpperCase())
}

function catalogDocuments(
  service: ServiceType,
  country?: string,
): CaseJourneyDocumentSnapshot[] {
  const exact = country
    ? resolveServiceTemplateOverride(service, country)
    : undefined
  const resolved =
    exact ?? resolveServiceTemplateOverride(service, country ?? '')
  const docs =
    resolved?.documents?.length
      ? resolved.documents
      : getDefaultDocumentConfigs(service)
  return docs.map((doc) => ({
    id: doc.id,
    name: doc.name,
    required: doc.required === true,
    unlockStepId: doc.unlockStepId,
  }))
}

/** Freeze the live Service catalog playbook for a new file. */
export function captureJourneySnapshot(
  service: ServiceType,
  country?: string,
  pinnedAt = new Date().toISOString(),
): CaseJourneySnapshot {
  const steps = getStepDefs(service, country).map((step) => ({
    id: step.id,
    label: step.label,
  }))
  return {
    pinnedAt,
    steps,
    documents: catalogDocuments(service, country),
  }
}

/**
 * Rebuild a playbook from what this file already ran.
 * Used for closed/legacy files so a later catalog edit cannot invent new history.
 */
export function inferJourneySnapshotFromCase(
  item: Case,
  pinnedAt = new Date().toISOString(),
): CaseJourneySnapshot {
  const country = templateCountry(item)
  const liveSteps = getStepDefs(item.service, country)
  const progressIds = Object.keys(item.steps ?? {})
  const progressSet = new Set(progressIds)

  const stepsFromLive = liveSteps
    .filter((step) => progressSet.has(step.id))
    .map((step) => ({ id: step.id, label: step.label }))

  const known = new Set(stepsFromLive.map((step) => step.id))
  const orphanSteps: CaseJourneyStepSnapshot[] = progressIds
    .filter((id) => !known.has(id))
    .map((id) => ({ id, label: titleFromStepId(id) }))

  // Open files with almost no progress still need a full playbook — use live.
  const steps =
    stepsFromLive.length > 0 || item.status === 'Completed'
      ? [...stepsFromLive, ...orphanSteps]
      : liveSteps.map((step) => ({ id: step.id, label: step.label }))

  const documents: CaseJourneyDocumentSnapshot[] =
    item.documents?.length > 0
      ? item.documents.map((doc) => ({
          id: doc.id,
          name: doc.name,
          required: doc.required === true,
          unlockStepId: doc.unlockStepId,
        }))
      : catalogDocuments(item.service, country)

  return {
    pinnedAt,
    steps:
      steps.length > 0
        ? steps
        : liveSteps.map((step) => ({ id: step.id, label: step.label })),
    documents,
  }
}

/**
 * Pin a journey if missing.
 * Closed files keep inferred history; open files lock today’s catalog.
 */
export function resolveCaseJourneySnapshot(item: Case): CaseJourneySnapshot {
  if (item.journey?.steps?.length) return item.journey
  if (item.status === 'Completed' || item.status === 'Cancelled') {
    return inferJourneySnapshotFromCase(item)
  }
  return captureJourneySnapshot(item.service, templateCountry(item))
}

export function caseHasPinnedJourney(
  item: Pick<Case, 'journey'>,
): item is Case & { journey: CaseJourneySnapshot } {
  return Boolean(item.journey?.steps?.length)
}
