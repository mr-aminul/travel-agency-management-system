import {
  deriveStageFromStep,
  getCurrentStepLabel,
  getNextStepDef,
  getStepDef,
  getStepDefsForCase,
  getStepIndex,
  templateCountry,
} from '@/lib/caseChecklist'
import { getCaseStepRequirement } from '@/lib/caseStepRequirementResolve'
import { clientProgressBlockers } from '@/lib/clientMissingInfo'
import { getClientById } from '@/lib/clientsStore'
import { stageFlow, type StageFlowRow } from '@/lib/dashboardOperations'
import { workDetailPath } from '@/lib/workPaths'
import type { Case, CaseStage, ServiceType } from '@/types/case'

/** Preferred column order across service templates (unknown ids sort last). */
const STEP_ORDER = [
  'registered',
  'intake',
  'enquiry',
  'request',
  'shortlisted',
  'counselled',
  'package',
  'quote',
  'quoted',
  'interview',
  'applied',
  'confirmed',
  'selected',
  'offer',
  'medical',
  'payment',
  'visa',
  'documents',
  'clearance',
  'ticket',
  'issued',
  'delivered',
  'departed',
  'travelled',
  'closed',
  'processing',
] as const

const STATE_RANK: Record<ServiceBoardState, number> = {
  blocked: 0,
  actionable: 1,
  'on-hold': 2,
}

export type ServiceBoardState = 'actionable' | 'blocked' | 'on-hold'

/** Where to send staff when they act on a service board signal. */
export type ServiceBoardFocus = 'profile' | 'documents' | 'status' | 'pipeline'

export type ServiceBoardItem = {
  id: string
  caseId: string
  clientId: string
  clientName: string
  service: ServiceType
  destination: string
  stepId: string
  stepLabel: string
  stage: CaseStage
  status: Case['status']
  state: ServiceBoardState
  focus: ServiceBoardFocus
  /** What staff should do on this file right now. */
  action: string
  /** Label of the step that follows once the current one is done. */
  nextStepLabel: string | null
  /** 1-based position of the current step. */
  stepNumber: number
  /** Total steps in this service journey. */
  stepCount: number
  /** Days spent on the current step. */
  daysWaiting: number
  /** Days until departure; negative if overdue. Null when unknown. */
  departureDays: number | null
  missingDocs: number
  href: string
  updatedAt: string
}

export type ServiceBoardColumn = {
  stepId: string
  label: string
  stage: CaseStage
  count: number
  actionable: number
  blocked: number
  onHold: number
  items: ServiceBoardItem[]
}

export type ServiceBoard = {
  openCount: number
  actionableCount: number
  blockedCount: number
  onHoldCount: number
  stageRows: StageFlowRow[]
  columns: ServiceBoardColumn[]
}

export type ServiceBoardQueue = {
  openCount: number
  items: ServiceBoardItem[]
}

export type ServiceBoardFilters = {
  /** Limit to one or more service types. Empty = all. */
  services?: ServiceType[]
  /** Limit to coarse journey stages. Empty = all. */
  stages?: CaseStage[]
  /** Limit to service board state. Empty = all. */
  states?: ServiceBoardState[]
  /** Limit to specific step ids (e.g. medical). Empty = all. */
  stepIds?: string[]
}

function isOpenCase(item: Case): boolean {
  return item.status !== 'Completed' && item.status !== 'Cancelled'
}

function stepSortIndex(stepId: string): number {
  const index = (STEP_ORDER as readonly string[]).indexOf(stepId)
  return index < 0 ? STEP_ORDER.length : index
}

function utcDay(year: number, month: number, day: number): number {
  return Date.UTC(year, month - 1, day)
}

function parseUtcDay(iso: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso.trim())
  if (!match) return null
  return utcDay(Number(match[1]), Number(match[2]), Number(match[3]))
}

function daysBetween(fromIso: string, asOf: Date): number {
  const from = parseUtcDay(fromIso)
  if (from == null) return 0
  const today = utcDay(asOf.getFullYear(), asOf.getMonth() + 1, asOf.getDate())
  return Math.max(0, Math.round((today - from) / 86_400_000))
}

