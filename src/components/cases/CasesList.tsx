import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Badge, Button, EmptyState, FilterChip, FilterChips, FilterPopover, SearchField, Select, SideDrawer, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, type BadgeVariant } from '@/components/ui'
import {
  CheckCircle2,
  CircleDot,
  CircleOff,
  Clock,
  Folder,
  ListChecks,
  PauseCircle,
  PlayCircle,
  Plus,
  Wallet,
} from 'lucide-react'
import { NewCaseForm } from '@/components/cases/NewCaseForm'
import { StatCards } from '@/components/StatCards'
import { getCurrentStepLabel } from '@/lib/caseChecklist'
import { createCase, getEnabledServiceOptions } from '@/lib/casesStore'
import { useEnabledServiceOptions } from '@/lib/serviceCatalog'
import { formatBalance } from '@/lib/clientsStore'
import { caseServiceFee } from '@/lib/caseMoney'
import { getEmployeeDisplayName } from '@/lib/employeesStore'
import { formatBdt } from '@/lib/dashboardMetrics'
import { formatDisplayDate } from '@/lib/formatDate'
import { cx } from '@/lib/cx'
import {
  resolveServiceFromSlug,
  useCatalogServiceRefs,
} from '@/lib/serviceCatalog'
import { useServiceIconOverrides } from '@/lib/serviceIconOverridesStore'
import { iconForService } from '@/lib/serviceIcons'
import { workDetailPath } from '@/lib/workPaths'
import {
  serviceToSlug,
  type Case,
  type CaseStatus,
  type CreateCaseInput,
  type ServiceType,
} from '@/types/case'
import '@/styles/layout-cases.css'

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: 'Pending', label: 'Pending' },
  { value: 'In-Progress', label: 'In progress' },
  { value: 'On-Hold', label: 'On hold' },
  { value: 'Completed', label: 'Completed' },
  { value: 'Cancelled', label: 'Cancelled' },
]

const CASE_STATUSES: CaseStatus[] = [
  'Pending',
  'In-Progress',
  'On-Hold',
  'Completed',
  'Cancelled',
]

type ServiceStatId = 'all' | CaseStatus | 'due'

