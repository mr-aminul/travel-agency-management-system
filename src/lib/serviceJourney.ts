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
  if (item.steps[stepId]?.completedAt) return true
  if (usingCustomDefs) return currentIndex >= 0 && index < currentIndex
  return isPipelineStepComplete(item, stepId)
}

export function buildServiceJourney(
  item: Case,
  options?: { interactive?: boolean; stepDefs?: JourneyStepDefInput[] },
): ServiceJourneyView {
  const interactive = options?.interactive ?? false
  const usingCustomDefs = Boolean(options?.stepDefs?.length)
  const defs = resolveDefs(item, options?.stepDefs)
  const currentIndex = defs.findIndex((def) => def.id === item.currentStepId)

  const steps = defs.map((def, index) => {
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

  const completedCount = steps.filter((step) => step.state === 'done').length
  const totalCount = steps.length
  const progressPercent =
    totalCount > 0 ? (completedCount / totalCount) * 100 : 0
  const stageNumber =
    currentIndex >= 0
      ? Math.min(currentIndex + 1, totalCount)
      : Math.min(completedCount, totalCount)

  return {
    steps,
    completedCount,
    totalCount,
    progressPercent,
    stageLabel: `Stage ${stageNumber} of ${totalCount}`,
  }
}
