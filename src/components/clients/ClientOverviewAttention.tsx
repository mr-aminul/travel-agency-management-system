import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowRight } from 'lucide-react'
import { Badge } from '@/components/shadcn/badge'
import { toServiceBoardItem } from '@/lib/clientServiceBoard'
import { formatBalance } from '@/lib/clientsStore'
import { workDetailPath } from '@/lib/workPaths'
import { cn } from '@/lib/utils'
import type { Case } from '@/types/case'
import type { ClientInfoGap, ClientInfoGapId } from '@/lib/clientMissingInfo'
import type { StatusUpdateRequest } from '@/types/request'

export type ClientOverviewAttentionProps = {
  clientName: string
  gaps: ClientInfoGap[]
  cases: Case[]
  dueBalance: number
  pendingRequests: StatusUpdateRequest[]
  onOpenGap: (gapId: ClientInfoGapId) => void
  onOpenPayments: () => void
}

type AttentionRow = {
  id: string
  label: string
  detail?: string
  onClick?: () => void
  href?: string
}

export function ClientOverviewAttention({
  clientName,
  gaps,
  cases,
  dueBalance,
  pendingRequests,
  onOpenGap,
  onOpenPayments,
}: ClientOverviewAttentionProps) {
  const openCases = cases.filter(
    (item) => item.status !== 'Completed' && item.status !== 'Cancelled',
  )
  const boardItems = openCases
    .map((item) => toServiceBoardItem(item))
    .filter((item): item is NonNullable<typeof item> => item != null)

  const hasPassportGap = gaps.some((gap) => gap.id === 'passport')

  const attentionRows: AttentionRow[] = [
    ...gaps.map((gap) => ({
      id: `gap-${gap.id}`,
      label: `Add ${gap.label}`,
      onClick: () => onOpenGap(gap.id),
    })),
    ...boardItems
      .filter((item) => item.state === 'blocked' || item.state === 'on-hold')
      // Passport gaps already cover the same “add passport” job.
      .filter((item) => !(hasPassportGap && item.focus === 'profile'))
      .map((item) => ({
        id: `board-${item.id}`,
        label: item.service,
        detail: item.action,
        href: item.href,
      })),
    ...(dueBalance > 0
      ? [
          {
            id: 'due-balance',
            label: 'Collect Payment',
            detail: formatBalance(dueBalance),
            onClick: onOpenPayments,
          },
        ]
      : []),
    ...pendingRequests.map((request) => {
      const related = cases.find((item) => item.id === request.caseId)
      return {
        id: `request-${request.id}`,
        label: related?.service ?? 'Service Update',
        detail: `Mark as ${request.toStatus}`,
        href: related ? workDetailPath(related) : undefined,
      }
    }),
  ]

  if (attentionRows.length === 0) {
    return (
      <div
        className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm"
        aria-label={`${clientName} overview`}
      >
        Nothing needs attention
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4" aria-label={`${clientName} overview`}>
      <div
        className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
        aria-label="Needs attention"
      >
        <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
          <span
            className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--color-danger)_12%,var(--color-bg))] text-destructive"
            aria-hidden
          >
            <AlertTriangle size={15} strokeWidth={2.25} />
          </span>
          <p className="m-0 text-sm font-semibold">Needs Attention</p>
          <Badge variant="secondary">{attentionRows.length}</Badge>
        </div>
        <ul className="m-0 flex list-none flex-col divide-y divide-border p-0">
          {attentionRows.map((row) => {
            const body = (
              <>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-foreground">
                    {row.label}
                  </span>
                  {row.detail ? (
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {row.detail}
                    </span>
                  ) : null}
                </span>
                <ArrowRight
                  size={16}
                  strokeWidth={2.25}
                  className="shrink-0 text-muted-foreground"
                  aria-hidden
                />
              </>
            )
            const className =
              'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50'
            if (row.href) {
              return (
                <li key={row.id} className="m-0 p-0">
                  <Link to={row.href} className={className}>
                    {body}
                  </Link>
                </li>
              )
            }
            return (
              <li key={row.id} className="m-0 p-0">
                <button
                  type="button"
                  className={cn(className, 'cursor-pointer font-inherit')}
                  onClick={row.onClick}
                >
                  {body}
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
