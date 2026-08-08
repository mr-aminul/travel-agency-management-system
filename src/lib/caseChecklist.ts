import type { LucideIcon } from 'lucide-react'
import {
  Activity,
  BadgeCheck,
  CheckCircle2,
  ClipboardList,
  FileCheck2,
  FilePlus2,
  ListFilter,
  MessagesSquare,
  PlaneTakeoff,
  Stamp,
  Ticket,
} from 'lucide-react'
import type { Case, CaseStage, CaseStepRecord, CaseVertical } from '@/types/case'

export type StepDef = {
  id: string
  label: string
  icon: LucideIcon
  /** Coarse stage bucket for this step. */
  stage: CaseStage
}

const MANPOWER_STEPS: StepDef[] = [
  { id: 'registered', label: 'Registered', icon: FilePlus2, stage: 'Intake' },
  { id: 'shortlisted', label: 'Shortlisted', icon: ListFilter, stage: 'Processing' },
  { id: 'interview', label: 'Interview', icon: MessagesSquare, stage: 'Processing' },
  { id: 'selected', label: 'Selected', icon: CheckCircle2, stage: 'Processing' },
  { id: 'medical', label: 'Medical', icon: Activity, stage: 'Documents' },
  { id: 'visa', label: 'Visa', icon: Stamp, stage: 'Documents' },
  { id: 'clearance', label: 'Clearance', icon: FileCheck2, stage: 'Documents' },
  { id: 'ticket', label: 'Ticket', icon: Ticket, stage: 'Travel' },
  { id: 'departed', label: 'Departed', icon: PlaneTakeoff, stage: 'Closed' },
]

const STUDENT_STEPS: StepDef[] = [
  { id: 'registered', label: 'Registered', icon: FilePlus2, stage: 'Intake' },
  { id: 'counselled', label: 'Counselled', icon: MessagesSquare, stage: 'Processing' },
  { id: 'applied', label: 'University applied', icon: ClipboardList, stage: 'Processing' },
  { id: 'offer', label: 'Offer received', icon: BadgeCheck, stage: 'Documents' },
  { id: 'visa', label: 'Visa', icon: Stamp, stage: 'Documents' },
  { id: 'ticket', label: 'Ticket', icon: Ticket, stage: 'Travel' },
  { id: 'departed', label: 'Departed', icon: PlaneTakeoff, stage: 'Closed' },
]

const HAJJ_STEPS: StepDef[] = [
  { id: 'registered', label: 'Registered', icon: FilePlus2, stage: 'Intake' },
  { id: 'package', label: 'Package booked', icon: ClipboardList, stage: 'Processing' },
  { id: 'medical', label: 'Medical', icon: Activity, stage: 'Documents' },
  { id: 'visa', label: 'Visa', icon: Stamp, stage: 'Documents' },
  { id: 'ticket', label: 'Ticket', icon: Ticket, stage: 'Travel' },
  { id: 'departed', label: 'Departed', icon: PlaneTakeoff, stage: 'Closed' },
]

const LEISURE_STEPS: StepDef[] = [
  { id: 'enquiry', label: 'Enquiry', icon: MessagesSquare, stage: 'Intake' },
  { id: 'quote', label: 'Quote shared', icon: ClipboardList, stage: 'Processing' },
  { id: 'confirmed', label: 'Booking confirmed', icon: BadgeCheck, stage: 'Processing' },
  { id: 'payment', label: 'Payment', icon: CheckCircle2, stage: 'Documents' },
  { id: 'documents', label: 'Docs issued', icon: FilePlus2, stage: 'Documents' },
  { id: 'travelled', label: 'Travelled', icon: PlaneTakeoff, stage: 'Closed' },
]

