import { Check } from 'lucide-react'
import { toServiceBoardItem } from '@/lib/clientServiceBoard'
import { cn } from '@/lib/utils'
import type { ClientInfoGap } from '@/lib/clientMissingInfo'
import type { Case } from '@/types/case'

export type ClientNextActionProps = {
  gaps: ClientInfoGap[]
  cases: Case[]
  dueBalance: number
  onOpenGap: (gapId: ClientInfoGap['id']) => void
  onOpenPayments: () => void
  onOpenService: (caseId: string) => void
  onAddService: () => void
}

function formatDue(amount: number) {
  return `৳${amount.toLocaleString('en-BD')}`
}

type NextItem = {
  id: string
  label: string
  detail: string
  tone: 'need' | 'wait' | 'done'
  onClick?: () => void
}

export function ClientNextAction({
  gaps,
  cases,
  dueBalance,
  onOpenGap,
  onOpenPayments,
  onOpenService,
  onAddService,
}: ClientNextActionProps) {
  const openCases = cases.filter(
    (item) => item.status !== 'Completed' && item.status !== 'Cancelled',
  )
  const boardRows = openCases
    .map((item) => ({ item, board: toServiceBoardItem(item) }))
    .filter(
      (row): row is { item: Case; board: NonNullable<typeof row.board> } =>
        row.board != null,
    )

  const items: NextItem[] = []

  for (const row of boardRows) {
    items.push({
      id: `service-${row.item.id}`,
      label: row.board.action,
      detail: row.board.stepLabel,
      tone:
        row.board.state === 'blocked' || row.board.state === 'on-hold'
          ? 'need'
          : 'wait',
      onClick: () => onOpenService(row.item.id),
    })
  }

  if (dueBalance > 0) {
    items.push({
      id: 'payment',
      label: `Collect ${formatDue(dueBalance)}`,
      detail: 'Due',
      tone: 'need',
      onClick: onOpenPayments,
    })
  }

  for (const gap of gaps) {
    items.push({
      id: `gap-${gap.id}`,
      label: gap.label,
      detail: 'Needed',
      tone: 'need',
      onClick: () => onOpenGap(gap.id),
    })
  }

  if (cases.length === 0) {
    items.push({
      id: 'add-service',
      label: 'Add a service',
      detail: 'Start',
      tone: 'wait',
      onClick: onAddService,
    })
  }

  if (items.length === 0) {
    items.push({
      id: 'clear',
      label: 'All clear',
      detail: '',
      tone: 'done',
    })
  }

  return (
    <section
      aria-label="Next"
      className="pd-client-elevated-panel overflow-hidden rounded-2xl"
    >
      <h2 className="m-0 border-b border-border px-3.5 py-2.5 text-sm font-semibold">
        Next
      </h2>
      <ul className="m-0 flex list-none flex-col p-0">
        {items.map((item) => {
          const rowClass = cn(
            'flex w-full items-center gap-3 px-3.5 py-2.5 text-left text-sm',
            item.onClick && 'hover:bg-muted/70',
          )
          const body = (
            <>
              <span
                className={cn(
                  'inline-flex size-4 shrink-0 items-center justify-center rounded-full',
                  item.tone === 'done' && 'bg-emerald-500/15 text-emerald-700',
                  item.tone === 'need' && 'bg-destructive/15 text-destructive',
                  item.tone === 'wait' && 'bg-primary/15 text-primary',
                )}
                aria-hidden
              >
                {item.tone === 'done' ? (
                  <Check size={12} strokeWidth={2.5} />
                ) : (
                  <span className="size-1.5 rounded-full bg-current" />
                )}
              </span>
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              {item.detail ? (
                <span
                  className={cn(
                    'max-w-[9rem] shrink-0 truncate text-xs text-muted-foreground',
                    item.tone === 'need' && 'text-destructive',
                  )}
                >
                  {item.detail}
                </span>
              ) : null}
            </>
          )

          return (
            <li key={item.id} className="border-b border-border last:border-b-0">
              {item.onClick ? (
                <button type="button" className={rowClass} onClick={item.onClick}>
                  {body}
                </button>
              ) : (
                <div className={rowClass}>{body}</div>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
