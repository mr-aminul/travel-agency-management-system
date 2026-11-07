import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ConfirmDialog } from '@/components/shadcn/confirm-dialog'
import { Badge } from '@/components/shadcn/badge'
import { Button } from '@/components/shadcn/button'
import { Checkbox } from '@/components/shadcn/checkbox'
import { Input } from '@/components/shadcn/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/shadcn/popover'
import {
  chromeHeadClass,
  elevatedPageClass,
  floatingSheetClass,
  summaryStatClass,
  summaryStatGroupClass,
  summaryStatLabelClass,
  summaryStatPeekClass,
  summaryStatValueClass,
  filterChipClass,
  pureWhiteFieldClass,
  pureWhiteOutlineClass,
} from '@/components/clients/shadcnChrome'
import {
  Empty,
  EmptyContent,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/shadcn/empty'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/shadcn/sheet'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/shadcn/table'
import {
  CheckCircle2,
  CircleOff,
  Clock,
  Folder,
  ListChecks,
  ListFilter,
  PauseCircle,
  PlayCircle,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  Wallet,
} from 'lucide-react'
import { NewCaseForm } from '@/components/cases/NewCaseForm'
import { getCurrentStepLabel } from '@/lib/caseChecklist'
import { createCase, deleteCase, getEnabledServiceOptions } from '@/lib/casesStore'
import { useEnabledServiceOptions } from '@/lib/serviceCatalog'
import { formatBalance } from '@/lib/clientsStore'
import { caseServiceFee } from '@/lib/caseMoney'
import { getEmployeeDisplayName } from '@/lib/employeesStore'
import { isOverdueReceivable } from '@/lib/dashboardInsights'
import { formatBdt } from '@/lib/dashboardMetrics'
import { formatDisplayDate } from '@/lib/formatDate'
import { cx } from '@/lib/cx'
import { cn } from '@/lib/utils'
import {
  resolveServiceFromSlug,
  useCatalogServiceRefs,
} from '@/lib/serviceCatalog'
import { useServiceIconOverrides } from '@/lib/serviceIconOverridesStore'
import { iconForService } from '@/lib/serviceIcons'
import { notifyIfPendingApproval } from '@/lib/notifyPendingApproval'
import { getPaymentsByCaseId } from '@/lib/paymentsStore'
import { workDetailPath } from '@/lib/workPaths'
import {
  serviceToSlug,
  type Case,
  type CaseStatus,
  type CreateCaseInput,
  type ServiceType,
} from '@/types/case'

const outlineControl = pureWhiteOutlineClass

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: 'Pending', label: 'Pending' },
  { value: 'In-Progress', label: 'In Progress' },
  { value: 'On-Hold', label: 'On Hold' },
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

function caseStatusShadcnVariant(
  status: CaseStatus,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'Completed') return 'default'
  if (status === 'Cancelled') return 'destructive'
  if (status === 'On-Hold') return 'outline'
  return 'secondary'
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

function FilterChoices({
  label,
  options,
  selected,
  onChange,
}: {
  label: string
  options: { value: string; label: string }[]
  selected: string[]
  onChange: (next: string[]) => void
}) {
  const allSelected =
    options.length > 0 && options.every((option) => selected.includes(option.value))

  function toggle(value: string) {
    onChange(
      selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value],
    )
  }

  return (
    <>
      <div className="px-2.5 py-1.5 text-xs font-medium text-muted-foreground">
        Filter {label}
      </div>
      <div className="h-px bg-border" />
      <div
        role="button"
        tabIndex={0}
        className="flex w-full cursor-pointer items-center gap-2 px-2.5 py-1.5 text-left text-sm hover:bg-muted"
        onClick={() =>
          onChange(allSelected ? [] : options.map((option) => option.value))
        }
        onKeyDown={(event) => {
          if (event.key !== 'Enter' && event.key !== ' ') return
          event.preventDefault()
          onChange(allSelected ? [] : options.map((option) => option.value))
        }}
      >
        <Checkbox checked={allSelected} tabIndex={-1} aria-hidden className="pointer-events-none" />
        <span>{allSelected ? 'Deselect All' : 'Select All'}</span>
      </div>
      <div className="h-px bg-border" />
      <div
        className="max-h-56 overflow-y-auto py-1"
        role="listbox"
        aria-label={`${label} values`}
        aria-multiselectable
      >
        {options.length === 0 ? (
          <p className="px-2.5 py-2 text-sm text-muted-foreground">None Yet</p>
        ) : (
          options.map((option) => {
            const isSelected = selected.includes(option.value)
            return (
              <div
                key={option.value}
                role="option"
                tabIndex={0}
                aria-selected={isSelected}
                className="flex w-full cursor-pointer items-center gap-2 px-2.5 py-1.5 text-left text-sm hover:bg-muted"
                onClick={() => toggle(option.value)}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter' && event.key !== ' ') return
                  event.preventDefault()
                  toggle(option.value)
                }}
              >
                <Checkbox
                  checked={isSelected}
                  tabIndex={-1}
                  aria-hidden
                  className="pointer-events-none"
                />
                <span className="min-w-0 truncate">{option.label}</span>
              </div>
            )
          })
        )}
      </div>
    </>
  )
}

