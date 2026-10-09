import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Avatar, Badge, Button, EmptyState, FilterPopover, SearchField, Select, SideDrawer, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tooltip, TypeConfirmDialog } from '@/components/ui'
import {
  CheckCircle2,
  CircleDot,
  FolderOpen,
  LayoutGrid,
  ListChecks,
  Table2,
  Users,
  Wallet,
} from 'lucide-react'
import { AddClientSplitButton } from '@/components/clients/AddClientSplitButton'
import { ClientRowActions } from '@/components/clients/ClientRowActions'
import { NewClientForm } from '@/components/clients/NewClientForm'
import { caseStatusBadgeVariant } from '@/components/cases/CasesList'
import { StatCards } from '@/components/StatCards'
import { useCases } from '@/lib/casesStore'
import {
  clientMatchesServiceStatusFilters,
  deriveClientServiceStatus,
  groupCasesByClientId,
} from '@/lib/clientServiceStatus'
import {
  archiveClient,
  createClient,
  formatBalance,
  getEnabledServiceTypeOptions,
  softDeleteClient,
  unarchiveClient,
  useClients,
} from '@/lib/clientsStore'
import { formatBdt } from '@/lib/dashboardMetrics'
import { useSubAgents } from '@/lib/subAgentsStore'
import type { Case } from '@/types/case'
import type { Client, CreateClientInput, ServiceType } from '@/types/client'
import '@/styles/layout-clients.css'

type ClientStatId = 'all' | 'open' | 'Completed' | 'due'
type ClientsListView = 'table' | 'grid'

const CLIENTS_LIST_VIEW_KEY = 'clients-list-view'
const OPEN_STATUSES = ['Pending', 'In-Progress', 'On-Hold'] as const

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

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: 'Pending', label: 'Pending' },
  { value: 'In-Progress', label: 'In progress' },
  { value: 'On-Hold', label: 'On hold' },
  { value: 'Completed', label: 'Completed' },
  { value: 'Cancelled', label: 'Cancelled' },
]

function isOpenStatusFilter(statusFilters: string[]): boolean {
  return (
    statusFilters.length === OPEN_STATUSES.length &&
    OPEN_STATUSES.every((status) => statusFilters.includes(status))
  )
}

function formatMobile(phone: string): string {
  return phone.replace(/\D/g, '')
}

function matchesFilters(
  client: Client,
  search: string,
  serviceFilters: string[],
  statusFilters: string[],
  subAgentName: string,
  clientCases: Case[],
): boolean {
  const q = search.trim().toLowerCase()
  const phoneDigits = formatMobile(client.phone)
  const queryDigits = formatMobile(q)
  const matchSearch =
    !q ||
    client.name.toLowerCase().includes(q) ||
    client.phone.toLowerCase().includes(q) ||
    client.passport?.toLowerCase().includes(q) ||
    client.nid?.toLowerCase().includes(q) ||
    subAgentName.toLowerCase().includes(q) ||
    (queryDigits.length > 0 && phoneDigits.includes(queryDigits))
  const matchService =
    serviceFilters.length === 0 ||
    serviceFilters.some((service) =>
      client.services.includes(service as ServiceType),
    )
  const matchStatus = clientMatchesServiceStatusFilters(
    clientCases,
    statusFilters,
  )
  return matchSearch && matchService && matchStatus
}

