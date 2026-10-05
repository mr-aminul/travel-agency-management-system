import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { LayoutGrid, Table2, UserCheck, Users, UserPlus, Wallet } from 'lucide-react'
import { AddClientSplitButton } from '@/components/clients/AddClientSplitButton'
import { NewClientForm } from '@/components/clients/NewClientForm'
import { StatCards } from '@/components/StatCards'
import {
  Avatar,
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
  Tooltip,
  type BadgeVariant,
} from '@/components/ui'
import { createClient, formatBalance, getEnabledServiceTypeOptions, useClients } from '@/lib/clientsStore'
import { formatBdt } from '@/lib/dashboardMetrics'
import { usePartners } from '@/lib/partnersStore'
import type { Client, ClientStatus, CreateClientInput, ServiceType } from '@/types/client'
import '@/styles/layout-clients.css'

type ClientStatId = 'all' | 'Active' | 'Deployed' | 'due'
type ClientsListView = 'table' | 'grid'

const CLIENTS_LIST_VIEW_KEY = 'clients-list-view'

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
  { value: 'Active', label: 'Active' },
  { value: 'Deployed', label: 'Deployed' },
  { value: 'Lead', label: 'Lead' },
  { value: 'Inactive', label: 'Inactive' },
]

function statusBadgeVariant(status: ClientStatus): BadgeVariant {
  if (status === 'Deployed') return 'completed'
  if (status === 'Lead') return 'pending'
  if (status === 'Inactive') return 'on-hold'
  return 'neutral'
}

function formatMobile(phone: string): string {
  return phone.replace(/\D/g, '')
}

function matchesFilters(
  client: Client,
  search: string,
  serviceFilters: string[],
  statusFilters: string[],
  partnerName: string,
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
    partnerName.toLowerCase().includes(q) ||
    (queryDigits.length > 0 && phoneDigits.includes(queryDigits))
  const matchService =
    serviceFilters.length === 0 ||
    serviceFilters.some((service) =>
      client.services.includes(service as ServiceType),
    )
  const matchStatus =
    statusFilters.length === 0 || statusFilters.includes(client.status)
  return matchSearch && matchService && matchStatus
}

export default function ClientsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const clients = useClients()
  const partners = usePartners()
  const [search, setSearch] = useState('')
  const [serviceFilters, setServiceFilters] = useState<string[]>([])
  const [statusFilters, setStatusFilters] = useState<string[]>([])
  const [newClientOpen, setNewClientOpen] = useState(false)
  const [dueOnly, setDueOnly] = useState(false)
  const [listView, setListView] = useState<ClientsListView>(readClientsListView)

  const partnersById = useMemo(
    () => new Map(partners.map((partner) => [partner.id, partner.name])),
    [partners],
  )

  const partnerNameFor = (client: Client) =>
    client.partnerId ? (partnersById.get(client.partnerId) ?? '') : ''

  useEffect(() => {
    setNewClientOpen(searchParams.get('new') === '1')
  }, [searchParams])

  const stats = useMemo(() => {
    let active = 0
    let deployed = 0
    let outstanding = 0
    for (const client of clients) {
      if (client.status === 'Active') active += 1
      if (client.status === 'Deployed') deployed += 1
      outstanding += client.balance
    }
    return {
      total: clients.length,
      active,
      deployed,
      outstanding,
    }
  }, [clients])

  const filtered = clients.filter((client) => {
    if (dueOnly && client.balance <= 0) return false
    return matchesFilters(
      client,
      search,
      serviceFilters,
      statusFilters,
      partnerNameFor(client),
    )
  })
  const hasActiveFilters =
    serviceFilters.length > 0 || statusFilters.length > 0 || dueOnly

  const selectedStat: ClientStatId | undefined = dueOnly
    ? 'due'
    : statusFilters.length === 1 &&
      (statusFilters[0] === 'Active' || statusFilters[0] === 'Deployed')
      ? statusFilters[0]
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
    setStatusFilters([next])
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
    if (input.openFirstCase) {
      navigate(`/clients/${created.id}?newCase=1`)
      return
    }
    navigate(`/clients/${created.id}`)
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
            id: 'Active',
            label: 'Active',
            value: String(stats.active),
            icon: UserPlus,
            tone: 'info',
          },
          {
            id: 'Deployed',
            label: 'Deployed',
            value: String(stats.deployed),
            icon: UserCheck,
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
            const partnerName = partnerNameFor(client)
            return (
              <button
                key={client.id}
                type="button"
                className="pd-clients__card"
                onClick={() => navigate(`/clients/${client.id}`)}
              >
                <div className="pd-clients__card-top">
                  <div className="pd-clients__identity">
                    <Avatar
                      name={client.name}
                      src={client.avatarUrl}
                      size="md"
                    />
                    <p className="pd-clients__name">{client.name}</p>
                  </div>
                  <Badge variant={statusBadgeVariant(client.status)}>
                    {client.status}
                  </Badge>
                </div>
                <dl className="pd-clients__card-meta">
                  <div className="pd-clients__card-row">
                    <dt>Sub Agent</dt>
                    <dd>{partnerName || '—'}</dd>
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((client) => (
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
                    />
                    <p className="pd-clients__name">{client.name}</p>
                  </div>
                </TableCell>
                <TableCell>{partnerNameFor(client) || '—'}</TableCell>
                <TableCell>{formatMobile(client.phone)}</TableCell>
                <TableCell>{client.passport || '—'}</TableCell>
                <TableCell>{client.activeCases}</TableCell>
                <TableCell className="pd-clients__balance">
                  {formatBalance(client.balance)}
                </TableCell>
                <TableCell>
                  <Badge variant={statusBadgeVariant(client.status)}>
                    {client.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
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
    </div>
  )
}
