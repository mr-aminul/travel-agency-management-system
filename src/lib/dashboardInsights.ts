import { formatBdt } from '@/lib/dashboardMetrics'
import { workDetailPath, workInvoicePath } from '@/lib/workPaths'
import type { Case, CaseStatus } from '@/types/case'
import type { Client } from '@/types/client'
import type { Employee } from '@/types/employee'
import type { Partner } from '@/types/partner'
import type { Payment } from '@/types/payment'
import type { StatusUpdateRequest } from '@/types/request'

const CASE_STATUS_ORDER: CaseStatus[] = [
  'Pending',
  'In-Progress',
  'On-Hold',
  'Completed',
  'Cancelled',
]

const FUNNEL_STATUSES: CaseStatus[] = [
  'Pending',
  'In-Progress',
  'On-Hold',
  'Completed',
]

const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const

const STALE_DAYS = 14

export type OwnerKpis = {
  collected: number
  collectedLast30Days: number
  collectedPrev30Days: number
  /** (last30 − prev30) / prev30; null when previous period is zero. */
  collectedMomChange: number | null
  outstanding: number
  collectionRate: number
  bookedRevenue: number
  averageTicket: number
  openCases: number
  completedCases: number
  completionRate: number
  holdRate: number
  pendingRequests: number
  activeClients: number
  atRiskCount: number
  staleOpenCases: number
}

export type MonthBucket = {
  key: string
  label: string
  amount: number
  /** Change vs previous month in the series; null for the first bucket. */
  change: number | null
}

export type NamedCount = {
  key: string
  label: string
  count: number
}

export type NamedAmount = {
  key: string
  label: string
  amount: number
  count: number
}

export type AgingBucket = {
  key: 'current' | '30' | '60' | '90'
  label: string
  amount: number
  count: number
}

export type AttentionReason =
  | 'pending-request'
  | 'on-hold'
  | 'missing-docs'
  | 'stale'

export type AttentionItem = {
  id: string
  reason: AttentionReason
  title: string
  detail: string
  href: string
  date: string
  severity: 'high' | 'medium' | 'low'
}

export type LinkedAmountItem = {
  id: string
  name: string
  detail: string
  amount: number
  date: string
  href: string
}

export type DepartureItem = {
  id: string
  name: string
  detail: string
  departureDate: string
  href: string
}

export type PartnerContribution = {
  partnerId: string
  name: string
  clientCount: number
}

export type WorkloadRow = {
  key: string
  label: string
  openCases: number
  outstanding: number
}

export type PulseTone = 'positive' | 'watch' | 'critical' | 'neutral'

export type PulseInsight = {
  id: string
  tone: PulseTone
  title: string
  detail: string
}

type DateParts = { y: number; m: number; d: number }

function parseDateParts(value: string): DateParts | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim())
  if (!match) return null
  return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) }
}

function partsFromDate(date: Date): DateParts {
  return {
    y: date.getFullYear(),
    m: date.getMonth() + 1,
    d: date.getDate(),
  }
}

function toDayNumber(parts: DateParts): number {
  return parts.y * 10_000 + parts.m * 100 + parts.d
}

function addMonths(parts: DateParts, delta: number): DateParts {
  const monthIndex = parts.y * 12 + (parts.m - 1) + delta
  const y = Math.floor(monthIndex / 12)
  const m = (monthIndex % 12) + 1
  return { y, m, d: 1 }
}

function addDays(parts: DateParts, delta: number): DateParts {
  const date = new Date(parts.y, parts.m - 1, parts.d)
  date.setDate(date.getDate() + delta)
  return partsFromDate(date)
}

function daysBetween(from: DateParts, to: DateParts): number {
  const start = Date.UTC(from.y, from.m - 1, from.d)
  const end = Date.UTC(to.y, to.m - 1, to.d)
  return Math.floor((end - start) / 86_400_000)
}

function isOpenCase(item: Case): boolean {
  return item.status !== 'Completed' && item.status !== 'Cancelled'
}

function isBillableCase(item: Case): boolean {
  return item.status !== 'Cancelled'
}

function missingRequiredCount(item: Case): number {
  return item.documents.filter(
    (doc) => doc.required && doc.status === 'missing',
  ).length
}

function isActiveClient(client: Client): boolean {
  return client.activeCases > 0
}

