import {
  getStepDefsForCase,
  isPipelineStepComplete,
} from '@/lib/caseChecklist'
import { formatDisplayDate } from '@/lib/formatDate'
import type { Case } from '@/types/case'

export type JourneyStepState = 'done' | 'current' | 'upcoming'

export type JourneyStepView = {
  id: string
  label: string
  number: number
  state: JourneyStepState
  dateLabel: string
  dateTime?: string
  note: string | null
}

export type ServiceJourneyView = {
  steps: JourneyStepView[]
  completedCount: number
  totalCount: number
  progressPercent: number
  stageLabel: string
}

/** Minimal step list for public track when tenant templates are not hydrated. */
export type JourneyStepDefInput = {
  id: string
  label: string
}

function completedAtFor(item: Case, stepId: string, done: boolean): string | null {
  const recorded = item.steps[stepId]?.completedAt
  if (recorded) return recorded
  if (item.status === 'Completed' && done) return item.updatedAt
  return null
}

function stepNote(
  item: Case,
  stepId: string,
  state: JourneyStepState,
  interactive: boolean,
): string | null {
  const record = item.steps[stepId]
  const detail = record?.detail?.trim()
  if (detail) return detail
  if (!interactive) return null
  if (state === 'current') return 'Tap to complete'
  const file = record?.uploads?.find((upload) => upload.fileName)?.fileName
  return file ?? null
}

function dateFor(
  completedAt: string | null,
  state: JourneyStepState,
): Pick<JourneyStepView, 'dateLabel' | 'dateTime'> {
  const formatted = formatDisplayDate(completedAt, '')
  if (formatted) {
    return { dateLabel: formatted, dateTime: completedAt ?? undefined }
  }
  if (state === 'upcoming') return { dateLabel: 'Upcoming' }
  if (state === 'done') return { dateLabel: 'Completed' }
  return { dateLabel: 'Now' }
}

function resolveDefs(item: Case, stepDefs?: JourneyStepDefInput[]) {
  if (stepDefs?.length) {
    return stepDefs.map((step) => ({ id: step.id, label: step.label }))
  }
  return getStepDefsForCase(item).map((step) => ({
    id: step.id,
    label: step.label,
  }))
}

function stepIsComplete(
  item: Case,
  stepId: string,
  index: number,
  currentIndex: number,
  usingCustomDefs: boolean,
): boolean {
  if (item.status === 'Completed') return true
  // Never treat a future step as done (stale completedAt from old catalogs).
  if (currentIndex >= 0 && index > currentIndex) return false
  if (currentIndex >= 0 && index < currentIndex) return true
  if (usingCustomDefs) return false
  return isPipelineStepComplete(item, stepId)
}

export function buildServiceJourney(
  item: Case,
  options?: {
    interactive?: boolean
    stepDefs?: JourneyStepDefInput[]
    /** Staff pipeline: hide steps after the current one until Mark complete. */
    hideUpcoming?: boolean
  },
): ServiceJourneyView {
  const interactive = options?.interactive ?? false
  const hideUpcoming = options?.hideUpcoming ?? interactive
  const usingCustomDefs = Boolean(options?.stepDefs?.length)
  const defs = resolveDefs(item, options?.stepDefs)
  let currentIndex = defs.findIndex((def) => def.id === item.currentStepId)
  // Orphan currentStepId (not in catalog): treat first incomplete as current.
  if (currentIndex < 0 && item.status !== 'Completed') {
    currentIndex = defs.findIndex((def) => !item.steps[def.id]?.completedAt)
    if (currentIndex < 0) currentIndex = 0
  }

  const allSteps = defs.map((def, index) => {
    const done = stepIsComplete(
      item,
      def.id,
      index,
      currentIndex,
      usingCustomDefs,
    )
    const isCurrent =
      item.status !== 'Completed' && index === currentIndex
    const state: JourneyStepState = isCurrent
      ? 'current'
      : done
        ? 'done'
        : 'upcoming'
    const completedAt = completedAtFor(item, def.id, done)
    return {
      id: def.id,
      label: def.label,
      number: index + 1,
      state,
      note: stepNote(item, def.id, state, interactive),
      ...dateFor(completedAt, state),
    }
  })

  const steps = hideUpcoming
    ? allSteps.filter((step) => step.state !== 'upcoming')
    : allSteps

  const completedCount = allSteps.filter((step) => step.state === 'done').length
  const totalCount = defs.length
  const progressPercent =
    totalCount > 0 ? (completedCount / totalCount) * 100 : 0
  const stageNumber =
    item.status === 'Completed'
      ? totalCount
      : currentIndex >= 0
        ? Math.min(currentIndex + 1, totalCount)
        : Math.min(completedCount + 1, totalCount)

  return {
    steps,
    completedCount,
    totalCount,
    progressPercent,
    stageLabel: `Stage ${stageNumber} of ${totalCount}`,
  }
}
