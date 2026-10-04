import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Folder, Plus } from 'lucide-react'
import { NewCaseForm } from '@/components/cases/NewCaseForm'
import {
  Badge,
  Button,
  EmptyState,
  Modal,
  SearchField,
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
import {
  CASE_SERVICE_OPTIONS,
  createCase,
} from '@/lib/casesStore'
import { formatBalance } from '@/lib/clientsStore'
import type { Case, CaseStatus, ServiceType, CreateCaseInput } from '@/types/case'
import '@/styles/layout-cases.css'

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: 'Pending', label: 'Pending' },
  { value: 'In-Progress', label: 'In progress' },
  { value: 'On-Hold', label: 'On hold' },
  { value: 'Completed', label: 'Completed' },
  { value: 'Cancelled', label: 'Cancelled' },
]

export function caseStatusBadgeVariant(status: CaseStatus): BadgeVariant {
  if (status === 'Completed') return 'completed'
  if (status === 'Pending') return 'pending'
  if (status === 'In-Progress') return 'in-progress'
  if (status === 'On-Hold') return 'on-hold'
  return 'danger'
}

function formatCaseDate(value?: string): string {
  if (!value) return '—'
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
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
    (item.assignedTo?.toLowerCase().includes(q) ?? false)
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
  emptyTitle?: string
  emptyDescription?: string
  emptyAction?: ReactNode
}

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
  emptyTitle = 'No cases yet',
  emptyDescription = 'Open a case to start tracking work.',
  emptyAction,
}: CasesListProps) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [statusFilters, setStatusFilters] = useState<string[]>([])
  const [serviceFilters, setServiceFilters] = useState<string[]>([])
  const [newCaseOpen, setNewCaseOpen] = useState(false)

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
    'Manpower'

  useEffect(() => {
    if (!syncNewWithSearchParams) return
    setNewCaseOpen(searchParams.get('new') === '1')
  }, [searchParams, syncNewWithSearchParams])

  const filtered = cases.filter((item) =>
    matchesFilters(
      item,
      search,
      statusFilters,
      showServiceColumn ? serviceFilters : [],
    ),
  )

  const hasActiveFilters =
    statusFilters.length > 0 ||
    (showServiceColumn && serviceFilters.length > 0)

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
    navigate(`/cases/${created.id}`)
  }

  const resetFilters = () => {
    setSearch('')
    setStatusFilters([])
    setServiceFilters([])
  }

  const newCaseButton = (
    <Button onClick={openNewCaseModal}>
      <Plus size={16} strokeWidth={2.25} aria-hidden />
      New case
    </Button>
  )

  const hasQuery =
    search.trim().length > 0 ||
    statusFilters.length > 0 ||
    (showServiceColumn && serviceFilters.length > 0)

  const body =
    filtered.length === 0 ? (
      <EmptyState
        icon={Folder}
        title={cases.length === 0 && !hasQuery ? emptyTitle : 'No cases match'}
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
            <TableHead>Case</TableHead>
            {showClientColumn && <TableHead>Client</TableHead>}
            {showServiceColumn && <TableHead>Service</TableHead>}
            <TableHead>Current step</TableHead>
            <TableHead>Destination</TableHead>
            <TableHead>Balance due</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((item) => (
            <TableRow
              key={item.id}
              className="pd-cases__row"
              onClick={() => navigate(`/cases/${item.id}`)}
            >
              <TableCell>
                <div className="pd-cases__identity-text">
                  <p className="pd-cases__name">{item.caseId}</p>
                  {item.assignedTo || item.departureDate ? (
                    <p className="pd-cases__meta">
                      {[
                        item.assignedTo,
                        item.departureDate
                          ? formatCaseDate(item.departureDate)
                          : undefined,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  ) : null}
                </div>
              </TableCell>
              {showClientColumn && <TableCell>{item.clientName}</TableCell>}
              {showServiceColumn && (
                <TableCell>
                  <Badge variant="neutral">{item.service}</Badge>
                </TableCell>
              )}
              <TableCell>
                <span className="pd-cases__step">{getCurrentStepLabel(item)}</span>
              </TableCell>
              <TableCell>{item.destination || '—'}</TableCell>
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
      <div className="pd-cases__toolbar">
        <SearchField
          className="pd-cases__search"
          placeholder="Search cases…"
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
                options={CASE_SERVICE_OPTIONS}
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
                }}
              >
                Clear
              </button>
            )}
          </div>
          {newCaseButton}
        </div>
      </div>

      {body}

      <Modal
        open={newCaseOpen}
        onClose={closeNewCaseModal}
        title="New case"
        description={
          lockClient
            ? 'Capture one purpose for this client.'
            : lockService
              ? `Open a ${resolvedService} case for a client.`
              : 'One case = one purpose for a client.'
        }
        className="pd-cases-modal"
      >
        <NewCaseForm
          onSubmit={handleCreateCase}
          onCancel={closeNewCaseModal}
          defaultClientId={resolvedClientId}
          lockClient={lockClient}
          defaultService={resolvedService}
          lockService={lockService}
        />
      </Modal>
    </div>
  )
}