function daysUntil(isoDate: string, asOf: Date): number | null {
  const target = parseUtcDay(isoDate)
  if (target == null) return null
  const today = utcDay(asOf.getFullYear(), asOf.getMonth() + 1, asOf.getDate())
  return Math.round((target - today) / 86_400_000)
}

/** When the current step became active (previous step done, else open date). */
export function currentStepStartedAt(item: Case): string {
  const country = templateCountry(item)
  const defs = getStepDefsForCase(item)
  const index = getStepIndex(item.service, item.currentStepId, country)
  if (index > 0) {
    const previous = defs[index - 1]
    const completedAt = item.steps[previous.id]?.completedAt
    if (completedAt) return completedAt
  }
  return item.createdAt || item.updatedAt
}

function countMissingRequiredDocs(item: Case): number {
  return item.documents.filter(
    (doc) => doc.required && doc.status === 'missing',
  ).length
}

function serviceBoardState(
  item: Case,
  missingDocs: number,
  profileBlocked: boolean,
): ServiceBoardState {
  if (item.status === 'On-Hold') return 'on-hold'
  if (profileBlocked || missingDocs > 0) return 'blocked'
  return 'actionable'
}

function serviceBoardFocus(
  state: ServiceBoardState,
  missingDocs: number,
  profileBlocked: boolean,
): ServiceBoardFocus {
  if (state === 'on-hold') return 'status'
  if (state === 'blocked' && profileBlocked) return 'profile'
  if (state === 'blocked' && missingDocs > 0) return 'documents'
  return 'pipeline'
}

function actionHint(
  item: Case,
  stepLabel: string,
  missingDocs: number,
  profileBlocked: boolean,
): string {
  if (item.status === 'On-Hold') return 'Resume hold and continue this step'
  if (profileBlocked) {
    return 'Add passport number on the client profile'
  }
  if (missingDocs > 0) {
    return missingDocs === 1
      ? 'Collect 1 missing required document'
      : `Collect ${missingDocs} missing required documents`
  }
  const help = getCaseStepRequirement(item, item.currentStepId).help?.trim()
  if (help) return help
  return `Complete ${stepLabel}`
}

export function toServiceBoardItem(
  item: Case,
  asOf: Date = new Date(),
): ServiceBoardItem | null {
  if (!isOpenCase(item)) return null
  const country = templateCountry(item)
  const defs = getStepDefsForCase(item)
  const index = getStepIndex(item.service, item.currentStepId, country)
  const known = getStepDef(item.service, item.currentStepId, country)
  const step = {
    id: known?.id ?? item.currentStepId,
    label: known?.label ?? getCurrentStepLabel(item),
    stage:
      known?.stage ??
      deriveStageFromStep(
        item.service,
        item.currentStepId,
        item.status,
        country,
      ),
  }
  const missingDocs = countMissingRequiredDocs(item)
  const client = getClientById(item.clientId)
  const profileBlocked = client
    ? clientProgressBlockers(client).length > 0
    : false
  const state = serviceBoardState(item, missingDocs, profileBlocked)
  const focus = serviceBoardFocus(state, missingDocs, profileBlocked)
  const next = getNextStepDef(item)
  const departureDays = item.departureDate
    ? daysUntil(item.departureDate, asOf)
    : null

  return {
    id: item.id,
    caseId: item.caseId,
    clientId: item.clientId,
    clientName: item.clientName,
    service: item.service,
    destination: item.destination?.trim() || '—',
    stepId: step.id,
    stepLabel: step.label,
    stage: step.stage,
    status: item.status,
    state,
    focus,
    action: actionHint(item, step.label, missingDocs, profileBlocked),
    nextStepLabel: next?.label ?? null,
    stepNumber: index + 1,
    stepCount: Math.max(defs.length, 1),
    daysWaiting: daysBetween(currentStepStartedAt(item), asOf),
    departureDays,
    missingDocs,
    href: workDetailPath(item),
    updatedAt: item.updatedAt,
  }
}

function matchesFilters(item: ServiceBoardItem, filters: ServiceBoardFilters): boolean {
  if (filters.services?.length && !filters.services.includes(item.service)) {
    return false
  }
  if (filters.stages?.length && !filters.stages.includes(item.stage)) {
    return false
  }
  if (filters.states?.length && !filters.states.includes(item.state)) {
    return false
  }
  if (filters.stepIds?.length && !filters.stepIds.includes(item.stepId)) {
    return false
  }
  return true
}

