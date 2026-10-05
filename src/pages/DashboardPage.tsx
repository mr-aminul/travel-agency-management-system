import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CheckCircle2,
  CircleDollarSign,
  FolderOpen,
  HandCoins,
  IdCard,
  Inbox,
  Users,
  type LucideIcon,
} from 'lucide-react'
import {
  Badge,
  EmptyState,
  PageHeader,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  type BadgeVariant,
} from '@/components/ui'
import { useCases } from '@/lib/casesStore'
import { useClients } from '@/lib/clientsStore'
import {
  buildDashboardRows,
  computeDashboardMetrics,
  dashboardFilterTitle,
  filterDashboardRows,
  formatBdt,
  serviceDashboardFilter,
  sortServicesByVolume,
  type DashboardFilter,
} from '@/lib/dashboardMetrics'
import { formatDisplayDate } from '@/lib/formatDate'
import { useEmployees } from '@/lib/employeesStore'
import { usePayments } from '@/lib/paymentsStore'
import { useRequests } from '@/lib/requestsStore'
import { useEnabledServiceOptions } from '@/lib/serviceCatalog'
import { iconForService } from '@/lib/serviceIcons'
import type { StatCardTone } from '@/components/StatCards'
import '@/styles/layout-ops.css'

const SERVICE_TONES: StatCardTone[] = ['brand', 'info', 'success', 'warning']

type MetricTile = {
  label: string
  value: string
  filter: Exclude<DashboardFilter, 'all'>
  icon: LucideIcon
  tone: StatCardTone
}

function dashboardTileTone(filter: Exclude<DashboardFilter, 'all'>): StatCardTone {
  if (filter === 'pending-requests' || filter === 'outstanding') return 'warning'
  if (filter === 'open-services' || filter === 'clients') return 'info'
  if (filter === 'completed-services' || filter === 'collected') return 'success'
  if (filter === 'employees') return 'muted'
  return 'brand'
}

function statusBadgeVariant(status: string): BadgeVariant {
  if (status === 'Completed' || status === 'Deployed' || status === 'Approved') {
    return 'completed'
  }
  if (status === 'Pending' || status === 'Lead' || status === 'Collected') {
    return 'pending'
  }
  if (status === 'In-Progress' || status === 'Active') return 'in-progress'
  if (status === 'On-Hold' || status === 'Inactive') return 'on-hold'
  if (status === 'Cancelled' || status === 'Rejected') return 'danger'
  return 'neutral'
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const clients = useClients()
  const cases = useCases()
  const payments = usePayments()
  const employees = useEmployees()
  const requests = useRequests()
  const serviceOptions = useEnabledServiceOptions()
  const [filter, setFilter] = useState<DashboardFilter>('all')

  const metrics = useMemo(
    () =>
      computeDashboardMetrics(clients, cases, payments, employees, requests),
    [clients, cases, payments, employees, requests],
  )

  const rows = useMemo(
    () =>
      filterDashboardRows(
        buildDashboardRows(clients, cases, payments, employees, requests),
        filter,
      ),
    [clients, cases, payments, employees, requests, filter],
  )

  const tiles: MetricTile[] = [
    {
      label: 'Pending requests',
      value: String(metrics.pendingRequests),
      filter: 'pending-requests',
      icon: Inbox,
      tone: dashboardTileTone('pending-requests'),
    },
    {
      label: 'Open services',
      value: String(metrics.openCases),
      filter: 'open-services',
      icon: FolderOpen,
      tone: dashboardTileTone('open-services'),
    },
    {
      label: 'Outstanding',
      value: formatBdt(metrics.outstanding),
      filter: 'outstanding',
      icon: CircleDollarSign,
      tone: dashboardTileTone('outstanding'),
    },
    {
      label: 'Collected',
      value: formatBdt(metrics.collected),
      filter: 'collected',
      icon: HandCoins,
      tone: dashboardTileTone('collected'),
    },
    {
      label: 'Clients',
      value: String(metrics.totalClients),
      filter: 'clients',
      icon: Users,
      tone: dashboardTileTone('clients'),
    },
    {
      label: 'Completed services',
      value: String(metrics.completedCases),
      filter: 'completed-services',
      icon: CheckCircle2,
      tone: dashboardTileTone('completed-services'),
    },
    {
      label: 'Employees',
      value: String(metrics.employees),
      filter: 'employees',
      icon: IdCard,
      tone: dashboardTileTone('employees'),
    },
    ...sortServicesByVolume(serviceOptions, metrics.serviceCounts).map(
      (option, index) => ({
        label: option.label,
        value: String(metrics.serviceCounts[option.value] ?? 0),
        filter: serviceDashboardFilter(option.value),
        icon: iconForService(option.value),
        tone: SERVICE_TONES[index % SERVICE_TONES.length],
      }),
    ),
  ]

  const selectFilter = (next: Exclude<DashboardFilter, 'all'>) => {
    setFilter((current) => (current === next ? 'all' : next))
  }

  return (
    <div className="pd-page pd-ops" aria-label="Dashboard">
      <PageHeader
        title="Dashboard"
        description="A snapshot of clients, services, money, and pending updates."
      />
      <div className="pd-ops__metrics pd-ops__metrics--grid">
        {tiles.map((tile) => {
          const Icon = tile.icon
          const isSelected = filter === tile.filter
          return (
            <button
              key={tile.label}
              type="button"
              className={[
                'pd-ops-metric-link',
                `pd-ops-metric-link--${tile.tone}`,
                isSelected ? 'is-selected' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-pressed={isSelected}
              onClick={() => selectFilter(tile.filter)}
            >
              <span className="pd-ops-metric-link__watermark" aria-hidden="true">
                <Icon size={92} strokeWidth={1.15} />
              </span>
              <span className="pd-ops-metric-link__head">
                <span className="pd-ops-metric-link__icon" aria-hidden>
                  <Icon size={18} />
                </span>
                <span className="pd-ops-metric-link__label">{tile.label}</span>
              </span>
              <span className="pd-ops-metric-link__value">{tile.value}</span>
            </button>
          )
        })}
      </div>

      <section className="pd-ops__section" aria-label="All in one">
        <div className="pd-ops__toolbar">
          <h2 className="pd-ops__section-title">All in one</h2>
          <p className="pd-ops__meta">
            {filter === 'all'
              ? `${rows.length} rows`
              : `${dashboardFilterTitle(filter)} · ${rows.length} rows`}
          </p>
        </div>
        {rows.length === 0 ? (
          <EmptyState
            title="Nothing to show"
            description="This card has no matching records yet."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Detail</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Checklist</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="pd-ops__data-row"
                  onClick={() => navigate(row.href)}
                >
                  <TableCell>{row.typeLabel}</TableCell>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>{row.detail || '—'}</TableCell>
                  <TableCell>
                    <Badge variant={statusBadgeVariant(row.status)}>
                      {row.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{row.checklist}</TableCell>
                  <TableCell>{row.amount}</TableCell>
                  <TableCell>{formatDisplayDate(row.date)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  )
}
