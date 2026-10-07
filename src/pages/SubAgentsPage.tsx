import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Building2,
  CircleDot,
  Handshake,
  LayoutGrid,
  Plus,
  Table2,
  UserMinus,
  Users,
  UserCheck,
} from 'lucide-react'
import { NewSubAgentForm } from '@/components/subAgents/NewSubAgentForm'
import { StatCards } from '@/components/StatCards'
import {
  Avatar,
  Badge,
  Button,
  EmptyState,
  FilterPopover,
  SearchField,
  SideDrawer,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tooltip,
  type BadgeVariant,
} from '@/components/ui'
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

function statusBadgeVariant(status: SubAgentStatus): BadgeVariant {
  return status === 'Active' ? 'completed' : 'on-hold'
}

type SubAgentStatId = 'all' | 'Active' | 'referred' | 'idle'

function matchesFilters(
  subAgent: SubAgent,
  search: string,
  branchFilters: string[],
  statusFilters: string[],
  activityStatus: SubAgentStatus,
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
  return matchSearch && matchBranch && matchStatus
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
    )
  })
  const hasActiveFilters =
    branchFilters.length > 0 ||
    statusFilters.length > 0 ||
    clientFilter !== 'all'

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
    <div className="pd-page pd-clients" aria-label="Sub Agents">
      <StatCards
        label="Sub agent stats"
        selectedId={selectedStat}
        onSelect={selectStat}
        cards={[
          {
            id: 'all',
            label: 'Total sub agents',
            value: String(stats.total),
            icon: Handshake,
            tone: 'brand',
          },
          {
            id: 'Active',
            label: 'Active',
            value: String(stats.active),
            icon: UserCheck,
            tone: 'success',
          },
          {
            id: 'referred',
            label: 'Referred clients',
            value: String(stats.referredClients),
            icon: Users,
            tone: 'info',
          },
          {
            id: 'idle',
            label: 'No clients yet',
            value: String(stats.idle),
            icon: UserMinus,
            tone: 'muted',
          },
        ]}
      />
      <div className="pd-clients__toolbar">
        <SearchField
          className="pd-clients__search"
          placeholder="Search sub agents…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onClear={() => setSearch('')}
        />

        <div className="pd-clients__toolbar-end">
          <div className="pd-clients__filters">
            <Select
              className="pd-clients__filter"
              label="Branch"
              multiple
              searchable
              placeholder="All branches"
              searchPlaceholder="Search branches…"
              value={branchFilters}
              onChange={(event) => setBranchFilters(event.target.value)}
              options={branchOptions}
            />
            <Select
              className="pd-clients__filter"
              label="Status"
              multiple
              searchable
              placeholder="All statuses"
              searchPlaceholder="Search statuses…"
              value={statusFilters}
              onChange={(event) => setStatusFilters(event.target.value)}
              options={STATUS_FILTERS}
            />
            {hasActiveFilters ? (
              <button
                type="button"
                className="pd-clients__clear"
                onClick={() => {
                  setBranchFilters([])
                  setStatusFilters([])
                  setClientFilter('all')
                }}
              >
                Clear
              </button>
            ) : null}
          </div>
          <FilterPopover
            className="pd-clients__mobile-filters"
            sectionLabel="Sub agent attributes"
            dimensions={[
              {
                id: 'branch',
                label: 'Branch',
                icon: Building2,
                options: branchOptions,
                value: branchFilters,
                onChange: setBranchFilters,
              },
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
              setBranchFilters([])
              setStatusFilters([])
              setClientFilter('all')
            }}
          />
          <div
            className="pd-clients__views"
            role="group"
            aria-label="Sub agent list view"
          >
            <Tooltip content="Table view">
              <button
                type="button"
                className={
                  listView === 'table'
                    ? 'pd-clients__view is-active'
                    : 'pd-clients__view'
                }
                aria-pressed={listView === 'table'}
                aria-label="Table view"
                onClick={() => selectListView('table')}
              >
                <Table2 size={16} strokeWidth={2.25} aria-hidden />
              </button>
            </Tooltip>
            <Tooltip content="Grid view">
              <button
                type="button"
                className={
                  listView === 'grid'
                    ? 'pd-clients__view is-active'
                    : 'pd-clients__view'
                }
                aria-pressed={listView === 'grid'}
                aria-label="Grid view"
                onClick={() => selectListView('grid')}
              >
                <LayoutGrid size={16} strokeWidth={2.25} aria-hidden />
              </button>
            </Tooltip>
          </div>
          <Button onClick={openNewSubAgentModal}>
            <Plus size={16} strokeWidth={2.25} aria-hidden />
            New sub agent
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Handshake}
          title="No sub agents match"
          description="Try a different name, phone number, or clear filters."
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setSearch('')
                setBranchFilters([])
                setStatusFilters([])
                setClientFilter('all')
              }}
            >
              Reset filters
            </Button>
          }
        />
      ) : listView === 'grid' ? (
        <div className="pd-clients__grid">
          {filtered.map((subAgent) => {
            const activityStatus =
              activityStatusBySubAgent.get(subAgent.id) ?? 'Inactive'
            return (
              <button
                key={subAgent.id}
                type="button"
                className="pd-clients__card"
                onClick={() => navigate(`/sub-agents/${subAgent.id}`)}
              >
                <div className="pd-clients__card-top">
                  <div className="pd-clients__identity">
                    <Avatar
                      name={subAgent.name}
                      src={subAgent.photoUrl}
                      size="md"
                    />
                    <p className="pd-clients__name">{subAgent.name}</p>
                  </div>
                  <Badge variant={statusBadgeVariant(activityStatus)}>
                    {activityStatus}
                  </Badge>
                </div>
                <dl className="pd-clients__card-meta">
                  <div className="pd-clients__card-row">
                    <dt>ID</dt>
                    <dd>{subAgent.id}</dd>
                  </div>
                  <div className="pd-clients__card-row">
                    <dt>Mobile</dt>
                    <dd>{normalizePhone(subAgent.phone) || subAgent.phone}</dd>
                  </div>
                  <div className="pd-clients__card-row">
                    <dt>Branch</dt>
                    <dd>{subAgent.branch || '—'}</dd>
                  </div>
                  <div className="pd-clients__card-row">
                    <dt>License</dt>
                    <dd>{subAgent.licenseNumber || '—'}</dd>
                  </div>
                  <div className="pd-clients__card-row">
                    <dt>Customers</dt>
                    <dd>{customerCountBySubAgent.get(subAgent.id) ?? 0}</dd>
                  </div>
                </dl>
              </button>
            )
          })}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>ID</TableHead>
              <TableHead>Mobile</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead>License</TableHead>
              <TableHead>Customers</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((subAgent) => {
              const activityStatus =
                activityStatusBySubAgent.get(subAgent.id) ?? 'Inactive'
              return (
                <TableRow
                  key={subAgent.id}
                  className="pd-clients__row"
                  onClick={() => navigate(`/sub-agents/${subAgent.id}`)}
                >
                  <TableCell>
                    <div className="pd-clients__identity">
                      <Avatar
                        name={subAgent.name}
                        src={subAgent.photoUrl}
                        size="sm"
                      />
                      <p className="pd-clients__name">{subAgent.name}</p>
                    </div>
                  </TableCell>
                  <TableCell className="pd-table__code">{subAgent.id}</TableCell>
                  <TableCell>
                    {normalizePhone(subAgent.phone) || subAgent.phone}
                  </TableCell>
                  <TableCell>{subAgent.branch || '—'}</TableCell>
                  <TableCell>{subAgent.licenseNumber || '—'}</TableCell>
                  <TableCell>
                    {customerCountBySubAgent.get(subAgent.id) ?? 0}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusBadgeVariant(activityStatus)}>
                      {activityStatus}
                    </Badge>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}

      <SideDrawer
        open={newSubAgentOpen}
        onClose={closeNewSubAgentModal}
        title="New sub agent"
        description="Register the sub agent once — then attach the clients they send."
        className="pd-clients-drawer"
      >
        <NewSubAgentForm
          onSubmit={handleCreateSubAgent}
          onCancel={closeNewSubAgentModal}
        />
      </SideDrawer>
    </div>
  )
}
