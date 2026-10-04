import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Users } from 'lucide-react'
import { NewClientForm } from '@/components/clients/NewClientForm'
import {
  Avatar,
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
import { createClient, formatBalance, getEnabledServiceTypeOptions, useClients } from '@/lib/clientsStore'
import type { Client, ClientStatus, CreateClientInput, ServiceType } from '@/types/client'
import '@/styles/layout-clients.css'

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
): boolean {
  const q = search.trim().toLowerCase()
  const phoneDigits = formatMobile(client.phone)
  const queryDigits = formatMobile(q)
  const matchSearch =
    !q ||
    client.name.toLowerCase().includes(q) ||
    client.phone.toLowerCase().includes(q) ||
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
  const [search, setSearch] = useState('')
  const [serviceFilters, setServiceFilters] = useState<string[]>([])
  const [statusFilters, setStatusFilters] = useState<string[]>([])
  const [newClientOpen, setNewClientOpen] = useState(false)

  useEffect(() => {
    setNewClientOpen(searchParams.get('new') === '1')
  }, [searchParams])

  const filtered = clients.filter((client) =>
    matchesFilters(client, search, serviceFilters, statusFilters),
  )
  const hasActiveFilters =
    serviceFilters.length > 0 || statusFilters.length > 0

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
                }}
              >
                Clear
              </button>
            )}
          </div>
          <Button onClick={openNewClientModal}>
            <Plus size={16} strokeWidth={2.25} aria-hidden />
            New client
          </Button>
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
              }}
            >
              Reset filters
            </Button>
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Mobile</TableHead>
              <TableHead>Passport</TableHead>
              <TableHead>Active cases</TableHead>
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
                    <div className="pd-clients__identity-text">
                      <p className="pd-clients__name">{client.name}</p>
                    </div>
                  </div>
                </TableCell>
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

      <Modal
        open={newClientOpen}
        onClose={closeNewClientModal}
        title="New client"
        description="Register the person once — then open a case for their purpose."
        className="pd-clients-modal"
      >
        <NewClientForm
          onSubmit={handleCreateClient}
          onCancel={closeNewClientModal}
        />
      </Modal>
    </div>
  )
}