function isStaleCase(item: Case, asOf: Date): boolean {
  if (!isOpenCase(item)) return false
  const parts = parseDateParts(item.updatedAt)
  if (!parts) return false
  return daysBetween(parts, partsFromDate(asOf)) >= STALE_DAYS
}

function ratioChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null
  return (current - previous) / previous
}

export function computeOwnerKpis(
  clients: Client[],
  cases: Case[],
  payments: Payment[],
  requests: StatusUpdateRequest[],
  asOf: Date = new Date(),
): OwnerKpis {
  const openCases = cases.filter(isOpenCase)
  const completedCases = cases.filter((item) => item.status === 'Completed')
  const billable = cases.filter(isBillableCase)
  const collected = payments.reduce((sum, item) => sum + item.amount, 0)
  const outstanding = openCases.reduce((sum, item) => sum + item.balance, 0)
  const bookedRevenue = billable.reduce((sum, item) => sum + item.serviceFee, 0)
  const asOfParts = partsFromDate(asOf)
  const asOfNum = toDayNumber(asOfParts)
  const last30Start = toDayNumber(addDays(asOfParts, -30))
  const prev30Start = toDayNumber(addDays(asOfParts, -60))
  const prev30End = toDayNumber(addDays(asOfParts, -31))

  let collectedLast30Days = 0
  let collectedPrev30Days = 0
  for (const payment of payments) {
    const parts = parseDateParts(payment.createdAt)
    if (!parts) continue
    const day = toDayNumber(parts)
    if (day >= last30Start && day <= asOfNum) collectedLast30Days += payment.amount
    else if (day >= prev30Start && day <= prev30End) {
      collectedPrev30Days += payment.amount
    }
  }

  const staleOpenCases = openCases.filter((item) => isStaleCase(item, asOf)).length
  const pendingRequests = requests.filter(
    (item) => item.reviewStatus === 'Pending',
  ).length
  const pendingCaseIds = new Set(
    requests
      .filter((item) => item.reviewStatus === 'Pending')
      .map((item) => item.caseId),
  )
  const holdCount = openCases.filter((item) => item.status === 'On-Hold').length
  const atRiskCount = openCases.filter(
    (item) =>
      item.status === 'On-Hold' ||
      pendingCaseIds.has(item.id) ||
      missingRequiredCount(item) > 0 ||
      isStaleCase(item, asOf),
  ).length

  const decided = completedCases.length + openCases.length
  const book = collected + outstanding

  return {
    collected,
    collectedLast30Days,
    collectedPrev30Days,
    collectedMomChange: ratioChange(collectedLast30Days, collectedPrev30Days),
    outstanding,
    collectionRate: book === 0 ? 0 : collected / book,
    bookedRevenue,
    averageTicket: billable.length === 0 ? 0 : bookedRevenue / billable.length,
    openCases: openCases.length,
    completedCases: completedCases.length,
    completionRate: decided === 0 ? 0 : completedCases.length / decided,
    holdRate: openCases.length === 0 ? 0 : holdCount / openCases.length,
    pendingRequests,
    activeClients: clients.filter(isActiveClient).length,
    atRiskCount,
    staleOpenCases,
  }
}

export function collectionsByMonth(
  payments: Payment[],
  months = 6,
  asOf: Date = new Date(),
): MonthBucket[] {
  const asOfParts = partsFromDate(asOf)
  const buckets: MonthBucket[] = []
  const index = new Map<string, MonthBucket>()

  for (let offset = months - 1; offset >= 0; offset -= 1) {
    const parts = addMonths(asOfParts, -offset)
    const key = `${parts.y}-${String(parts.m).padStart(2, '0')}`
    const bucket: MonthBucket = {
      key,
      label: MONTH_LABELS[parts.m - 1],
      amount: 0,
      change: null,
    }
    buckets.push(bucket)
    index.set(key, bucket)
  }

  for (const payment of payments) {
    const parts = parseDateParts(payment.createdAt)
    if (!parts) continue
    const key = `${parts.y}-${String(parts.m).padStart(2, '0')}`
    const bucket = index.get(key)
    if (bucket) bucket.amount += payment.amount
  }

  for (let i = 0; i < buckets.length; i += 1) {
    const bucket = buckets[i]
    if (!bucket || i === 0) continue
    const previous = buckets[i - 1]
    if (!previous) continue
    bucket.change = ratioChange(bucket.amount, previous.amount)
  }

  return buckets
}

