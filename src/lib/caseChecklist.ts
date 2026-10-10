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
import { formatDisplayDate } from '@/lib/formatDate'
import { resolveServiceTemplate } from '@/lib/resolveServiceTemplate'
import { getServiceTemplateOverride, resolveServiceTemplateOverride } from '@/lib/serviceTemplatesStore'
import { matchBranchNextStepId } from '@/lib/stepBranchRules'
import type {
  BuiltinServiceType,
  Case,
  CaseStage,
  CaseStepRecord,
  ServiceType,
} from '@/types/case'

export type StepDef = {
  id: string
  label: string
  icon: LucideIcon
  /** Coarse stage bucket for this step. */
  stage: CaseStage
}

/** Canonical stage order for the Pipeline tab. */
export const CASE_PIPELINE_STAGES: CaseStage[] = [
  'Intake',
  'Processing',
  'Documents',
  'Travel',
  'Closed',
]

export function getPipelineStageIndex(stage: CaseStage): number {
  const index = CASE_PIPELINE_STAGES.indexOf(stage)
  return index < 0 ? 0 : index
}

/** Stages that actually have milestones for this service, in journey order. */
export function getPipelineStagesForService(
  service: ServiceType,
  country?: string,
): CaseStage[] {
  const seen = new Set<CaseStage>()
  const stages: CaseStage[] = []
  for (const step of getStepDefs(service, country)) {
    if (seen.has(step.stage)) continue
    seen.add(step.stage)
    stages.push(step.stage)
  }
  return stages
}

export function getStepsForStage(
  service: ServiceType,
  stage: CaseStage,
  country?: string,
): StepDef[] {
  return getStepDefs(service, country).filter((step) => step.stage === stage)
}

/** A step is done when recorded, passed, or the whole case is completed. */
export function isPipelineStepComplete(item: Case, stepId: string): boolean {
  if (item.status === 'Completed') return true
  if (item.steps[stepId]?.completedAt) return true
  const country = templateCountry(item)
  return (
    getStepIndex(item.service, stepId, country) <
    getStepIndex(item.service, item.currentStepId, country)
  )
}

/** Stage is complete only when every milestone in that stage is complete. */
export function isPipelineStageComplete(
  item: Case,
  stage: CaseStage,
): boolean {
  if (item.status === 'Completed') return true
  const steps = getStepsForStage(item.service, stage, templateCountry(item))
  if (steps.length === 0) return false
  return steps.every((step) => isPipelineStepComplete(item, step.id))
}

