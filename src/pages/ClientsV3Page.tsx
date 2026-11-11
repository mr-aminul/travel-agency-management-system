import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  CheckCircle2,
  FolderOpen,
  LayoutGrid,
  ListFilter,
  Search,
  Table2,
  Users,
  Wallet,
} from 'lucide-react'
import { AddClientSplitButton } from '@/components/clients/AddClientSplitButton'
import { ClientRowActions } from '@/components/clients/ClientRowActions'
import { NewClientForm } from '@/components/clients/NewClientForm'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/shadcn/avatar'
import { Badge } from '@/components/shadcn/badge'
import { Button } from '@/components/shadcn/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/shadcn/card'
import { Checkbox } from '@/components/shadcn/checkbox'
import {
  Empty,
  EmptyContent,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/shadcn/empty'
import { Input } from '@/components/shadcn/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/shadcn/popover'
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
import { ToggleGroup, ToggleGroupItem } from '@/components/shadcn/toggle-group'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/shadcn/tooltip'
import { TypeConfirmDialog } from '@/components/shadcn/type-confirm-dialog'
import {
  chromeHeadClass,
  elevatedPageClass,
  floatingSheetClass,
  floatingSheetWideClass,
  summaryStatClass,
  summaryStatGroupClass,
  summaryStatLabelClass,
  summaryStatPeekClass,
  summaryStatValueClass,
  activeWhiteControlClass,
  whiteControlClass,
} from '@/components/clients/shadcnChrome'
import { useCases } from '@/lib/casesStore'
import {
  clientMatchesServiceStatusFilters,
  deriveClientServiceStatus,
  groupCasesByClientId,
} from '@/lib/clientServiceStatus'
import {
  deriveClientActiveCases,
  deriveClientBalance,
} from '@/lib/clientDerived'
import {
  archiveClient,
  createClient,
  formatBalance,
  softDeleteClient,
  unarchiveClient,
  useClients,
} from '@/lib/clientsStore'
import { formatBdt } from '@/lib/dashboardMetrics'
import { notifyIfPendingApproval } from '@/lib/notifyPendingApproval'
import { useSubAgents } from '@/lib/subAgentsStore'
import { cn } from '@/lib/utils'
import { clientV3Path } from '@/lib/workPaths'
import type { Client, CreateClientInput } from '@/types/client'
import '@/styles/layout-clients.css'
type ClientStatId = 'all' | 'open' | 'Completed' | 'due'
type ClientsListView = 'table' | 'grid'
type TextColumn = 'name' | 'subAgent' | 'mobile' | 'passport' | 'services' | 'balance'

const CLIENTS_LIST_VIEW_KEY = 'clients-v3-list-view'
const OPEN_STATUSES = ['Pending', 'In-Progress', 'On-Hold'] as const
const outlineControl = whiteControlClass
const headClass = chromeHeadClass
const cellClass =
  'border-b border-border px-[0.85rem] py-[0.45rem] text-[0.875rem] leading-[1.35] whitespace-nowrap [&:not(:last-child)]:border-r [&:not(:last-child)]:border-r-[color-mix(in_srgb,var(--color-border)_45%,transparent)]'

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: 'Pending', label: 'Pending' },
  { value: 'In-Progress', label: 'In Progress' },
  { value: 'On-Hold', label: 'On Hold' },
  { value: 'Completed', label: 'Completed' },
  { value: 'Cancelled', label: 'Cancelled' },
  { value: 'Archived', label: 'Archived' },
]

const EMPTY_COLUMN_FILTERS: Record<TextColumn, string[]> = {
  name: [],
  subAgent: [],
  mobile: [],
  passport: [],
  services: [],
  balance: [],
}

function readClientsListView(): ClientsListView {
  try {
    return localStorage.getItem(CLIENTS_LIST_VIEW_KEY) === 'grid'
      ? 'grid'
      : 'table'
  } catch {
    return 'table'
  }
}

function persistClientsListView(view: ClientsListView) {
  try {
    localStorage.setItem(CLIENTS_LIST_VIEW_KEY, view)
  } catch {
    /* ignore quota / private mode */
  }
}

