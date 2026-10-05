import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle2, CircleDot, Folder, Plus, Wallet } from 'lucide-react'
import { NewCaseForm } from '@/components/cases/NewCaseForm'
import { StatCards } from '@/components/StatCards'
import {
  Badge,
  Button,
  EmptyState,
  SearchField,
  SideDrawer,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  type BadgeVariant,
} from '@/components/ui'
import { getCurrentStepLabel } from '@/lib/caseChecklist'
import { createCase, getEnabledServiceOptions } from '@/lib/casesStore'
import { formatBalance } from '@/lib/clientsStore'
import { caseServiceFee } from '@/lib/caseMoney'
import { getEmployeeDisplayName } from '@/lib/employeesStore'
import { formatBdt } from '@/lib/dashboardMetrics'
import { formatDisplayDate } from '@/lib/formatDate'
import { cx } from '@/lib/cx'
import { workDetailPath } from '@/lib/workPaths'
import type { Case, CaseStatus, ServiceType, CreateCaseInput } from '@/types/case'
import '@/styles/layout-cases.css'

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: 'Pending', label: 'Pending' },
  { value: 'In-Progress', label: 'In progress' },
  { value: 'On-Hold', label: 'On hold' },
  { value: 'Completed', label: 'Completed' },
  { value: 'Cancelled', label: 'Cancelled' },
]

const OPEN_STATUSES = ['Pending', 'In-Progress', 'On-Hold'] as const

type ServiceStatId = 'all' | 'open' | 'Completed' | 'due'

function isOpenService(item: Case): boolean {
  return item.status !== 'Completed' && item.status !== 'Cancelled'
}

function isOpenStatusFilter(statusFilters: string[]): boolean {
  return (
    statusFilters.length === OPEN_STATUSES.length &&
    OPEN_STATUSES.every((status) => statusFilters.includes(status))
  )
}

export function caseStatusBadgeVariant(status: CaseStatus): BadgeVariant {
  if (status === 'Completed') return 'completed'
  if (status === 'Pending') return 'pending'
  if (status === 'In-Progress') return 'in-progress'
  if (status === 'On-Hold') return 'on-hold'
  return 'danger'
}

function formatCaseDate(value?: string): string {
  return formatDisplayDate(value)
}

function matchesFilters(
  item: Case,
  search: string,
  statusFilters: string[],
  serviceFilters: string[],
): boolean {
  const q = search.trim().toLowerCase()
  const matchSearch =
    !q ||
    item.caseId.toLowerCase().includes(q) ||
    item.clientName.toLowerCase().includes(q) ||
    item.service.toLowerCase().includes(q) ||
    (item.destination?.toLowerCase().includes(q) ?? false) ||
    (item.assignedTo?.toLowerCase().includes(q) ?? false) ||
    getEmployeeDisplayName(item.assignedTo).toLowerCase().includes(q)
  const matchStatus =
    statusFilters.length === 0 || statusFilters.includes(item.status)
  const matchService =
    serviceFilters.length === 0 || serviceFilters.includes(item.service)
  return matchSearch && matchStatus && matchService
}

export type CasesListProps = {
  /** Already-scoped cases for this view (do not pass the full store). */
  cases: Case[]
  label: string
  /** Show Client column (hide on client profile). */
  showClientColumn?: boolean
  /** Show Service column + filter (all-cases and client profile). */
  showServiceColumn?: boolean
  defaultClientId?: string
  lockClient?: boolean
  /** Prefill for new-case form; URL `service` wins when syncing search params. */
  defaultService?: ServiceType
  lockService?: boolean
  /** Keep `?new=1` in the URL (cases routes). */
  syncNewWithSearchParams?: boolean
  /** Omit page chrome when embedded in a tab. */
  embedded?: boolean
  /** Hide search, filters, and the add-service control (overview summaries). */
  showToolbar?: boolean
  emptyTitle?: string
  emptyDescription?: string
  emptyAction?: ReactNode
  /** Highlight the open service on a client profile. */
  selectedId?: string
  /** Bump this to flash the Service fee column for a few seconds. */
  serviceFeeHighlightToken?: number
}

export const SERVICE_FEE_HIGHLIGHT_MS = 3000

