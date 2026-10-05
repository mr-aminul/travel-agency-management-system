import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import {
  Calendar,
  Check,
  CircleDot,
  ClipboardList,
  Contact,
  Copy,
  IdCard,
  LayoutDashboard,
  LayoutGrid,
  Mail,
  MapPin,
  Phone,
  SquarePen,
  Table2,
  Users,
  Wallet,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { PartnerPhotoField } from '@/components/PartnerPhotoField'
import { AddClientSplitButton } from '@/components/clients/AddClientSplitButton'
import { NewClientForm } from '@/components/clients/NewClientForm'
import {
  Avatar,
  BackButton,
  Badge,
  Button,
  CopyableText,
  EmptyState,
  Input,
  SearchField,
  Select,
  SideDrawer,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  Tooltip,
  type BadgeVariant,
} from '@/components/ui'
import { updatePartner, usePartners } from '@/lib/partnersStore'
import { formatDisplayDate } from '@/lib/formatDate'
import { createCase } from '@/lib/casesStore'
import { workDetailPath } from '@/lib/workPaths'
import {
  createClient,
  formatBalance,
  getEnabledServiceTypeOptions,
  normalizePhone,
  useClients,
} from '@/lib/clientsStore'
import { usePayments } from '@/lib/paymentsStore'
import { useRequests } from '@/lib/requestsStore'
import type { PartnerStatus } from '@/types/partner'
import type {
  Client,
  ClientStatus,
  CreateClientInput,
  ServiceType,
} from '@/types/client'
import '@/styles/layout-clients.css'

const STATUS_OPTIONS = [
  { value: 'Active', label: 'Active' },
  { value: 'Inactive', label: 'Inactive' },
]

const CLIENT_STATUS_FILTERS: { value: string; label: string }[] = [
  { value: 'Active', label: 'Active' },
  { value: 'Deployed', label: 'Deployed' },
  { value: 'Lead', label: 'Lead' },
  { value: 'Inactive', label: 'Inactive' },
]

type PartnerClientsListView = 'table' | 'grid'

const PARTNER_CLIENTS_LIST_VIEW_KEY = 'partner-clients-list-view'

function readPartnerClientsListView(): PartnerClientsListView {
  try {
    return localStorage.getItem(PARTNER_CLIENTS_LIST_VIEW_KEY) === 'grid'
      ? 'grid'
      : 'table'
  } catch {
    return 'table'
  }
}

function persistPartnerClientsListView(view: PartnerClientsListView) {
  try {
    localStorage.setItem(PARTNER_CLIENTS_LIST_VIEW_KEY, view)
  } catch {
    /* ignore quota / private mode */
  }
}

function clientStatusBadgeVariant(status: ClientStatus): BadgeVariant {
  if (status === 'Deployed') return 'completed'
  if (status === 'Lead') return 'pending'
  if (status === 'Inactive') return 'on-hold'
  return 'neutral'
}

function formatMobile(phone: string): string {
  return phone.replace(/\D/g, '')
}

function matchesPartnerClientFilters(
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
    client.passport?.toLowerCase().includes(q) ||
    client.nid?.toLowerCase().includes(q) ||
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

function statusBadgeVariant(status: PartnerStatus): BadgeVariant {
  return status === 'Active' ? 'completed' : 'on-hold'
}

function formatDate(value: string): string {
  return formatDisplayDate(value)
}

function FieldLabel({
  icon: Icon,
  children,
}: {
  icon: LucideIcon
  children: ReactNode
}) {
  return (
    <dt>
      <span className="pd-client-detail__field-icon" aria-hidden>
        <Icon size={13} strokeWidth={2.25} />
      </span>
      {children}
    </dt>
  )
}

function TabLabel({
  icon: Icon,
  children,
}: {
  icon: LucideIcon
  children: ReactNode
}) {
  return (
    <>
      <Icon size={15} strokeWidth={2.25} aria-hidden />
      {children}
    </>
  )
}

function SectionTitle({
  icon: Icon,
  children,
}: {
  icon: LucideIcon
  children: ReactNode
}) {
  return (
    <h2 className="pd-client-detail__section-title">
      <span className="pd-client-detail__section-icon" aria-hidden>
        <Icon size={15} strokeWidth={2.25} />
      </span>
      {children}
    </h2>
  )
}

function ContactChip({
  href,
  value,
  label,
}: {
  href?: string
  value: string
  label: string
}) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), 1500)
    return () => window.clearTimeout(timer)
  }, [copied])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <span className="pd-client-detail__contact">
      {href ? (
        <a href={href} className="pd-client-detail__contact-value">
          {value}
        </a>
      ) : (
        <span className="pd-client-detail__contact-value">{value}</span>
      )}
      <button
        type="button"
        className="pd-client-detail__contact-copy"
        onClick={handleCopy}
        aria-label={copied ? `${label} copied` : `Copy ${label}`}
        title={copied ? 'Copied' : `Copy ${label}`}
      >
        {copied ? (
          <Check size={13} strokeWidth={2.25} aria-hidden />
        ) : (
          <Copy size={13} strokeWidth={2.25} aria-hidden />
        )}
      </button>
    </span>
  )
}

