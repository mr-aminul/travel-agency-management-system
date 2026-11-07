import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Handshake,
  LayoutGrid,
  ListFilter,
  Plus,
  Search,
  Table2,
  UserMinus,
  Users,
  UserCheck,
} from 'lucide-react'
import { NewSubAgentForm } from '@/components/subAgents/NewSubAgentForm'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/shadcn/sheet'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/shadcn/avatar'
import { Badge } from '@/components/shadcn/badge'
import { Button } from '@/components/shadcn/button'
import { Checkbox } from '@/components/shadcn/checkbox'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/shadcn/card'
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
import { cn } from '@/lib/utils'
import { createSubAgent, useSubAgents } from '@/lib/subAgentsStore'
import { normalizePhone } from '@/lib/clientsStore'
import { useClients } from '@/lib/clientsStore'
import { useCases } from '@/lib/casesStore'
import { deriveSubAgentActivityStatus } from '@/lib/clientServiceStatus'
import type { SubAgent, SubAgentDraft, SubAgentStatus } from '@/types/subAgent'
import type { Case } from '@/types/case'
import '@/styles/layout-clients.css'

type SubAgentsListView = 'table' | 'grid'

const SUB_AGENTS_LIST_VIEW_KEY = 'subAgents-list-view'

const outlineControl =
  'pd-white-control h-9 gap-1.5 rounded-lg border-input shadow-xs'
const primaryControl = 'h-9 rounded-lg shadow-xs'
const headClass =
  'pd-chrome-head h-auto px-[0.85rem] py-[0.45rem] text-[0.875rem] font-semibold'
const cellClass =
  'border-b border-border px-[0.85rem] py-[0.45rem] text-[0.875rem] leading-[1.35] whitespace-nowrap'

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: 'Active', label: 'Active' },
  { value: 'Inactive', label: 'Inactive' },
]

function readSubAgentsListView(): SubAgentsListView {
  try {
    return localStorage.getItem(SUB_AGENTS_LIST_VIEW_KEY) === 'grid'
      ? 'grid'
      : 'table'
  } catch {
    return 'table'
  }
}

function persistSubAgentsListView(view: SubAgentsListView) {
  try {
    localStorage.setItem(SUB_AGENTS_LIST_VIEW_KEY, view)
  } catch {
    /* ignore quota / private mode */
  }
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')
}

function statusBadgeVariant(status: SubAgentStatus) {
  return status === 'Active' ? 'default' : 'secondary'
}

type SubAgentStatId = 'all' | 'Active' | 'referred' | 'idle'

type TextColumn = 'name' | 'id' | 'mobile' | 'license' | 'customers'

const EMPTY_COLUMN_FILTERS: Record<TextColumn, string[]> = {
  name: [],
  id: [],
  mobile: [],
  license: [],
  customers: [],
}

function optionList(values: string[]) {
  return [...new Set(values)]
    .sort((a, b) => a.localeCompare(b))
    .map((value) => ({ value, label: value }))
}

function selectedOrAll(selected: string[], value: string) {
  return selected.length === 0 || selected.includes(value)
}