const TICKETING_STEPS: StepDef[] = [
  { id: 'request', label: 'Request received', icon: FilePlus2, stage: 'Intake' },
  { id: 'quoted', label: 'Fare quoted', icon: ClipboardList, stage: 'Processing' },
  { id: 'payment', label: 'Payment', icon: CheckCircle2, stage: 'Documents' },
  { id: 'issued', label: 'Ticket issued', icon: Ticket, stage: 'Travel' },
  { id: 'travelled', label: 'Travelled', icon: PlaneTakeoff, stage: 'Closed' },
]

const STEPS_BY_VERTICAL: Record<CaseVertical, StepDef[]> = {
  Manpower: MANPOWER_STEPS,
  Student: STUDENT_STEPS,
  'Hajj/Umrah': HAJJ_STEPS,
  Leisure: LEISURE_STEPS,
  Ticketing: TICKETING_STEPS,
}

export function getStepDefs(vertical: CaseVertical): StepDef[] {
  return STEPS_BY_VERTICAL[vertical]
}

export function getFirstStepId(vertical: CaseVertical): string {
  return STEPS_BY_VERTICAL[vertical][0].id
}

export function getStepDef(
  vertical: CaseVertical,
  stepId: string,
): StepDef | undefined {
  return STEPS_BY_VERTICAL[vertical].find((step) => step.id === stepId)
}

export function getStepIndex(vertical: CaseVertical, stepId: string): number {
  const index = STEPS_BY_VERTICAL[vertical].findIndex((step) => step.id === stepId)
  return index < 0 ? 0 : index
}

export function deriveStageFromStep(
  vertical: CaseVertical,
  currentStepId: string,
  status: Case['status'],
): CaseStage {
  if (status === 'Completed' || status === 'Cancelled') return 'Closed'
  return getStepDef(vertical, currentStepId)?.stage ?? 'Intake'
}

/** Build initial step map: first step current (not completed), rest empty. */
export function buildInitialSteps(
  vertical: CaseVertical,
  createdAt: string,
): { currentStepId: string; steps: Record<string, CaseStepRecord> } {
  const defs = getStepDefs(vertical)
  const currentStepId = defs[0].id
  const steps: Record<string, CaseStepRecord> = {}
  for (const def of defs) {
    steps[def.id] =
      def.id === currentStepId
        ? { completedAt: null, detail: 'Case opened' }
        : { completedAt: null }
  }
  // Stamp created date as opened detail without completing the first step.
  steps[currentStepId] = { completedAt: null, detail: `Opened ${createdAt}` }
  return { currentStepId, steps }
}

/** Seed helper: mark all steps before `currentStepId` as done. */
export function buildProgressAtStep(
  vertical: CaseVertical,
  currentStepId: string,
  createdAt: string,
  details: Record<string, string> = {},
): { currentStepId: string; steps: Record<string, CaseStepRecord> } {
  const defs = getStepDefs(vertical)
  const currentIndex = getStepIndex(vertical, currentStepId)
  const steps: Record<string, CaseStepRecord> = {}

  defs.forEach((def, index) => {
    if (index < currentIndex) {
      steps[def.id] = {
        completedAt: createdAt,
        detail: details[def.id],
      }
    } else if (index === currentIndex) {
      steps[def.id] = {
        completedAt: null,
        detail: details[def.id] ?? 'In progress',
      }
    } else {
      steps[def.id] = { completedAt: null }
    }
  })

  return { currentStepId: defs[currentIndex].id, steps }
}

export function getCurrentStepLabel(item: Case): string {
  if (item.status === 'Completed') return 'Completed'
  if (item.status === 'Cancelled') return 'Cancelled'
  return getStepDef(item.vertical, item.currentStepId)?.label ?? 'Intake'
}

export function getNextStepDef(item: Case): StepDef | null {
  if (item.status === 'Completed' || item.status === 'Cancelled') return null
  const defs = getStepDefs(item.vertical)
  const index = getStepIndex(item.vertical, item.currentStepId)
  return defs[index + 1] ?? null
}

export function isLastStep(item: Case): boolean {
  const defs = getStepDefs(item.vertical)
  return getStepIndex(item.vertical, item.currentStepId) >= defs.length - 1
}
