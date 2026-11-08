import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  FileText,
  Folder,
  UserRound,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
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
  documentsAlertCount: number
  pendingRequests: StatusUpdateRequest[]
  onOpenGap: (gapId: ClientInfoGapId) => void
  onOpenPayments: () => void
  onOpenProfile: () => void
  onOpenDocuments: () => void
  onOpenServices: () => void
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
  documentsAlertCount,
  pendingRequests,
  onOpenGap,
  onOpenPayments,
  onOpenProfile,
  onOpenDocuments,
  onOpenServices,
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
        detail: `${request.fromStatus} → ${request.toStatus}`,
        href: related ? workDetailPath(related) : undefined,
      }
    }),
  ]

  const stats: {
    id: string
    label: string
    value: string
    icon: LucideIcon
    tone: 'default' | 'money' | 'alert'
    onClick: () => void
  }[] = [
    {
      id: 'services',
      label: 'Services',
      value: String(openCases.length),
      icon: Folder,
      tone: 'default',
      onClick: onOpenServices,
    },
    {
      id: 'due',
      label: 'Due',
      value: formatBalance(dueBalance),
      icon: Wallet,
      tone: dueBalance > 0 ? 'money' : 'default',
      onClick: onOpenPayments,
    },
    {
      id: 'profile',
      label: 'Gaps',
      value: String(gaps.length),
      icon: UserRound,
      tone: gaps.length > 0 ? 'alert' : 'default',
      onClick: onOpenProfile,
    },
    {
      id: 'documents',
      label: 'Docs',
      value: String(documentsAlertCount),
      icon: FileText,
      tone: documentsAlertCount > 0 ? 'alert' : 'default',
      onClick: onOpenDocuments,
    },
  ]

  return (
    <div className="flex flex-col gap-4" aria-label={`${clientName} overview`}>
      <div
        className="grid grid-cols-2 gap-2 sm:grid-cols-4"
        role="group"
        aria-label="Client snapshot"
      >
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <button
              key={stat.id}
              type="button"
              className="flex min-w-0 flex-col gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-left shadow-sm transition-colors hover:bg-muted/40"
              onClick={stat.onClick}
            >
              <span className="flex items-center gap-2">
                <span
                  className={cn(
                    'inline-flex size-7 shrink-0 items-center justify-center rounded-lg',
                    stat.tone === 'money' &&
                      'bg-destructive/12 text-destructive',
                    stat.tone === 'alert' &&
                      'bg-amber-500/14 text-amber-900',
                    stat.tone === 'default' &&
                      'bg-[var(--color-theme-subtle)] text-[var(--color-theme-ink)]',
                  )}
                  aria-hidden
                >
                  <Icon size={14} strokeWidth={2.25} />
                </span>
                <span className="truncate text-xs font-medium text-muted-foreground">
                  {stat.label}
                </span>
              </span>
              <span
                className={cn(
                  'truncate text-lg font-semibold tabular-nums tracking-tight',
                  stat.tone === 'money' && 'text-destructive',
                  stat.tone !== 'money' && 'text-foreground',
                )}
              >
                {stat.value}
              </span>
            </button>
          )
        })}
      </div>

      {attentionRows.length > 0 ? (
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
      ) : null}
    </div>
  )
}
