import {
  balancesToCollect,
  needsAttention,
} from '@/lib/dashboardInsights'
import { formatBdt } from '@/lib/dashboardMetrics'
import { workDetailPath } from '@/lib/workPaths'
import type { Case } from '@/types/case'
import type { Client } from '@/types/client'
import type { StatusUpdateRequest } from '@/types/request'

export type TodayBucketId = 'money' | 'docs' | 'stuck'

export type TodayFollowUpItem = {
  id: string
  bucket: TodayBucketId
  title: string
  detail: string
  href: string
  /** Optional balance due for money rows. */
  amount?: number
}

export type TodayFollowUpsSummary = {
  money: TodayFollowUpItem[]
  docs: TodayFollowUpItem[]
  stuck: TodayFollowUpItem[]
}

export const TODAY_BUCKETS: {
  id: TodayBucketId
  label: string
  empty: string
}[] = [
  {
    id: 'money',
    label: 'Money due',
    empty: 'No open balances to chase today.',
  },
  {
    id: 'docs',
    label: 'Missing docs',
    empty: 'No files waiting on documents.',
  },
  {
    id: 'stuck',
    label: 'Stuck',
    empty: 'Nothing on hold or going stale.',
  },
]

function isOpenCase(item: Case): boolean {
  return item.status !== 'Completed' && item.status !== 'Cancelled'
}

function missingRequiredCount(item: Case): number {
  return item.documents.filter(
    (doc) => doc.required && doc.status === 'missing',
  ).length
}

/**
 * Daily chase list: money due, missing docs, and stuck / on-hold files.
 * Built from live cases — no separate to-do store.
 */
export function buildTodayFollowUps(input: {
  cases: Case[]
  clients: Client[]
  requests: StatusUpdateRequest[]
  asOf?: Date
  limitPerBucket?: number
}): TodayFollowUpsSummary {
  const asOf = input.asOf ?? new Date()
  const limit = input.limitPerBucket ?? 8

  const money = balancesToCollect(input.cases, limit, asOf).map((row) => {
    const bits = [row.service]
    if (row.ageDays > 30) bits.push(`${row.ageDays}d open`)
    if (row.departsOn) bits.push('departs soon')
    return {
      id: `money:${row.id}`,
      bucket: 'money' as const,
      title: row.name,
      detail: `${formatBdt(row.amount)} due · ${bits.filter(Boolean).join(' · ')}`,
      href: row.href,
      amount: row.amount,
    }
  })

  const docs: TodayFollowUpItem[] = input.cases
    .filter((item) => isOpenCase(item) && missingRequiredCount(item) > 0)
    .map((item) => {
      const missing = missingRequiredCount(item)
      return {
        id: `docs:${item.id}`,
        bucket: 'docs' as const,
        title: item.clientName,
        detail: `${missing} missing doc${missing === 1 ? '' : 's'} · ${item.service}`,
        href: workDetailPath(item),
      }
    })
    .sort((a, b) => a.title.localeCompare(b.title))
    .slice(0, limit)

  const stuck = needsAttention(
    input.cases,
    input.requests,
    input.clients,
    limit * 2,
    asOf,
  )
    .filter(
      (item) =>
        item.reason === 'on-hold' ||
        item.reason === 'stale' ||
        item.reason === 'pending-request',
    )
    .slice(0, limit)
    .map((item) => ({
      id: `stuck:${item.id}`,
      bucket: 'stuck' as const,
      title: item.title,
      detail: item.detail,
      href: item.href,
    }))

  return { money, docs, stuck }
}

export function todayFollowUpsTotal(summary: TodayFollowUpsSummary): number {
  return summary.money.length + summary.docs.length + summary.stuck.length
}

export function todayFollowUpsHeadline(summary: TodayFollowUpsSummary): string {
  const parts: string[] = []
  if (summary.money.length > 0) {
    parts.push(
      `${summary.money.length} owe money`,
    )
  }
  if (summary.docs.length > 0) {
    parts.push(
      `${summary.docs.length} missing doc${summary.docs.length === 1 ? '' : 's'}`,
    )
  }
  if (summary.stuck.length > 0) {
    parts.push(
      `${summary.stuck.length} stuck`,
    )
  }
  if (parts.length === 0) return 'You are clear for now.'
  if (parts.length === 1) return parts[0] ?? ''
  if (parts.length === 2) return `${parts[0]} · ${parts[1]}`
  return `${parts[0]} · ${parts[1]} · ${parts[2]}`
}

export function pickDefaultTodayBucket(
  summary: TodayFollowUpsSummary,
): TodayBucketId {
  if (summary.money.length > 0) return 'money'
  if (summary.docs.length > 0) return 'docs'
  return 'stuck'
}