export function casesByStatus(cases: Case[]): NamedCount[] {
  const counts = new Map<CaseStatus, number>()
  for (const item of cases) {
    counts.set(item.status, (counts.get(item.status) ?? 0) + 1)
  }
  return CASE_STATUS_ORDER.filter((status) => (counts.get(status) ?? 0) > 0).map(
    (status) => ({
      key: status,
      label: status,
      count: counts.get(status) ?? 0,
    }),
  )
}

export function pipelineFunnel(cases: Case[]): NamedCount[] {
  const counts = new Map<CaseStatus, number>()
  for (const item of cases) {
    if (!FUNNEL_STATUSES.includes(item.status)) continue
    counts.set(item.status, (counts.get(item.status) ?? 0) + 1)
  }
  return FUNNEL_STATUSES.map((status) => ({
    key: status,
    label: status,
    count: counts.get(status) ?? 0,
  })).filter((row) => row.count > 0)
}

export function serviceMix(cases: Case[]): NamedCount[] {
  const counts = new Map<string, number>()
  for (const item of cases) {
    counts.set(item.service, (counts.get(item.service) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ key: label, label, count }))
    .sort((left, right) => {
      if (right.count !== left.count) return right.count - left.count
      return left.label.localeCompare(right.label)
    })
}

export function revenueByService(cases: Case[]): NamedAmount[] {
  const map = new Map<string, { amount: number; count: number }>()
  for (const item of cases) {
    if (!isBillableCase(item)) continue
    const current = map.get(item.service) ?? { amount: 0, count: 0 }
    current.amount += item.serviceFee
    current.count += 1
    map.set(item.service, current)
  }
  return [...map.entries()]
    .map(([label, value]) => ({
      key: label,
      label,
      amount: value.amount,
      count: value.count,
    }))
    .sort((left, right) => {
      if (right.amount !== left.amount) return right.amount - left.amount
      return left.label.localeCompare(right.label)
    })
}

export function receivablesAging(
  cases: Case[],
  asOf: Date = new Date(),
): AgingBucket[] {
  const asOfParts = partsFromDate(asOf)
  const buckets: AgingBucket[] = [
    { key: 'current', label: '0–30d', amount: 0, count: 0 },
    { key: '30', label: '31–60d', amount: 0, count: 0 },
    { key: '60', label: '61–90d', amount: 0, count: 0 },
    { key: '90', label: '90d+', amount: 0, count: 0 },
  ]

  for (const item of cases) {
    if (!isOpenCase(item) || item.balance <= 0) continue
    const parts = parseDateParts(item.createdAt)
    if (!parts) continue
    const age = daysBetween(parts, asOfParts)
    const bucket =
      age <= 30
        ? buckets[0]
        : age <= 60
          ? buckets[1]
          : age <= 90
            ? buckets[2]
            : buckets[3]
    if (!bucket) continue
    bucket.amount += item.balance
    bucket.count += 1
  }

  return buckets
}

export type ShareSlice = NamedCount & { percent: number }

export function toShareSlices(items: NamedCount[]): ShareSlice[] {
  const total = items.reduce((sum, item) => sum + item.count, 0)
  if (total === 0) {
    return items.map((item) => ({ ...item, percent: 0 }))
  }
  return items.map((item) => ({
    ...item,
    percent: item.count / total,
  }))
}

export function formatSharePercent(percent: number): string {
  const rounded = Math.round(percent * 1000) / 10
  return `${rounded}%`
}