export default function PartnerDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const partners = usePartners()
  const partner = partners.find((item) => item.id === id)
  const allClients = useClients()
  const clients = useMemo(
    () => allClients.filter((client) => client.partnerId === id),
    [allClients, id],
  )
  const payments = usePayments()
  const requests = useRequests()
  const [activeTab, setActiveTab] = useState('overview')
  const [editing, setEditing] = useState(false)
  const [customerOpen, setCustomerOpen] = useState(false)
  const [clientSearch, setClientSearch] = useState('')
  const [clientServiceFilters, setClientServiceFilters] = useState<string[]>([])
  const [clientStatusFilters, setClientStatusFilters] = useState<string[]>([])
  const [clientsListView, setClientsListView] = useState<PartnerClientsListView>(
    readPartnerClientsListView,
  )
  const [draft, setDraft] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    licenseNumber: '',
    branch: '',
    photoUrl: undefined as string | undefined,
    status: 'Active' as PartnerStatus,
  })

  if (!partner) {
    return <Navigate to="/partners" replace />
  }

  const collected = payments
    .filter((item) => clients.some((client) => client.id === item.clientId))
    .reduce((sum, item) => sum + item.amount, 0)
  const outstanding = clients.reduce((sum, client) => sum + client.balance, 0)
  const pendingRequests = requests.filter(
    (item) => item.partnerId === partner.id && item.reviewStatus === 'Pending',
  ).length
  const filteredClients = clients.filter((client) =>
    matchesPartnerClientFilters(
      client,
      clientSearch,
      clientServiceFilters,
      clientStatusFilters,
    ),
  )
  const hasClientFilters =
    clientServiceFilters.length > 0 || clientStatusFilters.length > 0
  const selectClientsListView = (view: PartnerClientsListView) => {
    setClientsListView(view)
    persistPartnerClientsListView(view)
  }
  const resetClientFilters = () => {
    setClientSearch('')
    setClientServiceFilters([])
    setClientStatusFilters([])
  }

  const startEditing = () => {
    setDraft({
      name: partner.name,
      phone: partner.phone,
      email: partner.email ?? '',
      address: partner.address ?? '',
      licenseNumber: partner.licenseNumber ?? '',
      branch: partner.branch ?? '',
      photoUrl: partner.photoUrl,
      status: partner.status,
    })
    setEditing(true)
  }

  const finishEditing = () => {
    if (!draft.name.trim() || !draft.phone.trim()) return
    updatePartner(partner.id, {
      name: draft.name.trim(),
      phone: draft.phone.trim(),
      email: draft.email.trim() || undefined,
      address: draft.address.trim() || undefined,
      licenseNumber: draft.licenseNumber.trim() || undefined,
      branch: draft.branch.trim() || undefined,
      photoUrl: draft.photoUrl,
      status: draft.status,
    })
    setEditing(false)
  }

  const handleCreateClient = (input: CreateClientInput) => {
    const created = createClient({ ...input, partnerId: partner.id })
    setCustomerOpen(false)
    if (input.openFirstCase) {
      const opened = createCase({
        clientId: created.id,
        service: input.primaryService,
      })
      navigate(workDetailPath(opened))
      return
    }
    navigate(`/clients/${created.id}`)
  }

  const displayName = editing ? draft.name || partner.name : partner.name
  const displayStatus = editing ? draft.status : partner.status
  const displayPhone = editing ? draft.phone : partner.phone
  const displayEmail = editing ? draft.email : partner.email

  return (
    <div className="pd-page pd-client-detail" aria-label={partner.name}>
      <BackButton to="/partners" label="Sub Agents" />

      <header
        className={
          editing
            ? 'pd-client-detail__header is-editing'
            : 'pd-client-detail__header'
        }
      >
        <Avatar
          name={displayName}
          src={editing ? draft.photoUrl : partner.photoUrl}
          size="xl"
        />
        <div className="pd-client-detail__header-text">
          {editing ? (
            <Input
              label="Sub Agent name"
              value={draft.name}
              onChange={(event) =>
                setDraft((current) => ({ ...current, name: event.target.value }))
              }
            />
          ) : (
            <div className="pd-client-detail__title-row">
              <h1 className="pd-client-detail__name">{partner.name}</h1>
              <Badge variant={statusBadgeVariant(displayStatus)}>
                {displayStatus}
              </Badge>
            </div>
          )}
          {editing ? null : (
            <div className="pd-client-detail__meta-row">
              <ContactChip
                href={`tel:${partner.phone}`}
                value={partner.phone}
                label="phone number"
              />
              {partner.email ? (
                <ContactChip value={partner.email} label="email address" />
              ) : null}
            </div>
          )}
          {editing ? (
            <Badge variant={statusBadgeVariant(displayStatus)}>
              {displayStatus}
            </Badge>
          ) : null}
        </div>
        <div className="pd-client-detail__header-actions">
          {editing ? (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setEditing(false)}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={finishEditing}>
                <Check size={14} strokeWidth={2.25} aria-hidden />
                Save
              </Button>
            </>
          ) : (
            <Button variant="secondary" size="sm" onClick={startEditing}>
              <SquarePen size={14} strokeWidth={2.25} aria-hidden />
              Edit
            </Button>
          )}
        </div>
      </header>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        items={[
          {
            id: 'overview',
            label: <TabLabel icon={LayoutDashboard}>Overview</TabLabel>,
            content: (
              <div className="pd-client-detail__overview">
                <div className="pd-client-detail__stats" aria-label="Summary">
                  <button
                    type="button"
                    className="pd-client-detail__stat"
                    onClick={() => setActiveTab('clients')}
                  >
                    <span className="pd-client-detail__stat-icon" aria-hidden>
                      <Users size={16} strokeWidth={2.25} />
                    </span>
                    <div className="pd-client-detail__stat-copy">
                      <span className="pd-client-detail__stat-label">
                        Customers
                      </span>
                      <span className="pd-client-detail__stat-value">
                        {clients.length}
                      </span>
                    </div>
                  </button>
                  <button
                    type="button"
                    className="pd-client-detail__stat"
                    onClick={() => setActiveTab('clients')}
                  >
                    <span className="pd-client-detail__stat-icon" aria-hidden>
                      <Wallet size={16} strokeWidth={2.25} />
                    </span>
                    <div className="pd-client-detail__stat-copy">
                      <span className="pd-client-detail__stat-label">
                        Collected
                      </span>
                      <span className="pd-client-detail__stat-value">
                        {formatBalance(collected)}
                      </span>
                    </div>
                  </button>
                  <button
                    type="button"
                    className="pd-client-detail__stat"
                    onClick={() => setActiveTab('clients')}
                  >
                    <span className="pd-client-detail__stat-icon" aria-hidden>
                      <Wallet size={16} strokeWidth={2.25} />
                    </span>
                    <div className="pd-client-detail__stat-copy">
                      <span className="pd-client-detail__stat-label">
                        Outstanding
                      </span>
                      <span className="pd-client-detail__stat-value">
                        {formatBalance(outstanding)}
                      </span>
                    </div>
                  </button>
                  <div className="pd-client-detail__stat">
                    <span className="pd-client-detail__stat-icon" aria-hidden>
                      <ClipboardList size={16} strokeWidth={2.25} />
                    </span>
                    <div className="pd-client-detail__stat-copy">
                      <span className="pd-client-detail__stat-label">
                        Pending requests
                      </span>
                      <span className="pd-client-detail__stat-value">
                        {pendingRequests}
                      </span>
                    </div>
                  </div>
                </div>

                <section className="pd-client-detail__section pd-client-detail__section--compact">
                  <div className="pd-client-detail__section-head">
                    <SectionTitle icon={Contact}>Profile Information</SectionTitle>
                  </div>
                  <dl className="pd-client-detail__fields">
                    {editing ? (
                      <div className="pd-client-detail__field pd-client-detail__field-full">
                        <FieldLabel icon={IdCard}>Photo</FieldLabel>
                        <dd>
                          <PartnerPhotoField
                            name={draft.name}
                            value={draft.photoUrl}
                            onChange={(photoUrl) =>
                              setDraft((current) => ({
                                ...current,
                                photoUrl,
                              }))
                            }
                          />
                        </dd>
                      </div>
                    ) : null}
                    <div className="pd-client-detail__field">
                      <FieldLabel icon={Phone}>Phone</FieldLabel>
                      <dd>
                        {editing ? (
                          <Input
                            value={draft.phone}
                            onChange={(event) =>
                              setDraft((current) => ({
                                ...current,
                                phone: event.target.value,
                              }))
                            }
                          />
                        ) : (
                          <a
                            href={`tel:${displayPhone}`}
                            className="pd-client-detail__link"
                          >
                            {displayPhone}
                          </a>
                        )}
                      </dd>
                    </div>
                    <div className="pd-client-detail__field">
                      <FieldLabel icon={Mail}>Email</FieldLabel>
                      <dd>
                        {editing ? (
                          <Input
                            type="email"
                            value={draft.email}
                            onChange={(event) =>
                              setDraft((current) => ({
                                ...current,
                                email: event.target.value,
                              }))
                            }
                          />
                        ) : displayEmail ? (
                          <CopyableText value={displayEmail} />
                        ) : (
                          <span className="pd-client-detail__empty">—</span>
                        )}
                      </dd>
                    </div>
                    <div className="pd-client-detail__field">
                      <FieldLabel icon={MapPin}>Address</FieldLabel>
                      <dd>
                        {editing ? (
                          <Input
                            value={draft.address}
                            onChange={(event) =>
                              setDraft((current) => ({
                                ...current,
                                address: event.target.value,
                              }))
                            }
                          />
                        ) : (
                          partner.address || (
                            <span className="pd-client-detail__empty">—</span>
                          )
                        )}
                      </dd>
                    </div>
                    <div className="pd-client-detail__field">
                      <FieldLabel icon={IdCard}>License</FieldLabel>
                      <dd>
                        {editing ? (
                          <Input
                            value={draft.licenseNumber}
                            onChange={(event) =>
                              setDraft((current) => ({
                                ...current,
                                licenseNumber: event.target.value,
                              }))
                            }
                          />
                        ) : (
                          partner.licenseNumber || (
                            <span className="pd-client-detail__empty">—</span>
                          )
                        )}
                      </dd>
                    </div>
                    <div className="pd-client-detail__field">
                      <FieldLabel icon={MapPin}>Branch</FieldLabel>
                      <dd>
                        {editing ? (
                          <Input
                            value={draft.branch}
                            onChange={(event) =>
                              setDraft((current) => ({
                                ...current,
                                branch: event.target.value,
                              }))
                            }
                          />
                        ) : (
                          partner.branch || (
                            <span className="pd-client-detail__empty">—</span>
                          )
                        )}
                      </dd>
                    </div>
                    <div className="pd-client-detail__field">
                      <FieldLabel icon={CircleDot}>Status</FieldLabel>
                      <dd>
                        {editing ? (
                          <Select
                            value={draft.status}
                            onChange={(event) =>
                              setDraft((current) => ({
                                ...current,
                                status: event.target.value as PartnerStatus,
                              }))
                            }
                            options={STATUS_OPTIONS}
                          />
                        ) : (
                          <Badge variant={statusBadgeVariant(partner.status)}>
                            {partner.status}
                          </Badge>
                        )}
                      </dd>
                    </div>
                    <div className="pd-client-detail__field">
                      <FieldLabel icon={Calendar}>Member since</FieldLabel>
                      <dd>{formatDate(partner.createdAt)}</dd>
                    </div>
                  </dl>
                </section>
              </div>
            ),
          },
          {
            id: 'clients',
            label: <TabLabel icon={Users}>Clients</TabLabel>,
            content: (
              <div className="pd-partner-clients">
                <div className="pd-clients__toolbar">
                  <SearchField
                    className="pd-clients__search"
                    placeholder="Search clients…"
                    value={clientSearch}
                    onChange={(event) => setClientSearch(event.target.value)}
                    onClear={() => setClientSearch('')}
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
                        value={clientServiceFilters}
                        onChange={(event) =>
                          setClientServiceFilters(event.target.value)
                        }
                        options={getEnabledServiceTypeOptions()}
                      />
                      <Select
                        className="pd-clients__filter"
                        label="Status"
                        multiple
                        searchable
                        placeholder="All statuses"
                        searchPlaceholder="Search statuses…"
                        value={clientStatusFilters}
                        onChange={(event) =>
                          setClientStatusFilters(event.target.value)
                        }
                        options={CLIENT_STATUS_FILTERS}
                      />
                      {hasClientFilters ? (
                        <button
                          type="button"
                          className="pd-clients__clear"
                          onClick={() => {
                            setClientServiceFilters([])
                            setClientStatusFilters([])
                          }}
                        >
                          Clear
                        </button>
                      ) : null}
                    </div>
                    <div
                      className="pd-clients__views"
                      role="group"
                      aria-label="Client list view"
                    >
                      <Tooltip content="Table view">
                        <button
                          type="button"
                          className={
                            clientsListView === 'table'
                              ? 'pd-clients__view is-active'
                              : 'pd-clients__view'
                          }
                          aria-pressed={clientsListView === 'table'}
                          aria-label="Table view"
                          onClick={() => selectClientsListView('table')}
                        >
                          <Table2 size={16} strokeWidth={2.25} aria-hidden />
                        </button>
                      </Tooltip>
                      <Tooltip content="Grid view">
                        <button
                          type="button"
                          className={
                            clientsListView === 'grid'
                              ? 'pd-clients__view is-active'
                              : 'pd-clients__view'
                          }
                          aria-pressed={clientsListView === 'grid'}
                          aria-label="Grid view"
                          onClick={() => selectClientsListView('grid')}
                        >
                          <LayoutGrid size={16} strokeWidth={2.25} aria-hidden />
                        </button>
                      </Tooltip>
                    </div>
                    <AddClientSplitButton
                      size="md"
                      label="New client"
                      partnerId={partner.id}
                      onAddClient={() => setCustomerOpen(true)}
                    />
                  </div>
                </div>

                {clients.length === 0 ? (
                  <EmptyState
                    icon={Users}
                    title="No customers yet"
                    description="Register a client against this sub agent to start their first case."
                    action={
                      <AddClientSplitButton
                        size="md"
                        partnerId={partner.id}
                        onAddClient={() => setCustomerOpen(true)}
                      />
                    }
                  />
                ) : filteredClients.length === 0 ? (
                  <EmptyState
                    icon={Users}
                    title="No clients match"
                    description="Try a different name, phone number, or clear filters."
                    action={
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={resetClientFilters}
                      >
                        Reset filters
                      </Button>
                    }
                  />
                ) : clientsListView === 'grid' ? (
                  <div className="pd-clients__grid">
                    {filteredClients.map((client) => (
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
                          <Badge variant={clientStatusBadgeVariant(client.status)}>
                            {client.status}
                          </Badge>
                        </div>
                        <dl className="pd-clients__card-meta">
                          <div className="pd-clients__card-row">
                            <dt>Mobile</dt>
                            <dd>{formatMobile(client.phone)}</dd>
                          </div>
                          <div className="pd-clients__card-row">
                            <dt>Passport</dt>
                            <dd>{client.passport || '—'}</dd>
                          </div>
                          <div className="pd-clients__card-row">
                            <dt>Country</dt>
                            <dd>{client.preferredCountry || '—'}</dd>
                          </div>
                          <div className="pd-clients__card-row">
                            <dt>Balance due</dt>
                            <dd className="pd-clients__balance">
                              {formatBalance(client.balance)}
                            </dd>
                          </div>
                        </dl>
                      </button>
                    ))}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Mobile</TableHead>
                        <TableHead>Passport</TableHead>
                        <TableHead>Country</TableHead>
                        <TableHead>Balance due</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredClients.map((client) => (
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
                          <TableCell>
                            {normalizePhone(client.phone) || client.phone}
                          </TableCell>
                          <TableCell>{client.passport || '—'}</TableCell>
                          <TableCell>
                            {client.preferredCountry || '—'}
                          </TableCell>
                          <TableCell className="pd-clients__balance">
                            {formatBalance(client.balance)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            ),
          },
        ]}
      />

      <SideDrawer
        open={customerOpen}
        onClose={() => setCustomerOpen(false)}
        title="Add client"
        description="This client will be linked to this sub agent."
        className="pd-clients-drawer"
      >
        <NewClientForm
          defaultPartnerId={partner.id}
          onCancel={() => setCustomerOpen(false)}
          onSubmit={handleCreateClient}
        />
      </SideDrawer>
    </div>
  )
}