export function isPipelineStageCurrent(item: Case, stage: CaseStage): boolean {
  if (item.status === 'Completed' || item.status === 'Cancelled') {
    return stage === 'Closed'
  }
  return getStepDef(item.service, item.currentStepId, templateCountry(item))
    ?.stage === stage
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

const CUSTOM_STEPS: StepDef[] = [
  { id: 'intake', label: 'Intake', icon: FilePlus2, stage: 'Intake' },
  { id: 'processing', label: 'In progress', icon: ClipboardList, stage: 'Processing' },
  { id: 'documents', label: 'Documents', icon: FileCheck2, stage: 'Documents' },
  { id: 'delivered', label: 'Delivered', icon: BadgeCheck, stage: 'Travel' },
  { id: 'closed', label: 'Closed', icon: CheckCircle2, stage: 'Closed' },
]

const TOURIST_VISA_STEPS: StepDef[] = [
  { id: 'registered', label: 'Registered', icon: FilePlus2, stage: 'Intake' },
  { id: 'applied', label: 'Visa applied', icon: ClipboardList, stage: 'Processing' },
  { id: 'visa', label: 'Visa issued', icon: Stamp, stage: 'Documents' },
  { id: 'ticket', label: 'Ticket', icon: Ticket, stage: 'Travel' },
  { id: 'travelled', label: 'Travelled', icon: PlaneTakeoff, stage: 'Closed' },
]

const MEDICAL_VISA_STEPS: StepDef[] = [
  { id: 'registered', label: 'Registered', icon: FilePlus2, stage: 'Intake' },
  { id: 'medical', label: 'Hospital papers', icon: Activity, stage: 'Documents' },
  { id: 'applied', label: 'Visa applied', icon: ClipboardList, stage: 'Processing' },
  { id: 'visa', label: 'Visa issued', icon: Stamp, stage: 'Documents' },
  { id: 'travelled', label: 'Travelled', icon: PlaneTakeoff, stage: 'Closed' },
]

const STEPS_BY_SERVICE: Record<BuiltinServiceType, StepDef[]> = {
  'Tourist Visa': TOURIST_VISA_STEPS,
  'Student Visa': STUDENT_STEPS,
  'Work Permit Visa': MANPOWER_STEPS,
  'Hajj/Umrah Visa': HAJJ_STEPS,
  'Medical Visa': MEDICAL_VISA_STEPS,
  'Air Ticket': TICKETING_STEPS,
  'Hotel Booking': LEISURE_STEPS,
  'Tour Package': LEISURE_STEPS,
}

function stageFromPosition(index: number, total: number): CaseStage {
  if (index <= 0) return 'Intake'
  if (index >= total - 1) return 'Closed'
  if (index === total - 2) return 'Travel'
  return index < Math.ceil(total / 2) ? 'Processing' : 'Documents'
}

export function getBuiltinStepDefs(service: ServiceType): StepDef[] {
  return STEPS_BY_SERVICE[service as BuiltinServiceType] ?? CUSTOM_STEPS
}

export function templateCountry(
  item: Pick<Case, 'serviceCountry' | 'destination'>,
): string | undefined {
  return item.serviceCountry || undefined
}

export function getStepDefs(
  service: ServiceType,
  country?: string,
): StepDef[] {
  const builtin = getBuiltinStepDefs(service)
  const override = country
    ? resolveServiceTemplateOverride(service, country)
    : getServiceTemplateOverride(service)
  if (!override?.steps.length) return builtin
  return override.steps.map((step, index, all) => {
    const match = builtin.find((item) => item.id === step.id)
    return {
      id: step.id,
      label: step.label,
      icon: match?.icon ?? FileCheck2,
      stage: match?.stage ?? stageFromPosition(index, all.length),
    }
  })
}

export function getStepDefsForCase(item: Case): StepDef[] {
  return getStepDefs(item.service, templateCountry(item))
}

export function getFirstStepId(service: ServiceType, country?: string): string {
  return getStepDefs(service, country)[0].id
}

export function getStepDef(
  service: ServiceType,
  stepId: string,
  country?: string,
): StepDef | undefined {
  return getStepDefs(service, country).find((step) => step.id === stepId)
}

export function getStepIndex(
  service: ServiceType,
  stepId: string,
  country?: string,
): number {
  const index = getStepDefs(service, country).findIndex(
    (step) => step.id === stepId,
  )
  return index < 0 ? 0 : index
}

export function deriveStageFromStep(
  service: ServiceType,
  currentStepId: string,
  status: Case['status'],
  country?: string,
): CaseStage {
  if (status === 'Completed' || status === 'Cancelled') return 'Closed'
  return getStepDef(service, currentStepId, country)?.stage ?? 'Intake'
}

/** Build initial step map: first step current (not completed), rest empty. */
export function buildInitialSteps(
  service: ServiceType,
  createdAt: string,
  country?: string,
): { currentStepId: string; steps: Record<string, CaseStepRecord> } {
  const defs = getStepDefs(service, country)
  const currentStepId = defs[0].id
  const steps: Record<string, CaseStepRecord> = {}
  for (const def of defs) {
    steps[def.id] =
      def.id === currentStepId
        ? { completedAt: null, detail: 'Case opened' }
        : { completedAt: null }
  }
  // Stamp created date as opened detail without completing the first step.
  steps[currentStepId] = {
    completedAt: null,
    detail: `Opened ${formatDisplayDate(createdAt, createdAt)}`,
  }
  return { currentStepId, steps }
}

function completedStampFrom(createdAt: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(createdAt.trim())
  if (!match) return createdAt
  return new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    10,
    0,
  ).toISOString()
}

/** Seed helper: mark all steps before `currentStepId` as done. */
export function buildProgressAtStep(
  service: ServiceType,
  currentStepId: string,
  createdAt: string,
  details: Record<string, string> = {},
  country?: string,
): { currentStepId: string; steps: Record<string, CaseStepRecord> } {
  const defs = getStepDefs(service, country)
  const currentIndex = getStepIndex(service, currentStepId, country)
  const steps: Record<string, CaseStepRecord> = {}

  defs.forEach((def, index) => {
    if (index < currentIndex) {
      steps[def.id] = {
        completedAt: completedStampFrom(createdAt),
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
  return (
    getStepDef(item.service, item.currentStepId, templateCountry(item))
      ?.label ?? 'Intake'
  )
}

export function getNextStepDef(item: Case): StepDef | null {
  if (item.status === 'Completed' || item.status === 'Cancelled') return null
  const country = templateCountry(item)
  const defs = getStepDefsForCase(item)
  const index = getStepIndex(item.service, item.currentStepId, country)
  if (index < 0) return null

  const templateStep = resolveServiceTemplate(item.service, country).steps.find(
    (step) => step.id === item.currentStepId,
  )
  const branchedId = matchBranchNextStepId(
    templateStep,
    item.documents,
    new Set(defs.map((def) => def.id)),
  )
  if (branchedId) {
    return defs.find((def) => def.id === branchedId) ?? null
  }

  return defs[index + 1] ?? null
}

export function isLastStep(item: Case): boolean {
  return getNextStepDef(item) === null
}