export function needsAttention(
  cases: Case[],
  requests: StatusUpdateRequest[],
  clients: Client[],
  limit = 8,
  asOf: Date = new Date(),
): AttentionItem[] {
  const clientById = new Map(clients.map((client) => [client.id, client]))
  const caseById = new Map(cases.map((item) => [item.id, item]))
  const items: AttentionItem[] = []
  const seenCases = new Set<string>()

  for (const request of requests) {
    if (request.reviewStatus !== 'Pending') continue
    const caseItem = caseById.get(request.caseId)
    const client = clientById.get(request.clientId)
    items.push({
      id: `request:${request.id}`,
      reason: 'pending-request',
      title: client?.name ?? request.clientId,
      detail: `${request.fromStatus} → ${request.toStatus}${
        caseItem ? ` · ${caseItem.service}` : ''
      }`,
      href: workDetailPath({
        id: request.caseId,
        clientId: request.clientId,
      }),
      date: request.requestedAt,
      severity: 'high',
    })
    seenCases.add(request.caseId)
  }

  for (const item of cases) {
    if (item.status !== 'On-Hold') continue
    items.push({
      id: `hold:${item.id}`,
      reason: 'on-hold',
      title: item.clientName,
      detail: [item.service, item.destination].filter(Boolean).join(' · '),
      href: workDetailPath(item),
      date: item.updatedAt,
      severity: 'high',
    })
    seenCases.add(item.id)
  }

  for (const item of cases) {
    if (seenCases.has(item.id) || !isOpenCase(item)) continue
    const missing = missingRequiredCount(item)
    if (missing === 0) continue
    items.push({
      id: `docs:${item.id}`,
      reason: 'missing-docs',
      title: item.clientName,
      detail: `${missing} missing doc${missing === 1 ? '' : 's'} · ${item.service}`,
      href: workDetailPath(item),
      date: item.updatedAt,
      severity: 'medium',
    })
    seenCases.add(item.id)
  }

  for (const item of cases) {
    if (seenCases.has(item.id) || !isStaleCase(item, asOf)) continue
    items.push({
      id: `stale:${item.id}`,
      reason: 'stale',
      title: item.clientName,
      detail: `No update in ${STALE_DAYS}+ days · ${item.service}`,
      href: workDetailPath(item),
      date: item.updatedAt,
      severity: 'low',
    })
  }

  return items.slice(0, limit)
}

export function recentPayments(
  payments: Payment[],
  clients: Client[],
  cases: Case[],
  limit = 5,
): LinkedAmountItem[] {
  const clientById = new Map(clients.map((client) => [client.id, client]))
  const caseById = new Map(cases.map((item) => [item.id, item]))
  return [...payments]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, limit)
    .map((payment) => {
      const client = clientById.get(payment.clientId)
      const caseItem = caseById.get(payment.caseId)
      return {
        id: payment.id,
        name: client?.name ?? payment.clientId,
        detail: [caseItem?.service, payment.method].filter(Boolean).join(' · '),
        amount: payment.amount,
        date: payment.createdAt,
        href: workInvoicePath({
          id: payment.caseId,
          clientId: payment.clientId,
        }),
      }
    })
}

export function topOutstanding(cases: Case[], limit = 5): LinkedAmountItem[] {
  return [...cases]
    .filter((item) => isOpenCase(item) && item.balance > 0)
    .sort((left, right) => right.balance - left.balance)
    .slice(0, limit)
    .map((item) => ({
      id: item.id,
      name: item.clientName,
      detail: [item.service, item.destination].filter(Boolean).join(' · '),
      amount: item.balance,
      date: item.updatedAt,
      href: workDetailPath(item),
    }))
}

export function upcomingDepartures(
  cases: Case[],
  limit = 5,
  asOf: Date = new Date(),
): DepartureItem[] {
  const asOfNum = toDayNumber(partsFromDate(asOf))
  return [...cases]
    .filter((item) => {
      if (!isOpenCase(item) || !item.departureDate) return false
      const parts = parseDateParts(item.departureDate)
      if (!parts) return false
      return toDayNumber(parts) >= asOfNum
    })
    .sort((left, right) =>
      (left.departureDate ?? '').localeCompare(right.departureDate ?? ''),
    )
    .slice(0, limit)
    .map((item) => ({
      id: item.id,
      name: item.clientName,
      detail: [item.service, item.destination].filter(Boolean).join(' · '),
      departureDate: item.departureDate ?? '',
      href: workDetailPath(item),
    }))
}