function formatMobile(phone: string): string {
  return phone.replace(/\D/g, '')
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')
}

function optionList(values: string[]) {
  return [...new Set(values)]
    .sort((a, b) => a.localeCompare(b))
    .map((value) => ({ value, label: value }))
}

function selectedOrAll(selected: string[], value: string) {
  return selected.length === 0 || selected.includes(value)
}

function statusLabel(client: Client, serviceStatus: string | null | undefined) {
  if (client.archivedAt) return 'Archived'
  return serviceStatus || '—'
}

function isOpenStatusFilter(statusFilters: string[]): boolean {
  return (
    statusFilters.length === OPEN_STATUSES.length &&
    OPEN_STATUSES.every((status) => statusFilters.includes(status))
  )
}

export default function ClientsV3Page() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeClients = useClients()
  const clients = activeClients
  const cases = useCases()
  const subAgents = useSubAgents()
  const [search, setSearch] = useState('')
  const [statusFilters, setStatusFilters] = useState<string[]>([])
  const [columnFilters, setColumnFilters] = useState(EMPTY_COLUMN_FILTERS)
  const [newClientOpen, setNewClientOpen] = useState(false)
  const [dueOnly, setDueOnly] = useState(false)
  const [listView, setListView] = useState<ClientsListView>(readClientsListView)
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null)

  const subAgentsById = useMemo(
    () => new Map(subAgents.map((subAgent) => [subAgent.id, subAgent.name])),
    [subAgents],
  )
  const casesByClientId = useMemo(() => groupCasesByClientId(cases), [cases])

  const subAgentNameFor = (client: Client) =>
    client.subAgentId ? (subAgentsById.get(client.subAgentId) ?? '') : ''
  const casesFor = (clientId: string) => casesByClientId.get(clientId) ?? []
  const statusFor = (clientId: string) =>
    deriveClientServiceStatus(casesFor(clientId))

  useEffect(() => {
    setNewClientOpen(searchParams.get('new') === '1')
  }, [searchParams])

  const stats = useMemo(() => {
    let open = 0
    let completed = 0
    let outstanding = 0
    for (const client of activeClients) {
      const clientCases = casesByClientId.get(client.id) ?? []
      if (deriveClientActiveCases(clientCases) > 0) open += 1
      if (deriveClientServiceStatus(clientCases) === 'Completed') {
        completed += 1
      }
      outstanding += deriveClientBalance(clientCases)
    }
    return {
      total: activeClients.length,
      open,
      completed,
      outstanding,
    }
  }, [activeClients, casesByClientId])

  const rows = clients.map((client) => {
    const clientCases = casesFor(client.id)
    const serviceStatus = statusFor(client.id)
    const activeCases = deriveClientActiveCases(clientCases)
    const balance = deriveClientBalance(clientCases)
    return {
      client,
      activeCases,
      dueBalance: balance,
      subAgentName: subAgentNameFor(client) || '—',
      mobile: formatMobile(client.phone),
      passport: client.passport || '—',
      services: String(activeCases),
      balance: formatBalance(balance),
      status: statusLabel(client, serviceStatus),
      serviceStatus,
    }
  })

  const filtered = rows.filter((row) => {
    if (dueOnly && row.dueBalance <= 0) return false
    const q = search.trim().toLowerCase()
    const phoneDigits = formatMobile(row.client.phone)
    const queryDigits = formatMobile(q)
    const matchSearch =
      !q ||
      row.client.name.toLowerCase().includes(q) ||
      row.client.phone.toLowerCase().includes(q) ||
      row.client.passport?.toLowerCase().includes(q) ||
      row.client.nid?.toLowerCase().includes(q) ||
      row.subAgentName.toLowerCase().includes(q) ||
      (queryDigits.length > 0 && phoneDigits.includes(queryDigits))
    const matchStatus = row.client.archivedAt
      ? statusFilters.length === 0 || statusFilters.includes('Archived')
      : clientMatchesServiceStatusFilters(casesFor(row.client.id), statusFilters)
    return (
      matchSearch &&
      matchStatus &&
      selectedOrAll(columnFilters.name, row.client.name) &&
      selectedOrAll(columnFilters.subAgent, row.subAgentName) &&
      selectedOrAll(columnFilters.mobile, row.mobile) &&
      selectedOrAll(columnFilters.passport, row.passport) &&
      selectedOrAll(columnFilters.services, row.services) &&
      selectedOrAll(columnFilters.balance, row.balance)
    )
  })

  const hasActiveFilters =
    statusFilters.length > 0 ||
    dueOnly ||
    Object.values(columnFilters).some((selected) => selected.length > 0)

  const selectedStat: ClientStatId | undefined = dueOnly
    ? 'due'
    : isOpenStatusFilter(statusFilters)
      ? 'open'
      : statusFilters.length === 1 && statusFilters[0] === 'Completed'
        ? 'Completed'
        : statusFilters.length === 0
          ? 'all'
          : undefined

  const selectStat = (id: string) => {
    const next = id as ClientStatId
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

  const selectListView = (view: string) => {
    if (view !== 'table' && view !== 'grid') return
    setListView(view)
    persistClientsListView(view)
  }

  const openNewClientModal = () => {
    setNewClientOpen(true)
    if (searchParams.get('new') !== '1') {
      setSearchParams({ new: '1' }, { replace: true })
    }
  }

  const closeNewClientModal = () => {
    setNewClientOpen(false)
    if (searchParams.get('new')) {
      setSearchParams({}, { replace: true })
    }
  }

  const handleCreateClient = (input: CreateClientInput) => {
    try {
      const created = createClient(input)
      closeNewClientModal()
      navigate(`${clientV3Path(created.id)}?tab=services&newCase=1`)
    } catch (error) {
      if (notifyIfPendingApproval(error)) {
        closeNewClientModal()
        return
      }
      throw error
    }
  }

  const resetFilters = () => {
    setSearch('')
    setStatusFilters([])
    setColumnFilters(EMPTY_COLUMN_FILTERS)
    setDueOnly(false)
  }

  const setColumn = (column: TextColumn, next: string[]) => {
    setColumnFilters((current) => ({ ...current, [column]: next }))
  }

  const statCards: {
    id: ClientStatId
    label: string
    value: string
    icon: typeof Users
  }[] = [
    { id: 'all', label: 'Total Clients', value: String(stats.total), icon: Users },
    { id: 'open', label: 'Open Services', value: String(stats.open), icon: FolderOpen },
    {
      id: 'Completed',
      label: 'Completed',
      value: String(stats.completed),
      icon: CheckCircle2,
    },
    {
      id: 'due',
      label: 'Outstanding',
      value: formatBdt(stats.outstanding),
      icon: Wallet,
    },
  ]

  return (
    <TooltipProvider>
      <div className={elevatedPageClass} data-elevated-canvas aria-label="Clients">
        <div className={summaryStatGroupClass} role="group" aria-label="Client stats">
          {statCards.map((card) => {
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

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-56 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search Clients…"
              className={cn('pl-8', outlineControl)}
            />
          </div>
          {hasActiveFilters ? (
            <Button type="button" variant="outline" className={outlineControl} onClick={resetFilters}>
              Clear
            </Button>
          ) : null}
          <ToggleGroup
            type="single"
            value={listView}
            onValueChange={selectListView}
            variant="outline"
            spacing={0}
            aria-label="Client list view"
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <ToggleGroupItem
                  value="table"
                  aria-label="Table view"
                  className={cn(
                    outlineControl,
                    listView === 'table' && activeWhiteControlClass,
                  )}
                >
                  <Table2 />
                </ToggleGroupItem>
              </TooltipTrigger>
              <TooltipContent>Table View</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <ToggleGroupItem
                  value="grid"
                  aria-label="Grid view"
                  className={cn(
                    outlineControl,
                    listView === 'grid' && activeWhiteControlClass,
                  )}
                >
                  <LayoutGrid />
                </ToggleGroupItem>
              </TooltipTrigger>
              <TooltipContent>Grid View</TooltipContent>
            </Tooltip>
          </ToggleGroup>
          <AddClientSplitButton label="New Client" size="md" onAddClient={openNewClientModal} />
        </div>

        {filtered.length === 0 ? (
          <Empty className="bg-card shadow-sm">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Users />
              </EmptyMedia>
              <EmptyTitle>No Clients Match</EmptyTitle>
            </EmptyHeader>
            <EmptyContent>
              <Button type="button" variant="outline" className={outlineControl} onClick={resetFilters}>
                Reset Filters
              </Button>
            </EmptyContent>
          </Empty>
        ) : listView === 'grid' ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((row) => (
              <Card
                key={row.client.id}
                className="cursor-pointer shadow-sm"
                onClick={() => navigate(clientV3Path(row.client.id))}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <Avatar>
                        {row.client.avatarUrl ? (
                          <AvatarImage src={row.client.avatarUrl} alt="" />
                        ) : null}
                        <AvatarFallback>{initials(row.client.name)}</AvatarFallback>
                      </Avatar>
                      <CardTitle className="truncate">{row.client.name}</CardTitle>
                    </div>
                    <div
                      className="flex items-center gap-1"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <Badge variant={row.status === 'Completed' ? 'default' : 'secondary'}>
                        {row.status}
                      </Badge>
                      <ClientRowActions
                        client={row.client}
                        onArchive={(client) => archiveClient(client.id)}
                        onUnarchive={(client) => unarchiveClient(client.id)}
                        onDelete={setDeleteTarget}
                      />
                    </div>
                  </div>
                  <CardDescription>
                    {row.subAgentName} · {row.mobile}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : (
          <div className="overflow-auto rounded-xl border border-border bg-card shadow-md">
            <Table className="border-collapse border-spacing-0">
              <TableHeader>
                <TableRow className="border-0 hover:bg-transparent">
                  <TableHead className={cn(headClass, 'min-w-56 !pl-2.5')}>
                    <ColumnFilterHeader
                      label="Name"
                      options={optionList(rows.map((row) => row.client.name))}
                      selected={columnFilters.name}
                      onChange={(next) => setColumn('name', next)}
                    />
                  </TableHead>
                  <TableHead className={headClass}>
                    <ColumnFilterHeader
                      label="Sub Agent"
                      options={optionList(rows.map((row) => row.subAgentName))}
                      selected={columnFilters.subAgent}
                      onChange={(next) => setColumn('subAgent', next)}
                    />
                  </TableHead>
                  <TableHead className={headClass}>
                    <ColumnFilterHeader
                      label="Mobile"
                      options={optionList(rows.map((row) => row.mobile))}
                      selected={columnFilters.mobile}
                      onChange={(next) => setColumn('mobile', next)}
                    />
                  </TableHead>
                  <TableHead className={headClass}>
                    <ColumnFilterHeader
                      label="Passport"
                      options={optionList(rows.map((row) => row.passport))}
                      selected={columnFilters.passport}
                      onChange={(next) => setColumn('passport', next)}
                    />
                  </TableHead>
                  <TableHead className={headClass}>
                    <ColumnFilterHeader
                      label="Open Services"
                      options={optionList(rows.map((row) => row.services))}
                      selected={columnFilters.services}
                      onChange={(next) => setColumn('services', next)}
                    />
                  </TableHead>
                  <TableHead className={headClass}>
                    <ColumnFilterHeader
                      label="Balance Due"
                      options={optionList(rows.map((row) => row.balance))}
                      selected={columnFilters.balance}
                      onChange={(next) => setColumn('balance', next)}
                    />
                  </TableHead>
                  <TableHead className={headClass}>
                    <ColumnFilterHeader
                      label="Status"
                      options={STATUS_FILTERS}
                      selected={statusFilters}
                      onChange={setStatusFilters}
                    />
                  </TableHead>
                  <TableHead className={headClass}>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row) => (
                  <TableRow
                    key={row.client.id}
                    className="cursor-pointer"
                    onClick={() => navigate(clientV3Path(row.client.id))}
                  >
                    <TableCell className={cn(cellClass, 'pl-2.5')}>
                      <div className="flex min-w-0 items-center gap-2.5">
                        <Avatar size="sm">
                          {row.client.avatarUrl ? (
                            <AvatarImage src={row.client.avatarUrl} alt="" />
                          ) : null}
                          <AvatarFallback>{initials(row.client.name)}</AvatarFallback>
                        </Avatar>
                        <span className="truncate font-medium">{row.client.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className={cn(cellClass, 'text-muted-foreground')}>
                      {row.subAgentName}
                    </TableCell>
                    <TableCell className={cn(cellClass, 'text-muted-foreground')}>
                      {row.mobile}
                    </TableCell>
                    <TableCell className={cn(cellClass, 'text-muted-foreground')}>
                      {row.passport}
                    </TableCell>
                    <TableCell className={cn(cellClass, 'tabular-nums')}>{row.services}</TableCell>
                    <TableCell className={cn(cellClass, 'tabular-nums')}>{row.balance}</TableCell>
                    <TableCell className={cellClass}>
                      <Badge variant={row.status === 'Completed' ? 'default' : 'secondary'}>
                        {row.status}
                      </Badge>
                    </TableCell>
                    <TableCell className={cellClass} onClick={(event) => event.stopPropagation()}>
                      <ClientRowActions
                        client={row.client}
                        onArchive={(client) => archiveClient(client.id)}
                        onUnarchive={(client) => unarchiveClient(client.id)}
                        onDelete={setDeleteTarget}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <Sheet
          open={newClientOpen}
          onOpenChange={(open) => {
            if (!open) closeNewClientModal()
          }}
        >
          <SheetContent className={cn(floatingSheetClass, floatingSheetWideClass)}>
            <SheetHeader className="border-b border-border px-5 py-4 pr-12">
              <SheetTitle className="text-base font-semibold">New Client</SheetTitle>
            </SheetHeader>
            <NewClientForm onSubmit={handleCreateClient} onCancel={closeNewClientModal} />
          </SheetContent>
        </Sheet>

        <TypeConfirmDialog
          open={deleteTarget != null}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => {
            if (!deleteTarget) return
            softDeleteClient(deleteTarget.id)
            setDeleteTarget(null)
          }}
          title={
            deleteTarget
              ? `Move ${deleteTarget.name} to Trash for 30 days?`
              : 'Move this client to Trash?'
          }
          confirmPhrase={deleteTarget?.name ?? ''}
          phraseLabel="Client Name"
          confirmLabel="Delete Client"
        />
      </div>
    </TooltipProvider>
  )
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
        onClick={() => onChange(allSelected ? [] : options.map((option) => option.value))}
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
      <div className="max-h-56 overflow-y-auto py-1" role="listbox" aria-label={`${label} values`} aria-multiselectable>
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
                <Checkbox checked={isSelected} tabIndex={-1} aria-hidden className="pointer-events-none" />
                <span className="min-w-0 truncate">{option.label}</span>
              </div>
            )
          })
        )}
      </div>
    </>
  )
}

function ColumnFilterHeader({
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
  const active = selected.length > 0 && selected.length < options.length
  return (
    <span className="inline-flex w-full items-center justify-between gap-1">
      <span className="shrink-0 whitespace-nowrap">{label}</span>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className={cn(
              'bg-transparent text-[color-mix(in_srgb,var(--color-on-chrome)_72%,transparent)] hover:bg-[color-mix(in_srgb,var(--color-on-chrome)_14%,transparent)] hover:text-[var(--color-on-chrome)]',
              active &&
                'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground',
            )}
            aria-label={
              active ? `Filter ${label}, ${selected.length} selected` : `Filter ${label}`
            }
          >
            <ListFilter strokeWidth={2} aria-hidden />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 !gap-0 !p-0">
          <FilterChoices label={label} options={options} selected={selected} onChange={onChange} />
        </PopoverContent>
      </Popover>
    </span>
  )
}
