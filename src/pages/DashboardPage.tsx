import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Briefcase,
  ClipboardList,
  Folder,
  Handshake,
  Users,
  UsersRound,
  Wallet,
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
import { useEmployees } from '@/lib/employeesStore'
import { usePayments } from '@/lib/paymentsStore'
import { useRequests } from '@/lib/requestsStore'
import { useEnabledServiceOptions } from '@/lib/serviceCatalog'
import '@/styles/layout-ops.css'

type MetricTile = {
  label: string
  value: string
  filter: Exclude<DashboardFilter, 'all'>
  icon: LucideIcon
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
      icon: ClipboardList,
    },
    {
      label: 'Open services',
      value: String(metrics.openCases),
      filter: 'open-services',
      icon: Folder,
    },
    {
      label: 'Outstanding',
      value: formatBdt(metrics.outstanding),
      filter: 'outstanding',
      icon: Wallet,
    },
    {
      label: 'Collected',
      value: formatBdt(metrics.collected),
      filter: 'collected',
      icon: Wallet,
    },
    {
      label: 'Clients',
      value: String(metrics.totalClients),
      filter: 'clients',
      icon: Users,
    },
    {
      label: 'Completed services',
      value: String(metrics.completedCases),
      filter: 'completed-services',
      icon: Handshake,
    },
    {
      label: 'Employees',
      value: String(metrics.employees),
      filter: 'employees',
      icon: UsersRound,
    },
    ...sortServicesByVolume(serviceOptions, metrics.serviceCounts).map(
      (option) => ({
        label: option.label,
        value: String(metrics.serviceCounts[option.value] ?? 0),
        filter: serviceDashboardFilter(option.value),
        icon: Briefcase,
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
              className={
                isSelected
                  ? 'pd-ops-metric-link is-selected'
                  : 'pd-ops-metric-link'
              }
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
                  <TableCell>{row.date}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  )
}
