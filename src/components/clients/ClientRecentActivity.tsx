import { Activity, Mail, MessageSquare, Wallet } from 'lucide-react'
import { Badge } from '@/components/shadcn/badge'
import { Button } from '@/components/shadcn/button'
import { formatBalance } from '@/lib/clientsStore'
import { formatDisplayDateTime } from '@/lib/formatDate'
import { cn } from '@/lib/utils'
import type { ClientThreadMessage } from '@/types/clientMessage'
import type { Payment } from '@/types/payment'

export type ClientRecentActivityProps = {
  messages: ClientThreadMessage[]
  payments: Payment[]
  onOpenMessages: () => void
  onOpenPayments: () => void
}

type ActivityRow = {
  id: string
  kind: 'sms' | 'email' | 'payment'
  title: string
  detail: string
  at: string
  onClick: () => void
}

function kindBadge(kind: ActivityRow['kind']) {
  if (kind === 'payment') {
    return {
      label: 'Payment',
      className: 'border-transparent bg-emerald-500/12 text-emerald-800',
      icon: Wallet,
    }
  }
  if (kind === 'email') {
    return {
      label: 'Email',
      className: 'border-transparent bg-sky-500/12 text-sky-900',
      icon: Mail,
    }
  }
  return {
    label: 'SMS',
    className: 'border-transparent bg-primary/12 text-primary',
    icon: MessageSquare,
  }
}

export function ClientRecentActivity({
  messages,
  payments,
  onOpenMessages,
  onOpenPayments,
}: ClientRecentActivityProps) {
  const rows: ActivityRow[] = [
    ...messages.slice(0, 4).map((item) => ({
      id: `msg-${item.id}`,
      kind: item.channel,
      title:
        item.channel === 'email'
          ? 'Email sent'
          : 'SMS sent',
      detail: item.body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 90) ||
        (item.attachment ? item.attachment.name : 'Message'),
      at: item.createdAt,
      onClick: onOpenMessages,
    })),
    ...payments.slice(0, 4).map((item) => ({
      id: `pay-${item.id}`,
      kind: 'payment' as const,
      title: `Paid via ${item.method}`,
      detail: formatBalance(item.amount),
      at: item.createdAt,
      onClick: onOpenPayments,
    })),
  ]
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
    .slice(0, 5)

  if (rows.length === 0) return null

  return (
    <section
      className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
      aria-label="Recent activity"
    >
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span
            className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-[var(--color-theme-subtle)] text-[var(--color-theme-ink)]"
            aria-hidden
          >
            <Activity size={15} strokeWidth={2.25} />
          </span>
          <p className="m-0 text-sm font-semibold">Recent Activity</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          className="h-8 rounded-lg px-2 text-xs"
          onClick={onOpenMessages}
        >
          Messages
        </Button>
      </div>
      <ul className="m-0 flex list-none flex-col divide-y divide-border p-0">
        {rows.map((row) => {
          const meta = kindBadge(row.kind)
          const Icon = meta.icon
          return (
            <li key={row.id} className="m-0 p-0">
              <button
                type="button"
                className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50"
                onClick={row.onClick}
              >
                <span
                  className={cn(
                    'mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-lg',
                    meta.className,
                  )}
                  aria-hidden
                >
                  <Icon size={14} strokeWidth={2.25} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {row.title}
                    </span>
                    <Badge className={meta.className}>{meta.label}</Badge>
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                    {row.detail}
                  </span>
                  <span className="mt-1 block text-[0.6875rem] text-muted-foreground">
                    {formatDisplayDateTime(row.at)}
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