export function clientsByPartner(
  clients: Client[],
  partners: Partner[],
): PartnerContribution[] {
  const partnerById = new Map(partners.map((partner) => [partner.id, partner]))
  const counts = new Map<string, number>()
  for (const client of clients) {
    if (!client.partnerId) continue
    counts.set(client.partnerId, (counts.get(client.partnerId) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([partnerId, clientCount]) => ({
      partnerId,
      name: partnerById.get(partnerId)?.name ?? partnerId,
      clientCount,
    }))
    .sort((left, right) => {
      if (right.clientCount !== left.clientCount) {
        return right.clientCount - left.clientCount
      }
      return left.name.localeCompare(right.name)
    })
}

export function workloadByAssignee(
  cases: Case[],
  employees: Employee[],
  limit = 6,
): WorkloadRow[] {
  const employeeById = new Map(
    employees.map((employee) => [employee.id, employee]),
  )
  const map = new Map<string, WorkloadRow>()

  for (const item of cases) {
    if (!isOpenCase(item)) continue
    const key = item.assignedTo ?? 'unassigned'
    const label =
      key === 'unassigned'
        ? 'Unassigned'
        : (employeeById.get(key)?.name ?? key)
    const row = map.get(key) ?? {
      key,
      label,
      openCases: 0,
      outstanding: 0,
    }
    row.openCases += 1
    row.outstanding += item.balance
    map.set(key, row)
  }

  return [...map.values()]
    .sort((left, right) => {
      if (right.openCases !== left.openCases) {
        return right.openCases - left.openCases
      }
      return left.label.localeCompare(right.label)
    })
    .slice(0, limit)
}

export function buildExecutivePulse(
  kpis: OwnerKpis,
  aging: AgingBucket[],
  months: MonthBucket[],
): PulseInsight[] {
  const insights: PulseInsight[] = []
  const latestMonth = months[months.length - 1]
  const previousMonth = months[months.length - 2]
  const overdue = aging
    .filter((bucket) => bucket.key !== 'current')
    .reduce((sum, bucket) => sum + bucket.amount, 0)

  if (kpis.collectedMomChange != null) {
    const pct = Math.round(Math.abs(kpis.collectedMomChange) * 100)
    if (kpis.collectedMomChange > 0.05) {
      insights.push({
        id: 'collections-up',
        tone: 'positive',
        title: `Collections up ${pct}% vs prior 30 days`,
        detail: `${formatBdt(kpis.collectedLast30Days)} received in the latest window.`,
      })
    } else if (kpis.collectedMomChange < -0.05) {
      insights.push({
        id: 'collections-down',
        tone: 'watch',
        title: `Collections down ${pct}% vs prior 30 days`,
        detail: 'Cash intake cooled — review open balances and partner follow-ups.',
      })
    }
  }

  if (overdue > 0) {
    insights.push({
      id: 'aging',
      tone: overdue >= kpis.outstanding * 0.4 ? 'critical' : 'watch',
      title: `${formatBdt(overdue)} aged past 30 days`,
      detail: `${formatCollectionRate(kpis.collectionRate)} collection rate · ${formatBdt(kpis.outstanding)} still due.`,
    })
  }

  if (kpis.atRiskCount > 0) {
    insights.push({
      id: 'risk',
      tone: kpis.atRiskCount >= 5 ? 'critical' : 'watch',
      title: `${kpis.atRiskCount} files need a decision`,
      detail: [
        kpis.pendingRequests ? `${kpis.pendingRequests} requests` : null,
        kpis.staleOpenCases ? `${kpis.staleOpenCases} stale` : null,
      ]
        .filter(Boolean)
        .join(' · ') || 'Holds, missing docs, or stalled updates.',
    })
  }

  if (
    latestMonth &&
    previousMonth &&
    latestMonth.amount > 0 &&
    previousMonth.amount > 0 &&
    latestMonth.change != null &&
    latestMonth.change > 0.1
  ) {
    insights.push({
      id: 'month-momentum',
      tone: 'positive',
      title: `${latestMonth.label} is ahead of ${previousMonth.label}`,
      detail: `${formatBdt(latestMonth.amount)} collected this month so far.`,
    })
  }

  if (insights.length === 0) {
    insights.push({
      id: 'steady',
      tone: 'neutral',
      title: 'Operations look steady',
      detail: `${kpis.openCases} open services · ${formatBdt(kpis.collected)} collected lifetime.`,
    })
  }

  return insights.slice(0, 3)
}

export function formatCollectionRate(rate: number): string {
  return `${Math.round(rate * 100)}%`
}

export function formatDeltaPercent(change: number | null): string | null {
  if (change == null) return null
  const pct = Math.round(Math.abs(change) * 100)
  if (pct === 0) return '0%'
  return `${change > 0 ? '+' : '−'}${pct}%`
}

export function formatCompactBdt(amount: number): string {
  const abs = Math.abs(amount)
  if (abs >= 10_000_000) {
    return `৳${(amount / 10_000_000).toLocaleString('en-BD', {
      maximumFractionDigits: 1,
    })}Cr`
  }
  if (abs >= 100_000) {
    return `৳${(amount / 100_000).toLocaleString('en-BD', {
      maximumFractionDigits: 1,
    })}L`
  }
  if (abs >= 1000) {
    return `৳${(amount / 1000).toLocaleString('en-BD', {
      maximumFractionDigits: 1,
    })}k`
  }
  return formatBdt(amount)
}

export { formatBdt }