export default function ClientsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [showArchived, setShowArchived] = useState(false)
  const activeClients = useClients()
  const clients = useClients({
    includeArchived: showArchived,
    archivedOnly: showArchived,
  })
  const cases = useCases()
  const subAgents = useSubAgents()
  const [search, setSearch] = useState('')
  const [serviceFilters, setServiceFilters] = useState<string[]>([])
  const [statusFilters, setStatusFilters] = useState<string[]>([])
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
      if (client.activeCases > 0) open += 1
      if (
        deriveClientServiceStatus(casesByClientId.get(client.id) ?? []) ===
        'Completed'
      ) {
        completed += 1
      }
      outstanding += client.balance
    }
    return {
      total: activeClients.length,
      open,
      completed,
      outstanding,
    }
  }, [activeClients, casesByClientId])

  const filtered = clients.filter((client) => {
    if (dueOnly && client.balance <= 0) return false
    return matchesFilters(
      client,
      search,
      serviceFilters,
      statusFilters,
      subAgentNameFor(client),
      casesFor(client.id),
    )
  })
  const hasActiveFilters =
    serviceFilters.length > 0 || statusFilters.length > 0 || dueOnly

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

  const selectListView = (view: ClientsListView) => {
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
    const created = createClient(input)
    closeNewClientModal()
    navigate(`/clients/${created.id}?newCase=1`)
  }

  const handleArchive = (client: Client) => {
    archiveClient(client.id)
  }

  const handleUnarchive = (client: Client) => {
    unarchiveClient(client.id)
  }

  const handleConfirmDelete = () => {
    if (!deleteTarget) return
    softDeleteClient(deleteTarget.id)
    setDeleteTarget(null)
  }

  return (
    <div className="pd-page pd-clients" aria-label="Clients">
      <StatCards
        label="Client stats"
        selectedId={selectedStat}
        onSelect={selectStat}
        cards={[
          {
            id: 'all',
            label: 'Total clients',
            value: String(stats.total),
            icon: Users,
            tone: 'brand',
          },
          {
            id: 'open',
            label: 'Open services',
            value: String(stats.open),
            icon: FolderOpen,
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
      <div className="pd-clients__toolbar">
        <SearchField
          className="pd-clients__search"
          placeholder="Search clients…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onClear={() => setSearch('')}
        />

        <div className="pd-clients__toolbar-end">
          <div className="pd-clients__filters">
            <Select
              className="pd-clients__filter"
              label="Service"
              multiple
              searchable
              placeholder="All services"
              searchPlaceholder="Search services…"
              value={serviceFilters}
              onChange={(event) => setServiceFilters(event.target.value)}
              options={getEnabledServiceTypeOptions()}
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
            {hasActiveFilters && (
              <button
                type="button"
                className="pd-clients__clear"
                onClick={() => {
                  setServiceFilters([])
                  setStatusFilters([])
                  setDueOnly(false)
                }}
              >
                Clear
              </button>
            )}
          </div>
          <FilterPopover
            className="pd-clients__mobile-filters"
            sectionLabel="Client attributes"
            dimensions={[
              {
                id: 'service',
                label: 'Service',
                icon: ListChecks,
                options: getEnabledServiceTypeOptions(),
                value: serviceFilters,
                onChange: setServiceFilters,
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
              setServiceFilters([])
              setStatusFilters([])
              setDueOnly(false)
            }}
          />
          <div className="pd-clients__views" role="group" aria-label="Client list view">
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
          <Button
            variant={showArchived ? 'primary' : 'secondary'}
            size="md"
            aria-pressed={showArchived}
            onClick={() => setShowArchived((value) => !value)}
          >
            {showArchived ? 'Viewing archived' : 'Archived'}
          </Button>
          <AddClientSplitButton
            size="md"
            label="New client"
            onAddClient={openNewClientModal}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No clients match"
          description="Try a different name, phone number, or clear filters."
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setSearch('')
                setServiceFilters([])
                setStatusFilters([])
                setDueOnly(false)
              }}
            >
              Reset filters
            </Button>
          }
        />
      ) : listView === 'grid' ? (
        <div className="pd-clients__grid">
          {filtered.map((client) => {
            const subAgentName = subAgentNameFor(client)
            const serviceStatus = statusFor(client.id)
            return (
              <div key={client.id} className="pd-clients__card">
                <div className="pd-clients__card-top">
                  <button
                    type="button"
                    className="pd-clients__card-main"
                    onClick={() => navigate(`/clients/${client.id}`)}
                  >
                    <div className="pd-clients__identity">
                      <Avatar
                        name={client.name}
                        src={client.avatarUrl}
                        size="md"
                        kind="client"
                      />
                      <p className="pd-clients__name">{client.name}</p>
                    </div>
                  </button>
                  <div className="pd-clients__card-top-end">
                    {client.archivedAt ? (
                      <Badge variant="neutral">Archived</Badge>
                    ) : serviceStatus ? (
                      <Badge variant={caseStatusBadgeVariant(serviceStatus)}>
                        {serviceStatus}
                      </Badge>
                    ) : null}
                    <ClientRowActions
                      client={client}
                      onArchive={handleArchive}
                      onUnarchive={handleUnarchive}
                      onDelete={setDeleteTarget}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  className="pd-clients__card-main pd-clients__card-main--meta"
                  onClick={() => navigate(`/clients/${client.id}`)}
                >
                  <dl className="pd-clients__card-meta">
                    <div className="pd-clients__card-row">
                      <dt>Sub Agent</dt>
                      <dd>{subAgentName || '—'}</dd>
                    </div>
                    <div className="pd-clients__card-row">
                      <dt>Mobile</dt>
                      <dd>{formatMobile(client.phone)}</dd>
                    </div>
                    <div className="pd-clients__card-row">
                      <dt>Passport</dt>
                      <dd>{client.passport || '—'}</dd>
                    </div>
                    <div className="pd-clients__card-row">
                      <dt>Open services</dt>
                      <dd>{client.activeCases}</dd>
                    </div>
                    <div className="pd-clients__card-row">
                      <dt>Balance due</dt>
                      <dd className="pd-clients__balance">
                        {formatBalance(client.balance)}
                      </dd>
                    </div>
                  </dl>
                </button>
              </div>
            )
          })}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Sub Agent</TableHead>
              <TableHead>Mobile</TableHead>
              <TableHead>Passport</TableHead>
              <TableHead>Open services</TableHead>
              <TableHead>Balance due</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="pd-clients__actions-head">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((client) => {
              const serviceStatus = statusFor(client.id)
              return (
                <TableRow
                  key={client.id}
                  className="pd-clients__row"
                  onClick={() => navigate(`/clients/${client.id}`)}
                >
                  <TableCell>
                    <div className="pd-clients__identity">
                      <Avatar
                        name={client.name}
                        src={client.avatarUrl}
                        size="sm"
                        kind="client"
                      />
                      <p className="pd-clients__name">{client.name}</p>
                    </div>
                  </TableCell>
                  <TableCell>{subAgentNameFor(client) || '—'}</TableCell>
                  <TableCell>{formatMobile(client.phone)}</TableCell>
                  <TableCell>{client.passport || '—'}</TableCell>
                  <TableCell>{client.activeCases}</TableCell>
                  <TableCell className="pd-clients__balance">
                    {formatBalance(client.balance)}
                  </TableCell>
                  <TableCell>
                    {client.archivedAt ? (
                      <Badge variant="neutral">Archived</Badge>
                    ) : serviceStatus ? (
                      <Badge variant={caseStatusBadgeVariant(serviceStatus)}>
                        {serviceStatus}
                      </Badge>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell
                    className="pd-clients__actions-cell"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <ClientRowActions
                      client={client}
                      onArchive={handleArchive}
                      onUnarchive={handleUnarchive}
                      onDelete={setDeleteTarget}
                    />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}

      <SideDrawer
        open={newClientOpen}
        onClose={closeNewClientModal}
        title="New client"
        description="Register the person once — then add the service they need."
        className="pd-clients-drawer"
      >
        <NewClientForm
          onSubmit={handleCreateClient}
          onCancel={closeNewClientModal}
        />
      </SideDrawer>

      <TypeConfirmDialog
        open={deleteTarget != null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Delete client?"
        description={
          deleteTarget
            ? `${deleteTarget.name} will move to Trash for 30 days. Type the client name to confirm.`
            : undefined
        }
        confirmPhrase={deleteTarget?.name ?? ''}
        phraseLabel="Client name"
        confirmLabel="Delete client"
      />
    </div>
  )
}
