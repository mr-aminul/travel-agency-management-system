import {
  Boxes,
  Inbox,
  Mail,
  MessageSquareText,
  ScrollText,
  UsersRound,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import {
  formatDisplayDateTime,
  formatRelativeTime,
} from '@/lib/formatDate'
import type { PlatformAuditEntry } from '@/lib/platformAdminApi'
import { cn } from '@/lib/utils'

export function auditCategory(row: PlatformAuditEntry): string {
  const raw = (row.entityType || row.action || 'Audit').trim()
  if (!raw) return 'Audit'
  return raw
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

export function auditIcon(row: PlatformAuditEntry): LucideIcon {
  const key = `${row.entityType} ${row.action}`.toLowerCase()
  if (/(invoice|billing|payment|plan)/.test(key)) return Wallet
  if (/(sms|message)/.test(key)) return MessageSquareText
  if (/email/.test(key)) return Mail
  if (/(user|member|people|invite)/.test(key)) return UsersRound
  if (/(module|access|entitlement)/.test(key)) return Boxes
  return ScrollText
}

export function auditTone(row: PlatformAuditEntry): string {
  const key = `${row.entityType} ${row.action}`.toLowerCase()
  if (/(invoice|billing|payment|plan)/.test(key)) {
    return 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-400'
  }
  if (/(sms|email|message)/.test(key)) {
    return 'bg-sky-500/12 text-sky-700 dark:text-sky-400'
  }
  if (/(user|member|people|invite)/.test(key)) {
    return 'bg-amber-500/12 text-amber-700 dark:text-amber-400'
  }
  return 'bg-[var(--color-theme-subtle)] text-[var(--color-theme-ink)]'
}

export function auditMeta(
  row: PlatformAuditEntry,
  options?: { agencyName?: string },
): string[] {
  const parts: string[] = [formatRelativeTime(row.createdAt)]
  if (options?.agencyName) parts.push(options.agencyName)
  const actor = (row.actorEmail || row.actorUserId || '').trim()
  if (actor) parts.push(actor)
  const reference = (row.entityId || '').trim()
  if (reference) parts.push(reference)
  return parts
}

export type PlatformAuditFeedProps = {
  rows: PlatformAuditEntry[]
  agencyNameFor?: (tenantId: string) => string | undefined
  emptyLabel?: string
  maxHeightClass?: string
  onRowClick?: (row: PlatformAuditEntry) => void
}

export function PlatformAuditFeed({
  rows,
  agencyNameFor,
  emptyLabel = 'No Recent Activity',
  maxHeightClass = 'max-h-[28rem]',
  onRowClick,
}: PlatformAuditFeedProps) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2.5 px-3.5 py-8 text-center">
        <span
          className="inline-flex size-9 items-center justify-center rounded-full bg-muted text-muted-foreground"
          aria-hidden
        >
          <Inbox size={16} strokeWidth={2} />
        </span>
        <p className="m-0 text-sm text-muted-foreground">{emptyLabel}</p>
      </div>
    )
  }

  return (
    <ul
      className={cn(
        'm-0 list-none divide-y divide-border overflow-auto p-0',
        maxHeightClass,
      )}
    >
      {rows.map((row) => {
        const Icon = auditIcon(row)
        const meta = auditMeta(row, {
          agencyName: agencyNameFor?.(row.tenantId),
        })
        const category = auditCategory(row)
        const body = (
          <>
            <span
              className={cn(
                'mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-lg',
                auditTone(row),
              )}
              aria-hidden
            >
              <Icon size={15} strokeWidth={2.25} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-foreground">
                {row.summary || row.action}
              </span>
              <span className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
                <span
                  className="shrink-0 tabular-nums"
                  title={formatDisplayDateTime(row.createdAt)}
                >
                  {meta[0]}
                </span>
                {meta.slice(1).map((part) => (
                  <span
                    key={part}
                    className="inline-flex min-w-0 items-center gap-x-1.5"
                  >
                    <span aria-hidden>·</span>
                    <span className="truncate">{part}</span>
                  </span>
                ))}
              </span>
            </span>
            <span className="shrink-0 text-[0.6875rem] font-medium text-muted-foreground">
              {category}
            </span>
          </>
        )

        return (
          <li key={row.id} className="m-0 p-0">
            {onRowClick ? (
              <button
                type="button"
                className="flex w-full items-start gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-muted/40"
                onClick={() => onRowClick(row)}
              >
                {body}
              </button>
            ) : (
              <div className="flex items-start gap-3 px-3.5 py-2.5">{body}</div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