function matchesFilters(
  subAgent: SubAgent,
  search: string,
  branchFilters: string[],
  statusFilters: string[],
  activityStatus: SubAgentStatus,
  columnFilters: Record<TextColumn, string[]>,
  customerCount: number,
): boolean {
  const q = search.trim().toLowerCase()
  const phoneDigits = normalizePhone(subAgent.phone)
  const queryDigits = normalizePhone(q)
  const matchSearch =
    !q ||
    subAgent.name.toLowerCase().includes(q) ||
    subAgent.phone.toLowerCase().includes(q) ||
    subAgent.email?.toLowerCase().includes(q) ||
    subAgent.licenseNumber?.toLowerCase().includes(q) ||
    subAgent.branch?.toLowerCase().includes(q) ||
    subAgent.id.toLowerCase().includes(q) ||
    (queryDigits.length > 0 && phoneDigits.includes(queryDigits))
  const matchBranch =
    branchFilters.length === 0 ||
    (subAgent.branch ? branchFilters.includes(subAgent.branch) : false)
  const matchStatus =
    statusFilters.length === 0 || statusFilters.includes(activityStatus)
  const phone = normalizePhone(subAgent.phone) || subAgent.phone
  return (
    matchSearch &&
    matchBranch &&
    matchStatus &&
    selectedOrAll(columnFilters.name, subAgent.name) &&
    selectedOrAll(columnFilters.id, subAgent.id) &&
    selectedOrAll(columnFilters.mobile, phone) &&
    selectedOrAll(columnFilters.license, subAgent.licenseNumber || '—') &&
    selectedOrAll(columnFilters.customers, String(customerCount))
  )
}