function isOpenService(item: Case): boolean {
  return item.status !== 'Completed' && item.status !== 'Cancelled'
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
  const catalog = useCatalogServiceRefs()
  const serviceFilterOptions = useEnabledServiceOptions()
  useServiceIconOverrides()
  const showServiceChips = showServiceColumn && showToolbar && !embedded
  const urlService = syncNewWithSearchParams
    ? resolveServiceFromSlug(searchParams.get('service') ?? '')
    : undefined

  useEffect(() => {
    if (!serviceFeeHighlightToken) return
    setHighlightServiceFee(true)
    const timer = window.setTimeout(() => {
      setHighlightServiceFee(false)
    }, SERVICE_FEE_HIGHLIGHT_MS)
    return () => window.clearTimeout(timer)
  }, [serviceFeeHighlightToken])

  useEffect(() => {
    if (!showServiceChips || !syncNewWithSearchParams) return
    setServiceFilters(urlService ? [urlService] : [])
  }, [showServiceChips, syncNewWithSearchParams, urlService])

  const feeCellClass = cx(
    'pd-cases__balance',
    'pd-cases__fee',
    highlightServiceFee && 'is-highlight',
  )

  const serviceScoped = useMemo(() => {
    if (!showServiceColumn || serviceFilters.length === 0) return cases
    return cases.filter((item) => serviceFilters.includes(item.service))
  }, [cases, serviceFilters, showServiceColumn])

  const stats = useMemo(() => {
    const byStatus: Record<CaseStatus, number> = {
      Pending: 0,
      'In-Progress': 0,
      'On-Hold': 0,
      Completed: 0,
      Cancelled: 0,
    }
    let outstanding = 0
    for (const item of serviceScoped) {
      byStatus[item.status] += 1
      if (isOpenService(item)) outstanding += item.balance
    }
    return {
      total: serviceScoped.length,
      byStatus,
      outstanding,
    }
  }, [serviceScoped])

  const resolvedClientId =
    defaultClientId ??
    (syncNewWithSearchParams
      ? (searchParams.get('client') ?? undefined)
      : undefined)
  const resolvedService =
    (serviceFilters.length === 1 ? serviceFilters[0] : undefined) ??
    defaultService ??
    getEnabledServiceOptions()[0]?.value ??
    'Work Permit Visa'

  useEffect(() => {
    if (!syncNewWithSearchParams) return
    setNewCaseOpen(searchParams.get('new') === '1')
  }, [searchParams, syncNewWithSearchParams])

  const filtered = serviceScoped.filter((item) => {
    if (dueOnly && (!isOpenService(item) || item.balance <= 0)) return false
    return matchesFilters(
      item,
      search,
      statusFilters,
      showServiceChips ? [] : showServiceColumn ? serviceFilters : [],
    )
  })

  const hasActiveFilters =
    statusFilters.length > 0 ||
    dueOnly ||
    (!showServiceChips && showServiceColumn && serviceFilters.length > 0)

  const selectedStat: ServiceStatId | undefined = dueOnly
    ? 'due'
    : statusFilters.length === 1 &&
      CASE_STATUSES.includes(statusFilters[0] as CaseStatus)
      ? (statusFilters[0] as CaseStatus)
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
    setStatusFilters([next])
  }

  const writeServiceQuery = (service?: string) => {
    if (!syncNewWithSearchParams) return
    const next = new URLSearchParams(searchParams)
    if (service) next.set('service', serviceToSlug(service))
    else next.delete('service')
    setSearchParams(next, { replace: true })
  }

  const selectServiceChip = (key: string | null) => {
    const alreadySelected =
      key != null && serviceFilters.length === 1 && serviceFilters[0] === key
    const next = !key || alreadySelected ? [] : [key]
    setServiceFilters(next)
    writeServiceQuery(next[0])
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
    writeServiceQuery()
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
            <TableHead>Created at</TableHead>
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
          {filtered.map((item) => {
            const ServiceIcon = iconForService(item.service)
            return (
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
                  <span className="pd-cases__service">
                    <span className="pd-cases__service-icon" aria-hidden>
                      <ServiceIcon size={15} strokeWidth={2} />
                    </span>
                    <p className="pd-cases__name">{item.service}</p>
                  </span>
                </TableCell>
                <TableCell className="pd-table__code">{item.caseId}</TableCell>
                <TableCell>{formatCaseDate(item.createdAt)}</TableCell>
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
            )
          })}
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
              id: 'Pending',
              label: 'Pending',
              value: String(stats.byStatus.Pending),
              icon: Clock,
              tone: 'warning',
            },
            {
              id: 'In-Progress',
              label: 'In progress',
              value: String(stats.byStatus['In-Progress']),
              icon: PlayCircle,
              tone: 'info',
            },
            {
              id: 'On-Hold',
              label: 'On hold',
              value: String(stats.byStatus['On-Hold']),
              icon: PauseCircle,
              tone: 'muted',
            },
            {
              id: 'Completed',
              label: 'Completed',
              value: String(stats.byStatus.Completed),
              icon: CheckCircle2,
              tone: 'success',
            },
            {
              id: 'Cancelled',
              label: 'Cancelled',
              value: String(stats.byStatus.Cancelled),
              icon: CircleOff,
              tone: 'muted',
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
              {showServiceColumn && !showServiceChips && (
                <Select
                  className="pd-cases__filter"
                  label="Service"
                  multiple
                  searchable
                  placeholder="All services"
                  searchPlaceholder="Search services…"
                  value={serviceFilters}
                  onChange={(event) => setServiceFilters(event.target.value)}
                  options={serviceFilterOptions}
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
                    setDueOnly(false)
                    if (!showServiceChips) {
                      setServiceFilters([])
                      writeServiceQuery()
                    }
                  }}
                >
                  Clear
                </button>
              )}
            </div>
            <FilterPopover
              className="pd-cases__mobile-filters"
              sectionLabel="Service attributes"
              dimensions={[
                ...(showServiceColumn && !showServiceChips
                  ? [
                    {
                      id: 'service',
                      label: 'Service',
                      icon: ListChecks,
                      options: serviceFilterOptions,
                      value: serviceFilters,
                      onChange: (value: string[]) => {
                        setServiceFilters(value)
                        writeServiceQuery(
                          value.length === 1 ? value[0] : undefined,
                        )
                      },
                    },
                  ]
                  : []),
                {
                  id: 'status',
                  label: 'Status',
                  icon: CircleDot,
                  options: STATUS_FILTERS,
                  value: statusFilters,
                  onChange: setStatusFilters,
                },
              ]}
              onClearAll={() => {
                setStatusFilters([])
                setDueOnly(false)
                if (!showServiceChips) {
                  setServiceFilters([])
                  writeServiceQuery()
                }
              }}
            />
            {newCaseButton}
          </div>
        </div>
      ) : null}

      {showServiceChips ? (
        <FilterChips label="Filter by service type">
          <FilterChip
            active={serviceFilters.length === 0}
            onClick={() => selectServiceChip(null)}
          >
            <ListChecks size={15} strokeWidth={2} aria-hidden />
            All services
          </FilterChip>
          {catalog.map((item) => {
            const Icon = iconForService(item.key)
            const selected =
              serviceFilters.length === 1 && serviceFilters[0] === item.key
            return (
              <FilterChip
                key={item.key}
                active={selected}
                onClick={() => selectServiceChip(item.key)}
              >
                <Icon size={15} strokeWidth={2} aria-hidden />
                {item.label}
              </FilterChip>
            )
          })}
        </FilterChips>
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
