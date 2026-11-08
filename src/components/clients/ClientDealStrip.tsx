import { Link } from 'react-router-dom'
import { Folder } from 'lucide-react'
import { Badge } from '@/components/shadcn/badge'
import { Button } from '@/components/shadcn/button'
import { toServiceBoardItem } from '@/lib/clientServiceBoard'
import { formatBalance } from '@/lib/clientsStore'
import { workDetailPath } from '@/lib/workPaths'
import { cn } from '@/lib/utils'
import type { Case } from '@/types/case'

export type ClientDealStripProps = {
  cases: Case[]
  onCollectPayment: () => void
}

function moneyTone(due: number): string {
  if (due > 0) return 'border-transparent bg-amber-500/14 text-amber-900'
  return 'border-transparent bg-emerald-500/12 text-emerald-800'
}

export function ClientDealStrip({
  cases,
  onCollectPayment,
}: ClientDealStripProps) {
  const openCases = cases.filter(
    (item) => item.status !== 'Completed' && item.status !== 'Cancelled',
  )
  const primary =
    openCases.find((item) => item.balance > 0) ??
    openCases[0] ??
    cases.find((item) => item.status === 'Completed') ??
    cases[0]

  if (!primary) return null

  const board = toServiceBoardItem(primary)
  const place =
    primary.destination?.trim() ||
    primary.serviceCountry?.trim() ||
    board?.destination ||
    ''
  const stepLabel = board?.stepLabel ?? primary.currentStepId
  const stepMeta = board
    ? `${board.stepNumber}/${board.stepCount}`
    : null
  const due = Math.max(0, primary.balance)

  return (
    <section
      className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-border bg-card px-3 py-2.5 shadow-sm"
      aria-label="Active service"
    >
      <span
        className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-[var(--color-theme-subtle)] text-[var(--color-theme-ink)]"
        aria-hidden
      >
        <Folder size={15} strokeWidth={2.25} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="m-0 truncate text-sm font-semibold text-foreground">
          {primary.service}
          {place ? (
            <span className="font-medium text-muted-foreground">
              {' '}
              · {place}
            </span>
          ) : null}
        </p>
        <p className="mt-0.5 m-0 truncate text-xs text-muted-foreground">
          {stepLabel}
          {stepMeta ? ` · ${stepMeta}` : null}
        </p>
      </div>

      <Badge className={cn('shrink-0 tabular-nums', moneyTone(due))}>
        {due > 0 ? `Due ${formatBalance(due)}` : 'Paid'}
      </Badge>

      <div className="flex shrink-0 items-center gap-2">
        {due > 0 ? (
          <Button
            type="button"
            className="h-8 rounded-lg px-3"
            onClick={onCollectPayment}
          >
            Collect
          </Button>
        ) : null}
        <Button asChild variant="outline" className="h-8 rounded-lg px-3">
          <Link to={workDetailPath(primary)}>Open</Link>
        </Button>
      </div>
    </section>
  )
}