function ToolbarMultiFilter({
  label,
  options,
  selected,
  onChange,
  className,
}: {
  label: string
  options: { value: string; label: string }[]
  selected: string[]
  onChange: (next: string[]) => void
  className?: string
}) {
  const active = selected.length > 0
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            outlineControl,
            active &&
              'border-[var(--color-theme)] !font-semibold ring-1 ring-[var(--color-theme)]',
            className,
          )}
          aria-label={
            active ? `Filter ${label}, ${selected.length} selected` : `Filter ${label}`
          }
        >
          <ListFilter data-icon="inline-start" aria-hidden />
          {label}
          {active ? (
            <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1.5 tabular-nums">
              {selected.length}
            </Badge>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 !gap-0 !p-0">
        <FilterChoices
          label={label}
          options={options}
          selected={selected}
          onChange={onChange}
        />
      </PopoverContent>
    </Popover>
  )
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
  emptyAction?: ReactNode
  /** Highlight the open service on a client profile. */
  selectedId?: string
  /** Bump this to flash the Service fee column for a few seconds. */
  serviceFeeHighlightToken?: number
  /** List / Board control when this list is the Services page. */
  viewToggle?: ReactNode
  /** Show a delete action on each row (client overview services table). */
  allowDelete?: boolean
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
  emptyAction,
  selectedId,
  serviceFeeHighlightToken = 0,
  viewToggle,
  allowDelete = false,
}: CasesListProps) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [statusFilters, setStatusFilters] = useState<string[]>([])
  const [serviceFilters, setServiceFilters] = useState<string[]>([])
  const [newCaseOpen, setNewCaseOpen] = useState(false)
  const [dueOnly, setDueOnly] = useState(false)
  const [overdueOnly, setOverdueOnly] = useState(false)
  const [highlightServiceFee, setHighlightServiceFee] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<Case | null>(null)
  const catalog = useCatalogServiceRefs()
  const serviceFilterOptions = useEnabledServiceOptions()
  useServiceIconOverrides()
  const showServiceChips = showServiceColumn && showToolbar && !embedded
  const urlService = syncNewWithSearchParams
    ? resolveServiceFromSlug(searchParams.get('service') ?? '')
    : undefined
  const urlDue = syncNewWithSearchParams && searchParams.get('due') === '1'
  const urlOverdue =
    syncNewWithSearchParams && searchParams.get('overdue') === '1'

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

  useEffect(() => {
    if (!syncNewWithSearchParams) return
    setDueOnly(urlDue || urlOverdue)
    setOverdueOnly(urlOverdue)
    if (urlDue || urlOverdue) setStatusFilters([])
  }, [syncNewWithSearchParams, urlDue, urlOverdue])

  const feeCellClass = cx(
    'tabular-nums font-medium',
    highlightServiceFee && 'bg-primary/10',
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
    if (overdueOnly && !isOverdueReceivable(item)) return false
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
    overdueOnly ||
    (!showServiceChips && showServiceColumn && serviceFilters.length > 0)

  const selectedStat: ServiceStatId | undefined = dueOnly
    ? 'due'
    : statusFilters.length === 1 &&
      CASE_STATUSES.includes(statusFilters[0] as CaseStatus)
      ? (statusFilters[0] as CaseStatus)
      : statusFilters.length === 0
        ? 'all'
        : undefined

  const writeBalanceQuery = (due: boolean, overdue = false) => {
    if (!syncNewWithSearchParams) return
    const next = new URLSearchParams(searchParams)
    if (due) next.set('due', '1')
    else next.delete('due')
    if (overdue) next.set('overdue', '1')
    else next.delete('overdue')
    setSearchParams(next, { replace: true })
  }

  const selectStat = (id: string) => {
    const next = id as ServiceStatId
    if (next === selectedStat || next === 'all') {
      setStatusFilters([])
      setDueOnly(false)
      setOverdueOnly(false)
      writeBalanceQuery(false)
      return
    }
    if (next === 'due') {
      setStatusFilters([])
      setDueOnly(true)
      setOverdueOnly(false)
      writeBalanceQuery(true)
      return
    }
    setDueOnly(false)
    setOverdueOnly(false)
    setStatusFilters([next])
    writeBalanceQuery(false)
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
    try {
      const created = createCase(input)
      closeNewCaseModal()
      navigate(workDetailPath(created))
    } catch (error) {
      if (notifyIfPendingApproval(error)) {
        closeNewCaseModal()
        return
      }
      throw error
    }
  }

  const resetFilters = () => {
    setSearch('')
    setStatusFilters([])
    setServiceFilters([])
    setDueOnly(false)
    setOverdueOnly(false)
    writeServiceQuery()
    writeBalanceQuery(false)
  }

  const newCaseButton = (
    <Button className="h-9 rounded-lg shadow-xs" onClick={openNewCaseModal}>
      <Plus data-icon="inline-start" />
      Add Service
    </Button>
  )

  const clearToolbarFilters = () => {
    setStatusFilters([])
    setDueOnly(false)
    setOverdueOnly(false)
    writeBalanceQuery(false)
    if (!showServiceChips) {
      setServiceFilters([])
      writeServiceQuery()
    }
  }

  const serviceStatCards: {
    id: ServiceStatId
    label: string
    value: string
    icon: typeof Folder
  }[] = [
    {
      id: 'all',
      label: 'Total Services',
      value: String(stats.total),
      icon: Folder,
    },
    {
      id: 'Pending',
      label: 'Pending',
      value: String(stats.byStatus.Pending),
      icon: Clock,
    },
    {
      id: 'In-Progress',
      label: 'In Progress',
      value: String(stats.byStatus['In-Progress']),
      icon: PlayCircle,
    },
    {
      id: 'On-Hold',
      label: 'On Hold',
      value: String(stats.byStatus['On-Hold']),
      icon: PauseCircle,
    },
    {
      id: 'Completed',
      label: 'Completed',
      value: String(stats.byStatus.Completed),
      icon: CheckCircle2,
    },
    {
      id: 'Cancelled',
      label: 'Cancelled',
      value: String(stats.byStatus.Cancelled),
      icon: CircleOff,
    },
    {
      id: 'due',
      label: 'Outstanding',
      value: formatBdt(stats.outstanding),
      icon: Wallet,
    },
  ]

  const hasQuery =
    search.trim().length > 0 ||
    statusFilters.length > 0 ||
    dueOnly ||
    overdueOnly ||
    (showServiceColumn && serviceFilters.length > 0)

  const body =
    filtered.length === 0 ? (
      <Empty className="bg-card shadow-sm">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Folder />
          </EmptyMedia>
          <EmptyTitle>
            {cases.length === 0 && !hasQuery ? emptyTitle : 'No Services Match'}
          </EmptyTitle>
        </EmptyHeader>
        <EmptyContent>
          {cases.length === 0 && !hasQuery ? (
            (emptyAction ?? newCaseButton)
          ) : (
            <Button variant="outline" size="sm" className="h-8 rounded-lg" onClick={resetFilters}>
              Reset Filters
            </Button>
          )}
        </EmptyContent>
      </Empty>
    ) : (
      <div
        className={
          embedded
            ? 'overflow-auto rounded-lg border border-border'
            : 'overflow-auto rounded-xl border border-border bg-card shadow-md'
        }
      >
      <Table>
        <TableHeader>
          <TableRow className="border-0 hover:bg-transparent">
            <TableHead className={chromeHeadClass}>Service</TableHead>
            <TableHead className={chromeHeadClass}>ID</TableHead>
            <TableHead className={chromeHeadClass}>Created At</TableHead>
            {showClientColumn && <TableHead className={chromeHeadClass}>Client</TableHead>}
            <TableHead className={chromeHeadClass}>Current Step</TableHead>
            <TableHead className={chromeHeadClass}>Destination</TableHead>
            <TableHead className={chromeHeadClass}>Departure</TableHead>
            <TableHead
              className={cx(
                chromeHeadClass,
                highlightServiceFee && 'ring-2 ring-inset ring-white/50',
              )}
            >
              Service Fee
            </TableHead>
            <TableHead className={chromeHeadClass}>Balance Due</TableHead>
            <TableHead className={chromeHeadClass}>Status</TableHead>
            {allowDelete ? (
              <TableHead className={chromeHeadClass}>
                <span className="sr-only">Actions</span>
              </TableHead>
            ) : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((item) => {
            const ServiceIcon = iconForService(item.service)
            return (
              <TableRow
                key={item.id}
                className={cx(
                  'cursor-pointer',
                  item.id === selectedId && 'bg-muted/60',
                )}
                aria-selected={item.id === selectedId ? true : undefined}
                onClick={() => navigate(workDetailPath(item))}
              >
                <TableCell>
                  <span className="inline-flex items-center gap-2">
                    <span
                      className="inline-flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"
                      aria-hidden
                    >
                      <ServiceIcon size={15} strokeWidth={2} />
                    </span>
                    <p className="m-0 font-medium">{item.service}</p>
                  </span>
                </TableCell>
                <TableCell className="font-mono text-xs">{item.caseId}</TableCell>
                <TableCell>{formatCaseDate(item.createdAt)}</TableCell>
                {showClientColumn && <TableCell>{item.clientName}</TableCell>}
                <TableCell>
                  <span className="text-sm">{getCurrentStepLabel(item)}</span>
                </TableCell>
                <TableCell>{item.destination || '-'}</TableCell>
                <TableCell>{formatCaseDate(item.departureDate)}</TableCell>
                <TableCell className={feeCellClass}>
                  {formatBalance(caseServiceFee(item))}
                </TableCell>
                <TableCell className="tabular-nums font-medium">
                  {formatBalance(item.balance)}
                </TableCell>
                <TableCell>
                  <Badge variant={caseStatusShadcnVariant(item.status)}>
                    {item.status}
                  </Badge>
                </TableCell>
                {allowDelete ? (
                  <TableCell
                    className="w-10"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      aria-label={`Delete ${item.service}`}
                      title="Delete Service"
                      onClick={() => setPendingDelete(item)}
                    >
                      <Trash2 size={14} strokeWidth={2.25} aria-hidden />
                    </Button>
                  </TableCell>
                ) : null}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
      </div>
    )

  return (
    <div
      className={cn(
        embedded ? 'flex min-w-0 flex-col gap-3' : cn(elevatedPageClass, 'flex min-w-0 flex-col gap-5'),
      )}
      aria-label={label}
      {...(!embedded ? { 'data-elevated-canvas': true } : {})}
    >
      {viewToggle && !embedded ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="m-0 text-xl font-semibold tracking-tight">{label}</h1>
          {viewToggle}
        </div>
      ) : null}
      {!embedded ? (
        <div className={summaryStatGroupClass} role="group" aria-label="Service stats">
          {serviceStatCards.map((card) => {
            const Icon = card.icon
            return (
              <Button
                key={card.id}
                type="button"
                variant="ghost"
                aria-pressed={selectedStat === card.id}
                className={summaryStatClass}
                onClick={() => selectStat(card.id)}
              >
                <Icon className={summaryStatPeekClass} size={76} strokeWidth={1.25} aria-hidden />
                <span className={summaryStatLabelClass}>
                  <Icon size={14} strokeWidth={1.75} aria-hidden />
                  {card.label}
                </span>
                <span className={summaryStatValueClass}>{card.value}</span>
              </Button>
            )
          })}
        </div>
      ) : null}
      {showToolbar ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative min-w-56 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search Services…"
              className={cn('pl-8', pureWhiteFieldClass)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="hidden items-center gap-2 md:flex">
              {showServiceColumn && !showServiceChips ? (
                <ToolbarMultiFilter
                  label="Service"
                  options={serviceFilterOptions}
                  selected={serviceFilters}
                  onChange={(value) => {
                    setServiceFilters(value)
                    writeServiceQuery(value.length === 1 ? value[0] : undefined)
                  }}
                />
              ) : null}
              <ToolbarMultiFilter
                label="Status"
                options={STATUS_FILTERS}
                selected={statusFilters}
                onChange={(value) => {
                  setStatusFilters(value)
                  setDueOnly(false)
                  setOverdueOnly(false)
                  writeBalanceQuery(false)
                }}
              />
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    outlineControl,
                    'md:hidden',
                    hasActiveFilters &&
                      'border-[var(--color-theme)] !font-semibold ring-1 ring-[var(--color-theme)]',
                  )}
                  aria-label="Filter services"
                >
                  <SlidersHorizontal data-icon="inline-start" aria-hidden />
                  Filters
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-64 !gap-0 !p-0 md:hidden">
                {showServiceColumn && !showServiceChips ? (
                  <>
                    <FilterChoices
                      label="Service"
                      options={serviceFilterOptions}
                      selected={serviceFilters}
                      onChange={(value) => {
                        setServiceFilters(value)
                        writeServiceQuery(value.length === 1 ? value[0] : undefined)
                      }}
                    />
                    <div className="h-px bg-border" />
                  </>
                ) : null}
                <FilterChoices
                  label="Status"
                  options={STATUS_FILTERS}
                  selected={statusFilters}
                  onChange={(value) => {
                    setStatusFilters(value)
                    setDueOnly(false)
                    setOverdueOnly(false)
                    writeBalanceQuery(false)
                  }}
                />
                {hasActiveFilters ? (
                  <>
                    <div className="h-px bg-border" />
                    <div className="p-2">
                      <Button
                        type="button"
                        variant="outline"
                        className={cn('h-8 w-full', outlineControl)}
                        onClick={clearToolbarFilters}
                      >
                        Clear Filters
                      </Button>
                    </div>
                  </>
                ) : null}
              </PopoverContent>
            </Popover>
            {hasActiveFilters ? (
              <Button
                type="button"
                variant="outline"
                className={cn(outlineControl, 'hidden md:inline-flex')}
                onClick={clearToolbarFilters}
              >
                Clear
              </Button>
            ) : null}
            {newCaseButton}
          </div>
        </div>
      ) : null}

      {showServiceChips ? (
        <div
          className="flex flex-wrap items-center gap-1.5"
          role="group"
          aria-label="Filter by service type"
        >
          <button
            type="button"
            className={cn(
              filterChipClass(serviceFilters.length === 0),
              'inline-flex items-center gap-1',
            )}
            aria-pressed={serviceFilters.length === 0}
            onClick={() => selectServiceChip(null)}
          >
            <ListChecks size={13} strokeWidth={2} aria-hidden />
            All Services
          </button>
          {catalog.map((item) => {
            const Icon = iconForService(item.key)
            const selected =
              serviceFilters.length === 1 && serviceFilters[0] === item.key
            return (
              <button
                key={item.key}
                type="button"
                className={cn(
                  filterChipClass(selected),
                  'inline-flex items-center gap-1',
                )}
                aria-pressed={selected}
                onClick={() => selectServiceChip(item.key)}
              >
                <Icon size={13} strokeWidth={2} aria-hidden />
                {item.label}
              </button>
            )
          })}
        </div>
      ) : null}

      {body}

      <Sheet
        open={newCaseOpen}
        onOpenChange={(open) => {
          if (!open) closeNewCaseModal()
        }}
      >
        <SheetContent className={floatingSheetClass}>
          <SheetHeader className="border-b border-border px-5 py-4 pr-12">
            <SheetTitle className="text-base font-semibold">Add Service</SheetTitle>
          </SheetHeader>
          <NewCaseForm
            onSubmit={handleCreateCase}
            onCancel={closeNewCaseModal}
            defaultClientId={resolvedClientId}
            lockClient={lockClient}
            defaultService={resolvedService}
            lockService={lockService}
          />
        </SheetContent>
      </Sheet>

      {allowDelete ? (
        <ConfirmDialog
          open={pendingDelete != null}
          onClose={() => setPendingDelete(null)}
          onConfirm={() => {
            if (!pendingDelete) return
            try {
              deleteCase(pendingDelete.id)
              setPendingDelete(null)
            } catch (error) {
              if (notifyIfPendingApproval(error)) {
                setPendingDelete(null)
                return
              }
              throw error
            }
          }}
          title={(() => {
            if (!pendingDelete) return 'Delete this service? This cannot be undone.'
            const paymentCount = getPaymentsByCaseId(pendingDelete.id).length
            if (paymentCount === 0) {
              return `Delete ${pendingDelete.service}? This cannot be undone.`
            }
            return `Delete ${pendingDelete.service} and its ${paymentCount} payment${paymentCount === 1 ? '' : 's'}? This cannot be undone.`
          })()}
          confirmLabel="Delete"
          confirmVariant="danger"
        />
      ) : null}
    </div>
  )
}