function majorityLabel(items: ServiceBoardItem[]): string {
  const counts = new Map<string, number>()
  for (const item of items) {
    counts.set(item.stepLabel, (counts.get(item.stepLabel) ?? 0) + 1)
  }
  let best = items[0]?.stepLabel ?? 'Step'
  let bestCount = 0
  for (const [label, count] of counts) {
    if (count > bestCount) {
      best = label
      bestCount = count
    }
  }
  return best
}

function majorityStage(items: ServiceBoardItem[]): CaseStage {
  const counts = new Map<CaseStage, number>()
  for (const item of items) {
    counts.set(item.stage, (counts.get(item.stage) ?? 0) + 1)
  }
  let best: CaseStage = items[0]?.stage ?? 'Intake'
  let bestCount = 0
  for (const [stage, count] of counts) {
    if (count > bestCount) {
      best = stage
      bestCount = count
    }
  }
  return best
}

function collectItems(
  cases: Case[],
  filters: ServiceBoardFilters,
  asOf: Date,
): ServiceBoardItem[] {
  return cases
    .filter(isOpenCase)
    .map((item) => toServiceBoardItem(item, asOf))
    .filter((item): item is ServiceBoardItem => item != null)
    .filter((item) => matchesFilters(item, filters))
}

/** Blocked and longest-waiting files first; on-hold last. */
export function compareServiceBoardQueue(
  left: ServiceBoardItem,
  right: ServiceBoardItem,
): number {
  const stateDiff = STATE_RANK[left.state] - STATE_RANK[right.state]
  if (stateDiff !== 0) return stateDiff

  const leftDeparture =
    left.departureDays == null ? Number.POSITIVE_INFINITY : left.departureDays
  const rightDeparture =
    right.departureDays == null ? Number.POSITIVE_INFINITY : right.departureDays
  if (leftDeparture !== rightDeparture) return leftDeparture - rightDeparture

  if (left.daysWaiting !== right.daysWaiting) {
    return right.daysWaiting - left.daysWaiting
  }
  return left.clientName.localeCompare(right.clientName)
}

/**
 * Flat next-action list: where each open file is, what comes next,
 * how long they've waited, sorted by who needs attention first.
 */
export function buildServiceBoardQueue(
  cases: Case[],
  filters: ServiceBoardFilters = {},
  asOf: Date = new Date(),
): ServiceBoardQueue {
  const items = collectItems(cases, filters, asOf).sort(compareServiceBoardQueue)
  return { openCount: items.length, items }
}

/**
 * Groups open service files by current step so ops can see who is ready
 * for medical, visa, ticket, etc. at a glance.
 */
export function buildServiceBoard(
  cases: Case[],
  filters: ServiceBoardFilters = {},
  asOf: Date = new Date(),
): ServiceBoard {
  const open = cases.filter(isOpenCase)
  const items = collectItems(cases, filters, asOf)

  const byStep = new Map<string, ServiceBoardItem[]>()
  for (const item of items) {
    const list = byStep.get(item.stepId) ?? []
    list.push(item)
    byStep.set(item.stepId, list)
  }

  const columns: ServiceBoardColumn[] = [...byStep.entries()]
    .map(([stepId, stepItems]) => {
      const sorted = [...stepItems].sort(compareServiceBoardQueue)
      return {
        stepId,
        label: majorityLabel(sorted),
        stage: majorityStage(sorted),
        count: sorted.length,
        actionable: sorted.filter((item) => item.state === 'actionable').length,
        blocked: sorted.filter((item) => item.state === 'blocked').length,
        onHold: sorted.filter((item) => item.state === 'on-hold').length,
        items: sorted,
      }
    })
    .sort((left, right) => {
      const order = stepSortIndex(left.stepId) - stepSortIndex(right.stepId)
      if (order !== 0) return order
      return left.label.localeCompare(right.label)
    })

  return {
    openCount: items.length,
    actionableCount: items.filter((item) => item.state === 'actionable').length,
    blockedCount: items.filter((item) => item.state === 'blocked').length,
    onHoldCount: items.filter((item) => item.state === 'on-hold').length,
    stageRows: stageFlow(open),
    columns,
  }
}
