import {
  balancesToCollect,
  needsAttention,
} from '@/lib/dashboardInsights'
import { formatBdt } from '@/lib/dashboardMetrics'
import { formatDisplayDate } from '@/lib/formatDate'
import { workDetailPath } from '@/lib/workPaths'
import type { Case } from '@/types/case'
import type { Client } from '@/types/client'
import type { StatusUpdateRequest } from '@/types/request'
import type { SubAgentPendingChange } from '@/types/subAgentAccess'

export type TodayBucketId = 'money' | 'docs' | 'stuck' | 'approvals'

export type TodayFollowUpItem = {
  id: string
  bucket: TodayBucketId
  title: string
  detail: string
  href: string
  /** Optional balance due for money rows. */
  amount?: number
}

export type TodayBucketSummary = {
  /** Full chase list for this bucket (scroll in the UI). */
  items: TodayFollowUpItem[]
}

export type TodayFollowUpsSummary = {
  money: TodayBucketSummary
  docs: TodayBucketSummary
  stuck: TodayBucketSummary
  approvals: TodayBucketSummary
}

export const TODAY_BUCKETS: {
  id: TodayBucketId
  label: string
  empty: string
}[] = [
  {
    id: 'money',
    label: 'Payments due',
    empty: 'No payments due.',
  },
  {
    id: 'docs',
    label: 'Missing docs',
    empty: 'No missing documents.',
  },
  {
    id: 'stuck',
    label: 'Needs action',
    empty: 'No files need action.',
  },
  {
    id: 'approvals',
    label: 'Approvals',
    empty: 'No pending approvals.',
  },
]

function isOpenCase(item: Case): boolean {
  return item.status !== 'Completed' && item.status !== 'Cancelled'
}

/** Required docs that are due now (status missing — not later / not_due). */
function missingRequiredCount(item: Case): number {
  return item.documents.filter(
    (doc) => doc.required && doc.status === 'missing',
  ).length
}

function approvalDetail(
  change: SubAgentPendingChange,
  resolveSubAgentName?: (id: string) => string | undefined,
): string {
  const bits: string[] = []
  const subAgentName = resolveSubAgentName?.(change.subAgentId)?.trim()
  if (subAgentName) bits.push(subAgentName)
  bits.push(`${change.action} ${change.entityType}`)
  const when = formatDisplayDate(change.createdAt)
  if (when) bits.push(when)
  return bits.join(' · ')
}

/**
 * Daily chase list: payments due, missing docs, files needing action,
 * and (optionally) pending sub-agent approvals.
 * Built from live stores — no separate to-do store.
 */
export function buildTodayFollowUps(input: {
  cases: Case[]
  clients: Client[]
  requests: StatusUpdateRequest[]
  asOf?: Date
  /** When omitted, the approvals queue stays empty. */
  pendingChanges?: SubAgentPendingChange[]
  /** Sub-agent portal: only that sub-agent's pending rows. */
  approvalsScopeSubAgentId?: string
  resolveSubAgentName?: (id: string) => string | undefined
  includeApprovals?: boolean
}): TodayFollowUpsSummary {
  const asOf = input.asOf ?? new Date()

  const moneyItems: TodayFollowUpItem[] = balancesToCollect(
    input.cases,
    Number.POSITIVE_INFINITY,
    asOf,
  ).map((row) => {
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

  const docsItems: TodayFollowUpItem[] = input.cases
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

  const stuckItems: TodayFollowUpItem[] = needsAttention(
    input.cases,
    input.requests,
    input.clients,
    Number.POSITIVE_INFINITY,
    asOf,
  )
    .filter(
      (item) =>
        item.reason === 'on-hold' ||
        item.reason === 'stale' ||
        item.reason === 'pending-request',
    )
    .map((item) => ({
      id: `stuck:${item.id}`,
      bucket: 'stuck' as const,
      title: item.title,
      detail: item.detail,
      href: item.href,
    }))

  let approvalItems: TodayFollowUpItem[] = []
  if (input.includeApprovals) {
    const open = (input.pendingChanges ?? []).filter(
      (row) => row.status === 'pending',
    )
    const scoped = input.approvalsScopeSubAgentId
      ? open.filter((row) => row.subAgentId === input.approvalsScopeSubAgentId)
      : open
    approvalItems = scoped
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((row) => ({
        id: `approvals:${row.id}`,
        bucket: 'approvals' as const,
        title: row.summary,
        detail: approvalDetail(row, input.resolveSubAgentName),
        href: '/approvals',
      }))
  }

  return {
    money: { items: moneyItems },
    docs: { items: docsItems },
    stuck: { items: stuckItems },
    approvals: { items: approvalItems },
  }
}

export function todayFollowUpsTotal(summary: TodayFollowUpsSummary): number {
  return (
    summary.money.items.length +
    summary.docs.items.length +
    summary.stuck.items.length +
    summary.approvals.items.length
  )
}

export function todayFollowUpsHeadline(summary: TodayFollowUpsSummary): string {
  const parts: string[] = []
  if (summary.money.items.length > 0) {
    parts.push(`${summary.money.items.length} payments due`)
  }
  if (summary.docs.items.length > 0) {
    parts.push(`${summary.docs.items.length} missing docs`)
  }
  if (summary.stuck.items.length > 0) {
    parts.push(`${summary.stuck.items.length} need action`)
  }
  if (summary.approvals.items.length > 0) {
    parts.push(`${summary.approvals.items.length} approvals`)
  }
  if (parts.length === 0) return 'Nothing due today.'
  if (parts.length === 1) return parts[0] ?? ''
  if (parts.length === 2) return `${parts[0]} · ${parts[1]}`
  return parts.join(' · ')
}

export function pickDefaultTodayBucket(
  summary: TodayFollowUpsSummary,
): TodayBucketId {
  for (const bucket of TODAY_BUCKETS) {
    if (summary[bucket.id].items.length > 0) return bucket.id
  }
  return 'money'
}

/** Buckets that currently have work, in desk order. */
export function todayBucketsWithWork(
  summary: TodayFollowUpsSummary,
  options?: { includeApprovals?: boolean },
): typeof TODAY_BUCKETS {
  return TODAY_BUCKETS.filter((bucket) => {
    if (bucket.id === 'approvals' && !options?.includeApprovals) return false
    return summary[bucket.id].items.length > 0
  })
}