export default function SubAgentsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const subAgents = useSubAgents()
  const clients = useClients()
  const cases = useCases()
  const [search, setSearch] = useState('')
  const [branchFilters, setBranchFilters] = useState<string[]>([])
  const [statusFilters, setStatusFilters] = useState<string[]>([])
  const [columnFilters, setColumnFilters] = useState(EMPTY_COLUMN_FILTERS)
  const [newSubAgentOpen, setNewSubAgentOpen] = useState(false)
  const [clientFilter, setClientFilter] = useState<'all' | 'referred' | 'idle'>(
    'all',
  )
  const [listView, setListView] = useState<SubAgentsListView>(
    readSubAgentsListView,
  )

  useEffect(() => {
    setNewSubAgentOpen(searchParams.get('new') === '1')
  }, [searchParams])

  const branchOptions = useMemo(() => {
    const branches = [
      ...new Set(subAgents.map((subAgent) => subAgent.branch).filter(Boolean)),
    ] as string[]
    return branches.sort().map((branch) => ({ value: branch, label: branch }))
  }, [subAgents])

  const customerCountBySubAgent = useMemo(() => {
    const counts = new Map<string, number>()
    for (const client of clients) {
      if (!client.subAgentId) continue
      counts.set(client.subAgentId, (counts.get(client.subAgentId) ?? 0) + 1)
    }
    return counts
  }, [clients])

  const casesBySubAgentId = useMemo(() => {
    const clientSubAgentId = new Map(
      clients
        .filter((client) => client.subAgentId)
        .map((client) => [client.id, client.subAgentId as string]),
    )
    const map = new Map<string, Case[]>()
    for (const item of cases) {
      const subAgentId = clientSubAgentId.get(item.clientId)
      if (!subAgentId) continue
      const list = map.get(subAgentId)
      if (list) list.push(item)
      else map.set(subAgentId, [item])
    }
    return map
  }, [cases, clients])

  const activityStatusBySubAgent = useMemo(() => {
    const map = new Map<string, SubAgentStatus>()
    for (const subAgent of subAgents) {
      map.set(
        subAgent.id,
        deriveSubAgentActivityStatus(casesBySubAgentId.get(subAgent.id) ?? []),
      )
    }
    return map
  }, [subAgents, casesBySubAgentId])

  const stats = useMemo(() => {
    let active = 0
    let referredClients = 0
    let idle = 0
    for (const subAgent of subAgents) {
      if (activityStatusBySubAgent.get(subAgent.id) === 'Active') active += 1
      const referred = customerCountBySubAgent.get(subAgent.id) ?? 0
      referredClients += referred
      if (referred === 0) idle += 1
    }
    return {
      total: subAgents.length,
      active,
      referredClients,
      idle,
    }
  }, [subAgents, customerCountBySubAgent, activityStatusBySubAgent])

  const filtered = subAgents.filter((subAgent) => {
    const referred = customerCountBySubAgent.get(subAgent.id) ?? 0
    if (clientFilter === 'referred' && referred === 0) return false
    if (clientFilter === 'idle' && referred > 0) return false
    return matchesFilters(
      subAgent,
      search,
      branchFilters,
      statusFilters,
      activityStatusBySubAgent.get(subAgent.id) ?? 'Inactive',
      columnFilters,
      referred,
    )
  })
  const columnOptions = useMemo(() => {
    const names: string[] = []
    const ids: string[] = []
    const mobiles: string[] = []
    const licenses: string[] = []
    const customers: string[] = []
    for (const subAgent of subAgents) {
      names.push(subAgent.name)
      ids.push(subAgent.id)
      mobiles.push(normalizePhone(subAgent.phone) || subAgent.phone)
      licenses.push(subAgent.licenseNumber || '—')
      customers.push(String(customerCountBySubAgent.get(subAgent.id) ?? 0))
    }
    return {
      name: optionList(names),
      id: optionList(ids),
      mobile: optionList(mobiles),
      license: optionList(licenses),
      customers: optionList(customers),
    }
  }, [customerCountBySubAgent, subAgents])
  const hasActiveFilters =
    branchFilters.length > 0 ||
    statusFilters.length > 0 ||
    clientFilter !== 'all' ||
    Object.values(columnFilters).some((selected) => selected.length > 0)

  const selectedStat: SubAgentStatId | undefined =
    clientFilter !== 'all'
      ? clientFilter
      : statusFilters.length === 1 && statusFilters[0] === 'Active'
        ? 'Active'
        : statusFilters.length === 0
          ? 'all'
          : undefined

  const selectStat = (id: string) => {
    const next = id as SubAgentStatId
    if (next === selectedStat || next === 'all') {
      setStatusFilters([])
      setClientFilter('all')
      return
    }
    if (next === 'referred' || next === 'idle') {
      setStatusFilters([])
      setClientFilter(next)
      return
    }
    setClientFilter('all')
    setStatusFilters(['Active'])
  }

  const selectListView = (view: SubAgentsListView) => {
    setListView(view)
    persistSubAgentsListView(view)
  }

  const openNewSubAgentModal = () => {
    setNewSubAgentOpen(true)
    if (searchParams.get('new') !== '1') {
      setSearchParams({ new: '1' }, { replace: true })
    }
  }

  const closeNewSubAgentModal = () => {
    setNewSubAgentOpen(false)
    if (searchParams.get('new')) {
      setSearchParams({}, { replace: true })
    }
  }

  const handleCreateSubAgent = (draft: SubAgentDraft) => {
    const created = createSubAgent(draft)
    closeNewSubAgentModal()
    navigate(`/sub-agents/${created.id}`)
  }

  return (
    <TooltipProvider>
    <div className="pd-page pd-page--elevated flex flex-col gap-5" aria-label="Sub Agents">
      <div className="pd-summary-stat-group" role="group" aria-label="Sub agent stats">
        {(
          [
            { id: 'all' as const, label: 'Total Sub Agents', value: stats.total, icon: Handshake },
            { id: 'Active' as const, label: 'Active', value: stats.active, icon: UserCheck },
            { id: 'referred' as const, label: 'Referred Clients', value: stats.referredClients, icon: Users },
            { id: 'idle' as const, label: 'No Clients Yet', value: stats.idle, icon: UserMinus },
          ]
        ).map((card) => {
          const Icon = card.icon
          return (
            <Button
              key={card.id}
              type="button"
              variant="ghost"
              className={cn(
                'pd-summary-stat',
                selectedStat === card.id && 'is-active',
              )}
              aria-pressed={selectedStat === card.id}
              onClick={() => selectStat(card.id)}
            >
              <Icon className="pd-summary-stat__peek" size={76} strokeWidth={1.25} aria-hidden />
              <span className="pd-summary-stat__label">
                <Icon size={14} strokeWidth={1.75} aria-hidden />
                {card.label}
              </span>
              <span className="pd-summary-stat__value">{card.value}</span>
            </Button>
          )
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className={cn('pl-8', outlineControl)}
            placeholder="Search Sub Agents…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {hasActiveFilters ? (
            <Button
              variant="outline"
              className={outlineControl}
              onClick={() => {
                setBranchFilters([])
                setStatusFilters([])
                setClientFilter('all')
                setColumnFilters(EMPTY_COLUMN_FILTERS)
              }}
            >
              Clear
            </Button>
          ) : null}
          <ToggleGroup
            type="single"
            variant="outline"
            spacing={0}
            value={listView}
            onValueChange={(value: string) => {
              if (value === 'table' || value === 'grid') selectListView(value)
            }}
            aria-label="Sub agent list view"
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <ToggleGroupItem value="table" aria-label="Table view" className={cn(outlineControl, listView === 'table' && 'is-active')}>
                  <Table2 />
                </ToggleGroupItem>
              </TooltipTrigger>
              <TooltipContent>Table view</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <ToggleGroupItem value="grid" aria-label="Grid view" className={cn(outlineControl, listView === 'grid' && 'is-active')}>
                  <LayoutGrid />
                </ToggleGroupItem>
              </TooltipTrigger>
              <TooltipContent>Grid view</TooltipContent>
            </Tooltip>
          </ToggleGroup>
          <Button className={primaryControl} onClick={openNewSubAgentModal}>
            <Plus data-icon="inline-start" />
            New Sub Agent
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Empty className="bg-card shadow-sm">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Handshake />
            </EmptyMedia>
            <EmptyTitle>No Sub Agents Match</EmptyTitle>
          </EmptyHeader>
          <EmptyContent>
            <Button
              variant="outline"
              className={outlineControl}
              onClick={() => {
                setSearch('')
                setBranchFilters([])
                setStatusFilters([])
                setClientFilter('all')
                setColumnFilters(EMPTY_COLUMN_FILTERS)
              }}
            >
              Reset Filters
            </Button>
          </EmptyContent>
        </Empty>
      ) : listView === 'grid' ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((subAgent) => {
            const activityStatus =
              activityStatusBySubAgent.get(subAgent.id) ?? 'Inactive'
            return (
              <Card
                key={subAgent.id}
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/sub-agents/${subAgent.id}`)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') navigate(`/sub-agents/${subAgent.id}`)
                }}
                className="cursor-pointer shadow-sm"
              >
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <Avatar>
                        {subAgent.photoUrl ? (
                          <AvatarImage src={subAgent.photoUrl} alt="" />
                        ) : null}
                        <AvatarFallback>{initials(subAgent.name)}</AvatarFallback>
                      </Avatar>
                      <CardTitle className="truncate">{subAgent.name}</CardTitle>
                    </div>
                    <Badge variant={statusBadgeVariant(activityStatus)}>
                      {activityStatus}
                    </Badge>
                  </div>
                  <CardDescription>
                    {subAgent.id} · {normalizePhone(subAgent.phone) || subAgent.phone}
                    {subAgent.branch ? ` · ${subAgent.branch}` : ''}
                  </CardDescription>
                </CardHeader>
              </Card>
            )
          })}
        </div>
      ) : (
        <div className="overflow-auto rounded-xl border border-border bg-card shadow-md">
          <Table className="border-collapse border-spacing-0">
            <TableHeader>
              <TableRow className="border-0 hover:bg-transparent">
                <TableHead className={cn(headClass, 'min-w-56')}>
                  <ColumnFilterHeader
                    label="Name"
                    options={columnOptions.name}
                    selected={columnFilters.name}
                    onChange={(name) =>
                      setColumnFilters((current) => ({ ...current, name }))
                    }
                  />
                </TableHead>
                <TableHead className={headClass}>
                  <ColumnFilterHeader
                    label="ID"
                    options={columnOptions.id}
                    selected={columnFilters.id}
                    onChange={(id) =>
                      setColumnFilters((current) => ({ ...current, id }))
                    }
                  />
                </TableHead>
                <TableHead className={headClass}>
                  <ColumnFilterHeader
                    label="Mobile"
                    options={columnOptions.mobile}
                    selected={columnFilters.mobile}
                    onChange={(mobile) =>
                      setColumnFilters((current) => ({ ...current, mobile }))
                    }
                  />
                </TableHead>
                <TableHead className={headClass}>
                  <ColumnFilterHeader
                    label="Branch"
                    options={branchOptions}
                    selected={branchFilters}
                    onChange={setBranchFilters}
                  />
                </TableHead>
                <TableHead className={headClass}>
                  <ColumnFilterHeader
                    label="License"
                    options={columnOptions.license}
                    selected={columnFilters.license}
                    onChange={(license) =>
                      setColumnFilters((current) => ({ ...current, license }))
                    }
                  />
                </TableHead>
                <TableHead className={headClass}>
                  <ColumnFilterHeader
                    label="Customers"
                    options={columnOptions.customers}
                    selected={columnFilters.customers}
                    onChange={(customers) =>
                      setColumnFilters((current) => ({ ...current, customers }))
                    }
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((subAgent) => {
                const activityStatus =
                  activityStatusBySubAgent.get(subAgent.id) ?? 'Inactive'
                const active = activityStatus === 'Active'
                return (
                  <TableRow
                    key={subAgent.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/sub-agents/${subAgent.id}`)}
                  >
                    <TableCell className={cellClass}>
                      <div className="flex min-w-0 items-center gap-2.5">
                        <Avatar size="sm">
                          {subAgent.photoUrl ? (
                            <AvatarImage src={subAgent.photoUrl} alt="" />
                          ) : null}
                          <AvatarFallback>{initials(subAgent.name)}</AvatarFallback>
                        </Avatar>
                        <span className="truncate font-medium">{subAgent.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className={cn(cellClass, 'tabular-nums text-muted-foreground')}>
                      {subAgent.id}
                    </TableCell>
                    <TableCell className={cn(cellClass, 'text-muted-foreground')}>
                      {normalizePhone(subAgent.phone) || subAgent.phone}
                    </TableCell>
                    <TableCell className={cn(cellClass, 'text-muted-foreground')}>
                      {subAgent.branch || '—'}
                    </TableCell>
                    <TableCell className={cn(cellClass, 'text-muted-foreground')}>
                      {subAgent.licenseNumber || '—'}
                    </TableCell>
                    <TableCell className={cn(cellClass, 'tabular-nums')}>
                      {customerCountBySubAgent.get(subAgent.id) ?? 0}
                    </TableCell>
                    <TableCell className={cellClass}>
                      <Badge
                        variant="outline"
                        className={
                          active
                            ? 'border-transparent bg-[color-mix(in_srgb,var(--color-status-completed)_14%,var(--color-card))] font-medium text-[var(--color-status-completed)]'
                            : 'border-border bg-muted/60 font-medium text-muted-foreground'
                        }
                      >
                        {activityStatus}
                      </Badge>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Sheet
        open={newSubAgentOpen}
        onOpenChange={(open) => {
          if (!open) closeNewSubAgentModal()
        }}
      >
        <SheetContent className="pd-sub-agent-sheet gap-0 p-0">
          <SheetHeader className="border-b border-border px-5 py-4 pr-12">
            <SheetTitle className="text-base font-semibold">New Sub Agent</SheetTitle>
          </SheetHeader>
          <NewSubAgentForm
            onSubmit={handleCreateSubAgent}
            onCancel={closeNewSubAgentModal}
          />
        </SheetContent>
      </Sheet>
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
          <FilterChoices
            label={label}
            options={options}
            selected={selected}
            onChange={onChange}
          />
        </PopoverContent>
      </Popover>
    </span>
  )
}