export function CasesList({
  cases,
  label,
  showClientColumn = true,
  showServiceColumn = false,
  defaultClientId,
  lockClient = false,
  defaultService,
  lockService = false,
  syncNewWithSearchParams = false,
  embedded = false,
  showToolbar = true,
  emptyTitle = 'No services yet',
  emptyDescription = 'Add a service to start tracking steps, documents, and payments.',
  emptyAction,
  selectedId,
  serviceFeeHighlightToken = 0,
}: CasesListProps) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [statusFilters, setStatusFilters] = useState<string[]>([])
  const [serviceFilters, setServiceFilters] = useState<string[]>([])
  const [newCaseOpen, setNewCaseOpen] = useState(false)
  const [dueOnly, setDueOnly] = useState(false)
  const [highlightServiceFee, setHighlightServiceFee] = useState(false)

  useEffect(() => {
    if (!serviceFeeHighlightToken) return
    setHighlightServiceFee(true)
    const timer = window.setTimeout(() => {
      setHighlightServiceFee(false)
    }, SERVICE_FEE_HIGHLIGHT_MS)
    return () => window.clearTimeout(timer)
  }, [serviceFeeHighlightToken])

  const feeCellClass = cx(
    'pd-cases__balance',
    'pd-cases__fee',
    highlightServiceFee && 'is-highlight',
  )

  const stats = useMemo(() => {
    let open = 0
    let completed = 0
    let outstanding = 0
    for (const item of cases) {
      if (item.status === 'Completed') completed += 1
      if (isOpenService(item)) {
        open += 1
        outstanding += item.balance
      }
    }
    return {
      total: cases.length,
      open,
      completed,
      outstanding,
    }
  }, [cases])

  const resolvedClientId =
    defaultClientId ??
    (syncNewWithSearchParams
      ? (searchParams.get('client') ?? undefined)
      : undefined)
  const resolvedService =
    (syncNewWithSearchParams
      ? (searchParams.get('service') as ServiceType | null)
      : null) ??
    defaultService ??
    'Work Permit Visa'

  useEffect(() => {
    if (!syncNewWithSearchParams) return
    setNewCaseOpen(searchParams.get('new') === '1')
  }, [searchParams, syncNewWithSearchParams])

  const filtered = cases.filter((item) => {
    if (dueOnly && (!isOpenService(item) || item.balance <= 0)) return false
    return matchesFilters(
      item,
      search,
      statusFilters,
      showServiceColumn ? serviceFilters : [],
    )
  })

  const hasActiveFilters =
    statusFilters.length > 0 ||
    dueOnly ||
    (showServiceColumn && serviceFilters.length > 0)

  const selectedStat: ServiceStatId | undefined = dueOnly
    ? 'due'
    : isOpenStatusFilter(statusFilters)
      ? 'open'
      : statusFilters.length === 1 && statusFilters[0] === 'Completed'
        ? 'Completed'
        : statusFilters.length === 0
          ? 'all'
          : undefined

  const selectStat = (id: string) => {
    const next = id as ServiceStatId
    if (next === selectedStat || next === 'all') {
      setStatusFilters([])
      setDueOnly(false)
      return
    }
    if (next === 'due') {
      setStatusFilters([])
      setDueOnly(true)
      return
    }
    setDueOnly(false)
    if (next === 'open') {
      setStatusFilters([...OPEN_STATUSES])
      return
    }
    setStatusFilters(['Completed'])
  }

  const openNewCaseModal = () => {
    setNewCaseOpen(true)
    if (!syncNewWithSearchParams) return
    const next = new URLSearchParams(searchParams)
    next.set('new', '1')
    if (searchParams.get('new') !== '1') {
      setSearchParams(next, { replace: true })
    }
  }

  const closeNewCaseModal = () => {
    setNewCaseOpen(false)
    if (!syncNewWithSearchParams) return
    const next = new URLSearchParams(searchParams)
    next.delete('new')
    setSearchParams(next, { replace: true })
  }

  const handleCreateCase = (input: CreateCaseInput) => {
    const created = createCase(input)
    closeNewCaseModal()
    navigate(workDetailPath(created))
  }

  const resetFilters = () => {
    setSearch('')
    setStatusFilters([])
    setServiceFilters([])
    setDueOnly(false)
  }

  const newCaseButton = (
    <Button onClick={openNewCaseModal}>
      <Plus size={16} strokeWidth={2.25} aria-hidden />
      Add service
    </Button>
  )

  const hasQuery =
    search.trim().length > 0 ||
    statusFilters.length > 0 ||
    dueOnly ||
    (showServiceColumn && serviceFilters.length > 0)

  const body =
    filtered.length === 0 ? (
      <EmptyState
        icon={Folder}
        title={cases.length === 0 && !hasQuery ? emptyTitle : 'No services match'}
        description={
          cases.length === 0 && !hasQuery
            ? emptyDescription
            : 'Try a different search or clear filters.'
        }
        action={
          cases.length === 0 && !hasQuery ? (
            (emptyAction ?? newCaseButton)
          ) : (
            <Button variant="secondary" size="sm" onClick={resetFilters}>
              Reset filters
            </Button>
          )
        }
      />
    ) : (
      <Table>
          <TableHeader>
          <TableRow>
            <TableHead>Service</TableHead>
            <TableHead>ID</TableHead>
            {showClientColumn && <TableHead>Client</TableHead>}
            <TableHead>Current step</TableHead>
            <TableHead>Destination</TableHead>
            <TableHead>Departure</TableHead>
            <TableHead
              className={cx('pd-cases__fee', highlightServiceFee && 'is-highlight')}
            >
              Service fee
            </TableHead>
            <TableHead>Balance due</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((item) => (
            <TableRow
              key={item.id}
              className={cx(
                'pd-cases__row',
                item.id === selectedId && 'is-selected',
              )}
              aria-selected={item.id === selectedId ? true : undefined}
              onClick={() => navigate(workDetailPath(item))}
            >
              <TableCell>
                <p className="pd-cases__name">{item.service}</p>
              </TableCell>
              <TableCell className="pd-table__code">{item.caseId}</TableCell>
              {showClientColumn && <TableCell>{item.clientName}</TableCell>}
              <TableCell>
                <span className="pd-cases__step">{getCurrentStepLabel(item)}</span>
              </TableCell>
              <TableCell>{item.destination || '—'}</TableCell>
              <TableCell>{formatCaseDate(item.departureDate)}</TableCell>
              <TableCell className={feeCellClass}>
                {formatBalance(caseServiceFee(item))}
              </TableCell>
              <TableCell className="pd-cases__balance">
                {formatBalance(item.balance)}
              </TableCell>
              <TableCell>
                <Badge variant={caseStatusBadgeVariant(item.status)}>
                  {item.status}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )

  return (
    <div
      className={embedded ? 'pd-cases pd-cases--embedded' : 'pd-page pd-cases'}
      aria-label={label}
    >
      {!embedded ? (
        <StatCards
          label="Service stats"
          selectedId={selectedStat}
          onSelect={selectStat}
          cards={[
            {
              id: 'all',
              label: 'Total services',
              value: String(stats.total),
              icon: Folder,
              tone: 'brand',
            },
            {
              id: 'open',
              label: 'Open',
              value: String(stats.open),
              icon: CircleDot,
              tone: 'info',
            },
            {
              id: 'Completed',
              label: 'Completed',
              value: String(stats.completed),
              icon: CheckCircle2,
              tone: 'success',
            },
            {
              id: 'due',
              label: 'Outstanding',
              value: formatBdt(stats.outstanding),
              icon: Wallet,
              tone: 'warning',
            },
          ]}
        />
      ) : null}
      {showToolbar ? (
        <div className="pd-cases__toolbar">
          <SearchField
            className="pd-cases__search"
            placeholder="Search services…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onClear={() => setSearch('')}
          />

          <div className="pd-cases__toolbar-end">
            <div className="pd-cases__filters">
              {showServiceColumn && (
                <Select
                  className="pd-cases__filter"
                  label="Service"
                  multiple
                  searchable
                  placeholder="All services"
                  searchPlaceholder="Search services…"
                  value={serviceFilters}
                  onChange={(event) => setServiceFilters(event.target.value)}
                  options={getEnabledServiceOptions()}
                />
              )}
              <Select
                className="pd-cases__filter"
                label="Status"
                multiple
                searchable
                placeholder="All statuses"
                searchPlaceholder="Search statuses…"
                value={statusFilters}
                onChange={(event) => setStatusFilters(event.target.value)}
                options={STATUS_FILTERS}
              />
              {hasActiveFilters && (
                <button
                  type="button"
                  className="pd-cases__clear"
                  onClick={() => {
                    setStatusFilters([])
                    setServiceFilters([])
                    setDueOnly(false)
                  }}
                >
                  Clear
                </button>
              )}
            </div>
            {newCaseButton}
          </div>
        </div>
      ) : null}

      {body}

      <SideDrawer
        open={newCaseOpen}
        onClose={closeNewCaseModal}
        title="Add service"
        description={
          lockClient
            ? 'What does this client need? Progress starts at the first step of that service.'
            : lockService
              ? `Add a ${resolvedService} service for a client.`
              : 'Pick the client and the service they need.'
        }
        className="pd-cases-drawer"
      >
        <NewCaseForm
          onSubmit={handleCreateCase}
          onCancel={closeNewCaseModal}
          defaultClientId={resolvedClientId}
          lockClient={lockClient}
          defaultService={resolvedService}
          lockService={lockService}
        />
      </SideDrawer>
    </div>
  )
}
