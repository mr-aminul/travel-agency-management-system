import {
  Activity,
  Folder,
  GitPullRequest,
  Inbox,
  Mail,
  MessageSquare,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import {
  buildClientActivity,
  type ClientActivityItem,
  type ClientActivityType,
} from '@/lib/clientActivity'
import { formatDisplayDateTime, formatRelativeTime } from '@/lib/formatDate'
import { cn } from '@/lib/utils'
import type { Case } from '@/types/case'
import type { ClientMessageChannel, ClientThreadMessage } from '@/types/clientMessage'
import type { Payment } from '@/types/payment'
import type { StatusUpdateRequest } from '@/types/request'

export type ClientRecentActivityProps = {
  cases: Case[]
  messages: ClientThreadMessage[]
  payments: Payment[]
  requests: StatusUpdateRequest[]
  onOpenMessages: (channel: ClientMessageChannel) => void
  onOpenPayments: () => void
  onOpenService?: (caseId: string) => void
}

function typeIcon(type: ClientActivityType): LucideIcon {
  if (type === 'Payments') return Wallet
  if (type === 'SMS') return MessageSquare
  if (type === 'Email') return Mail
  if (type === 'Requests') return GitPullRequest
  return Folder
}

function typeTone(type: ClientActivityType): string {
  if (type === 'Payments') {
    return 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-400'
  }
  if (type === 'Requests') {
    return 'bg-amber-500/12 text-amber-700 dark:text-amber-400'
  }
  if (type === 'SMS' || type === 'Email') {
    return 'bg-sky-500/12 text-sky-700 dark:text-sky-400'
  }
  return 'bg-[var(--color-theme-subtle)] text-[var(--color-theme-ink)]'
}

function isClickable(
  row: ClientActivityItem,
  onOpenService?: (caseId: string) => void,
): boolean {
  return (
    Boolean(row.channel) ||
    row.type === 'Payments' ||
    Boolean(row.caseId && onOpenService)
  )
}

function metaParts(row: ClientActivityItem): string[] {
  const parts: string[] = [formatRelativeTime(row.at)]
  if (row.staff.trim() && row.staff !== '—') parts.push(row.staff)
  if (row.reference.trim() && row.reference !== row.type) {
    parts.push(row.reference)
  }
  return parts
}

export function ClientRecentActivity({
  cases,
  messages,
  payments,
  requests,
  onOpenMessages,
  onOpenPayments,
  onOpenService,
}: ClientRecentActivityProps) {
  const rows = buildClientActivity({
    cases,
    payments,
    messages,
    requests,
    limit: 40,
  })

  const openRow = (row: ClientActivityItem) => {
    if (row.channel) {
      onOpenMessages(row.channel)
      return
    }
    if (row.type === 'Payments') {
      onOpenPayments()
      return
    }
    if (row.caseId && onOpenService) {
      onOpenService(row.caseId)
    }
  }

  return (
    <section
      className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm"
      aria-label="Recent activity"
    >
      <div className="flex items-center gap-2 border-b border-border px-3.5 py-2.5">
        <span
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-[var(--color-theme-subtle)] text-[var(--color-theme-ink)]"
          aria-hidden
        >
          <Activity size={15} strokeWidth={2.25} />
        </span>
        <h2 className="m-0 text-sm font-semibold">Recent Activity</h2>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2.5 px-3.5 py-8 text-center">
          <span
            className="inline-flex size-9 items-center justify-center rounded-full bg-muted text-muted-foreground"
            aria-hidden
          >
            <Inbox size={16} strokeWidth={2} />
          </span>
          <p className="m-0 text-sm text-muted-foreground">No Recent Activity</p>
        </div>
      ) : (
        <ul className="m-0 max-h-[28rem] list-none divide-y divide-border overflow-auto p-0">
          {rows.map((row) => {
            const Icon = typeIcon(row.type)
            const clickable = isClickable(row, onOpenService)
            const meta = metaParts(row)
            const body = (
              <>
                <span
                  className={cn(
                    'mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-lg',
                    typeTone(row.type),
                  )}
                  aria-hidden
                >
                  <Icon size={15} strokeWidth={2.25} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-foreground">
                    {row.summary}
                  </span>
                  <span className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
                    <span
                      className="shrink-0 tabular-nums"
                      title={formatDisplayDateTime(row.at)}
                    >
                      {meta[0]}
                    </span>
                    {meta.slice(1).map((part) => (
                      <span key={part} className="inline-flex min-w-0 items-center gap-x-1.5">
                        <span aria-hidden>·</span>
                        <span className="truncate">{part}</span>
                      </span>
                    ))}
                  </span>
                </span>
                <span className="shrink-0 text-[0.6875rem] font-medium text-muted-foreground">
                  {row.type}
                </span>
              </>
            )

            return (
              <li key={row.id} className="m-0 p-0">
                {clickable ? (
                  <button
                    type="button"
                    className="flex w-full items-start gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-muted/40"
                    onClick={() => openRow(row)}
                  >
                    {body}
                  </button>
                ) : (
                  <div className="flex items-start gap-3 px-3.5 py-2.5">
                    {body}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
