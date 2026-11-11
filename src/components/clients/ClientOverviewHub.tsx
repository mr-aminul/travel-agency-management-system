import type { ReactNode } from 'react'
import {
  ChevronRight,
  FileText,
  Folder,
  Inbox,
  Plus,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { Badge } from '@/components/shadcn/badge'
import { Button } from '@/components/shadcn/button'
import { formatBalance } from '@/lib/clientsStore'
import {
  listClientFileRows,
  type ClientFileRow,
} from '@/lib/clientDocuments'
import { formatDisplayDate } from '@/lib/formatDate'
import { getCurrentStepLabel } from '@/lib/caseChecklist'
import { cn } from '@/lib/utils'
import type { Case, CaseStatus } from '@/types/case'
import type { Client } from '@/types/client'
import type { Payment } from '@/types/payment'

export type ClientOverviewHubProps = {
  client: Client
  cases: Case[]
  payments: Payment[]
  onOpenServices: () => void
  onOpenFiles: () => void
  onOpenPayments: (record?: boolean) => void
  onAddService: () => void
  onOpenService: (caseId: string) => void
  onOpenIdentity: (kind: 'passport' | 'nid') => void
  onOpenServicePaper: (caseId: string, docId: string) => void
}

function isOpenService(item: Case): boolean {
  return item.status !== 'Completed' && item.status !== 'Cancelled'
}

function caseStatusVariant(
  status: CaseStatus,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'Completed') return 'default'
  if (status === 'Cancelled') return 'destructive'
  if (status === 'On-Hold') return 'outline'
  return 'secondary'
}

function fileStatusVariant(
  row: ClientFileRow,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (row.statusLabel === 'Missing' || row.statusLabel === 'Number Only') {
    return 'destructive'
  }
  if (row.statusLabel === 'Approved' || row.statusLabel === 'On File') {
    return 'default'
  }
  return 'outline'
}

function OverviewPanel({
  title,
  icon: Icon,
  onOpen,
  action,
  children,
  empty,
  emptyAction,
}: {
  title: string
  icon: LucideIcon
  onOpen: () => void
  action?: ReactNode
  children: ReactNode
  empty?: boolean
  emptyAction?: ReactNode
}) {
  return (
    <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3.5 py-2.5">
        <button
          type="button"
          className="group flex min-w-0 items-center gap-2 rounded-md text-left transition-colors hover:text-foreground"
          onClick={onOpen}
          aria-label={`View all ${title.toLowerCase()}`}
        >
          <span
            className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-[var(--color-theme-subtle)] text-[var(--color-theme-ink)]"
            aria-hidden
          >
            <Icon size={15} strokeWidth={2.25} />
          </span>
          <h2 className="m-0 text-sm font-semibold">{title}</h2>
          <ChevronRight
            size={14}
            strokeWidth={2.25}
            className="shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
            aria-hidden
          />
        </button>
        {action ? <div className="flex shrink-0 items-center">{action}</div> : null}
      </div>
      {empty ? (
        <div className="flex flex-col items-center gap-2.5 px-3.5 py-7 text-center">
          <span
            className="inline-flex size-9 items-center justify-center rounded-full bg-muted text-muted-foreground"
            aria-hidden
          >
            <Inbox size={16} strokeWidth={2} />
          </span>
          <p className="m-0 text-sm text-muted-foreground">None Yet</p>
          {emptyAction}
        </div>
      ) : (
        <ul className="m-0 flex list-none flex-col divide-y divide-border p-0">
          {children}
        </ul>
      )}
    </section>
  )
}

function SnapshotRow({
  title,
  detail,
  trailing,
  onClick,
}: {
  title: string
  detail?: string
  trailing?: ReactNode
  onClick: () => void
}) {
  return (
    <li className="m-0 p-0">
      <button
        type="button"
        className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-muted/40"
        onClick={onClick}
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-foreground">
            {title}
          </span>
          {detail ? (
            <span className="mt-0.5 block truncate text-xs text-muted-foreground">
              {detail}
            </span>
          ) : null}
        </span>
        {trailing ? <span className="shrink-0">{trailing}</span> : null}
      </button>
    </li>
  )
}

