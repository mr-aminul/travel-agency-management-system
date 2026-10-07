import { deriveStageFromStep, templateCountry } from '@/lib/caseChecklist'
import { collectionsByMonth } from '@/lib/dashboardInsights'
import { workDetailPath } from '@/lib/workPaths'
import type { Case, CaseDocument, CaseStage } from '@/types/case'
import type { Client } from '@/types/client'
import type { Payment } from '@/types/payment'

const FLOW_STAGES: CaseStage[] = [
  'Intake',
  'Processing',
  'Documents',
  'Travel',
  'Closed',
]

export type StageFlowRow = {
  stage: CaseStage
  count: number
}

export type PaperworkSummary = {
  approved: number
  underReview: number
  missing: number
  notDue: number
  /** Required documents received (approved or in review) ÷ those already due. */
  inHandRate: number
}

export type DepartureCheck = {
  id: string
  name: string
  detail: string
  departureDate: string
  daysUntil: number
  /** Required documents received (approved or in review). */
  documentsReady: number
  documentsRequired: number
  href: string
}

export type DepartureOutlook = {
  upcoming: DepartureCheck[]
  overdue: DepartureCheck[]
}

export type CashFlowMonth = {
  key: string
  label: string
  booked: number
  collected: number
}

export type ReferralSplit = {
  referred: number
  direct: number
}

function isOpenCase(item: Case): boolean {
  return item.status !== 'Completed' && item.status !== 'Cancelled'
}

function daysUntil(isoDate: string, asOf: Date): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate.trim())
  if (!match) return null
  const target = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  const today = Date.UTC(asOf.getFullYear(), asOf.getMonth(), asOf.getDate())
  return Math.round((target - today) / 86_400_000)
}

function isDocumentInHand(doc: CaseDocument): boolean {
  return doc.status === 'approved' || doc.status === 'under_review'
}

/** Non-cancelled files by journey stage; finished work lands in Closed. */
export function stageFlow(cases: Case[]): StageFlowRow[] {
  const rows = new Map<CaseStage, StageFlowRow>(
    FLOW_STAGES.map((stage) => [stage, { stage, count: 0 }]),
  )
  for (const item of cases) {
    if (item.status === 'Cancelled') continue
    const stage = deriveStageFromStep(
      item.service,
      item.currentStepId,
      item.status,
      templateCountry(item),
    )
    const row = rows.get(stage)
    if (row) row.count += 1
  }
  return [...rows.values()]
}

export function paperworkSummary(cases: Case[]): PaperworkSummary {
  const summary = { approved: 0, underReview: 0, missing: 0, notDue: 0 }
  for (const item of cases) {
    if (!isOpenCase(item)) continue
    for (const doc of item.documents) {
      if (!doc.required) continue
      if (doc.status === 'approved') summary.approved += 1
      else if (doc.status === 'under_review') summary.underReview += 1
      else if (doc.status === 'missing') summary.missing += 1
      else summary.notDue += 1
    }
  }
  const inHand = summary.approved + summary.underReview
  const due = inHand + summary.missing
  return { ...summary, inHandRate: due === 0 ? 1 : inHand / due }
}

/** Open files with a travel date: next `horizonDays`, plus dates already missed. */
export function departureOutlook(
  cases: Case[],
  horizonDays = 90,
  asOf: Date = new Date(),
): DepartureOutlook {
  const checks: DepartureCheck[] = []
  for (const item of cases) {
    if (!isOpenCase(item) || !item.departureDate) continue
    const days = daysUntil(item.departureDate, asOf)
    if (days == null || days > horizonDays) continue
    const required = item.documents.filter((doc) => doc.required)
    checks.push({
      id: item.id,
      name: item.clientName,
      detail: [item.service, item.destination].filter(Boolean).join(' · '),
      departureDate: item.departureDate,
      daysUntil: days,
      documentsReady: required.filter(isDocumentInHand).length,
      documentsRequired: required.length,
      href: workDetailPath(item),
    })
  }
  checks.sort((left, right) => left.daysUntil - right.daysUntil)
  return {
    upcoming: checks.filter((check) => check.daysUntil >= 0),
    overdue: checks.filter((check) => check.daysUntil < 0),
  }
}

/** Fees booked (by file open date) against cash received, per month. */
export function cashFlowByMonth(
  cases: Case[],
  payments: Payment[],
  months = 12,
  asOf: Date = new Date(),
): CashFlowMonth[] {
  const bookedByMonth = new Map<string, number>()
  for (const item of cases) {
    if (item.status === 'Cancelled') continue
    const key = item.createdAt.slice(0, 7)
    bookedByMonth.set(key, (bookedByMonth.get(key) ?? 0) + item.serviceFee)
  }
  return collectionsByMonth(payments, months, asOf).map((bucket) => ({
    key: bucket.key,
    label: bucket.label,
    booked: bookedByMonth.get(bucket.key) ?? 0,
    collected: bucket.amount,
  }))
}

/** Active clients whose passport is expired or expires within `withinDays`. */
export function passportsExpiringSoon(
  clients: Client[],
  withinDays = 180,
  asOf: Date = new Date(),
): number {
  return clients.filter((client) => {
    if (client.activeCases === 0 || !client.passportExpiry) return false
    const days = daysUntil(client.passportExpiry, asOf)
    return days != null && days <= withinDays
  }).length
}

export function referralSplit(clients: Client[]): ReferralSplit {
  const referred = clients.filter((client) => Boolean(client.subAgentId)).length
  return { referred, direct: clients.length - referred }
}