export function ClientOverviewHub({
  client,
  cases,
  payments,
  onOpenServices,
  onOpenFiles,
  onOpenPayments,
  onAddService,
  onOpenService,
  onOpenIdentity,
  onOpenServicePaper,
}: ClientOverviewHubProps) {
  const openCases = cases.filter(isOpenService)
  const outstanding = openCases.reduce((sum, item) => sum + item.balance, 0)
  const fileRows = listClientFileRows(client, cases)
  const filesNeeding = fileRows.filter(
    (row) =>
      row.statusLabel === 'Missing' ||
      row.statusLabel === 'Number Only' ||
      row.statusLabel === 'Open',
  )
  const recentServices = [...cases]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 5)
  const recentPayments = [...payments]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5)
  const recentFiles = (filesNeeding.length ? filesNeeding : fileRows).slice(0, 5)

  const stats: Array<{
    id: string
    label: string
    value: string
    icon: LucideIcon
    urgent?: boolean
    onClick: () => void
  }> = [
    {
      id: 'services',
      label: 'Open Services',
      value: String(openCases.length),
      icon: Folder,
      onClick: onOpenServices,
    },
    {
      id: 'outstanding',
      label: 'Outstanding',
      value: formatBalance(outstanding),
      icon: Wallet,
      urgent: outstanding > 0,
      onClick: () => onOpenPayments(false),
    },
    {
      id: 'files',
      label: 'Files Needed',
      value: String(filesNeeding.length),
      icon: FileText,
      urgent: filesNeeding.length > 0,
      onClick: onOpenFiles,
    },
    {
      id: 'total',
      label: 'All Services',
      value: String(cases.length),
      icon: Folder,
      onClick: onOpenServices,
    },
  ]

  const openFile = (row: ClientFileRow) => {
    if (row.kind === 'identity' && row.identityKind) {
      onOpenIdentity(row.identityKind)
      return
    }
    if (row.caseId && row.docId) onOpenServicePaper(row.caseId, row.docId)
  }

  const panelActionClass =
    'h-9 gap-1.5 rounded-lg px-3 text-sm shadow-xs'

  const addServiceButton = (
    <Button
      type="button"
      size="sm"
      className={panelActionClass}
      onClick={onAddService}
      aria-label="Add Service"
    >
      <Plus data-icon="inline-start" aria-hidden />
      Add
    </Button>
  )

  const recordPaymentButton = (
    <Button
      type="button"
      size="sm"
      className={panelActionClass}
      onClick={() => onOpenPayments(true)}
      aria-label="Record Payment"
    >
      <Plus data-icon="inline-start" aria-hidden />
      Record
    </Button>
  )

  return (
    <div className="flex flex-col gap-4">
      <div
        className="pd-summary-stat-group"
        role="group"
        aria-label="Client overview stats"
      >
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Button
              key={stat.id}
              type="button"
              variant="ghost"
              className={cn('pd-summary-stat', stat.urgent && 'is-urgent')}
              onClick={stat.onClick}
            >
              <Icon
                className="pd-summary-stat__peek"
                size={76}
                strokeWidth={1.25}
                aria-hidden
              />
              <span className="pd-summary-stat__label">
                <Icon size={14} strokeWidth={1.75} aria-hidden />
                {stat.label}
              </span>
              <span className="pd-summary-stat__value tabular-nums">
                {stat.value}
              </span>
            </Button>
          )
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <OverviewPanel
          title="Services"
          icon={Folder}
          onOpen={onOpenServices}
          empty={recentServices.length === 0}
          emptyAction={addServiceButton}
          action={recentServices.length === 0 ? undefined : addServiceButton}
        >
          {recentServices.map((item) => (
            <SnapshotRow
              key={item.id}
              title={item.service}
              detail={getCurrentStepLabel(item)}
              trailing={
                <Badge variant={caseStatusVariant(item.status)}>
                  {item.status}
                </Badge>
              }
              onClick={() => onOpenService(item.id)}
            />
          ))}
        </OverviewPanel>

        <OverviewPanel
          title="Payments"
          icon={Wallet}
          onOpen={() => onOpenPayments(false)}
          empty={recentPayments.length === 0}
          emptyAction={recordPaymentButton}
          action={recentPayments.length === 0 ? undefined : recordPaymentButton}
        >
          {recentPayments.map((item) => (
            <SnapshotRow
              key={item.id}
              title={formatBalance(item.amount)}
              detail={`${formatDisplayDate(item.createdAt)} · ${item.method}`}
              onClick={() => onOpenPayments(false)}
            />
          ))}
        </OverviewPanel>

        <OverviewPanel
          title="Files"
          icon={FileText}
          onOpen={onOpenFiles}
          empty={recentFiles.length === 0}
        >
          {recentFiles.map((row) => (
            <SnapshotRow
              key={row.id}
              title={row.name}
              detail={row.source}
              trailing={
                <Badge variant={fileStatusVariant(row)}>
                  {row.statusLabel}
                </Badge>
              }
              onClick={() => openFile(row)}
            />
          ))}
        </OverviewPanel>
      </div>
    </div>
  )
}
