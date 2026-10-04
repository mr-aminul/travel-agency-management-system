import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Calendar,
  Check,
  CircleDot,
  ClipboardList,
  Contact,
  Copy,
  IdCard,
  LayoutDashboard,
  Mail,
  MapPin,
  Phone,
  SquarePen,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { PartnerPhotoField } from '@/components/PartnerPhotoField'
import { NewClientForm } from '@/components/clients/NewClientForm'
import {
  Avatar,
  Badge,
  Button,
  EmptyState,
  Input,
  Select,
  SideDrawer,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  Textarea,
  type BadgeVariant,
} from '@/components/ui'
import { getPartnerById, updatePartner, usePartners } from '@/lib/partnersStore'
import { createCase } from '@/lib/casesStore'
import { workDetailPath } from '@/lib/workPaths'
import {
  createClient,
  formatBalance,
  normalizePhone,
  useClients,
} from '@/lib/clientsStore'
import { usePayments } from '@/lib/paymentsStore'
import { useRequests } from '@/lib/requestsStore'
import type { PartnerStatus } from '@/types/partner'
import type { CreateClientInput } from '@/types/client'
import '@/styles/layout-clients.css'

const STATUS_OPTIONS = [
  { value: 'Active', label: 'Active' },
  { value: 'Inactive', label: 'Inactive' },
]

function statusBadgeVariant(status: PartnerStatus): BadgeVariant {
  return status === 'Active' ? 'completed' : 'on-hold'
}

function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
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
  href: string
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
      <a href={href} className="pd-client-detail__contact-value">
        {value}
      </a>
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
  usePartners()
  const partner = getPartnerById(id)
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
      <Link to="/partners" className="pd-client-detail__back">
        <ArrowLeft size={14} strokeWidth={2.25} aria-hidden />
        All sub agents
      </Link>

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
                <ContactChip
                  href={`mailto:${partner.email}`}
                  value={partner.email}
                  label="email address"
                />
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
            <>
              <Button size="sm" onClick={() => setCustomerOpen(true)}>
                <UserPlus size={14} strokeWidth={2.25} aria-hidden />
                Add customer
              </Button>
              <Button variant="secondary" size="sm" onClick={startEditing}>
                <SquarePen size={14} strokeWidth={2.25} aria-hidden />
                Edit
              </Button>
            </>
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

                <div className="pd-client-detail__grid">
                  <section className="pd-client-detail__section">
                    <SectionTitle icon={Contact}>Contact</SectionTitle>
                    {editing ? (
                      <div className="pd-client-detail__fields">
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
                      </div>
                    ) : null}
                    <dl className="pd-client-detail__fields">
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
                            <a
                              href={`mailto:${displayEmail}`}
                              className="pd-client-detail__link"
                            >
                              {displayEmail}
                            </a>
                          ) : (
                            <span className="pd-client-detail__empty">—</span>
                          )}
                        </dd>
                      </div>
                      <div className="pd-client-detail__field pd-client-detail__field-full">
                        <FieldLabel icon={MapPin}>Address</FieldLabel>
                        <dd>
                          {editing ? (
                            <Textarea
                              rows={2}
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
                    </dl>
                  </section>

                  <section className="pd-client-detail__section">
                    <SectionTitle icon={IdCard}>Identity</SectionTitle>
                    <dl className="pd-client-detail__fields">
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
              </div>
            ),
          },
          {
            id: 'clients',
            label: <TabLabel icon={Users}>Clients</TabLabel>,
            content:
              clients.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="No customers yet"
                  description="Register a client against this sub agent to start their first case."
                  action={
                    <Button onClick={() => setCustomerOpen(true)}>
                      <UserPlus size={16} strokeWidth={2.25} aria-hidden />
                      Add customer
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
                      <TableHead>Country</TableHead>
                      <TableHead>Balance due</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clients.map((client) => (
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
                        <TableCell>{client.preferredCountry || '—'}</TableCell>
                        <TableCell className="pd-clients__balance">
                          {formatBalance(client.balance)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ),
          },
        ]}
      />

      <SideDrawer
        open={customerOpen}
        onClose={() => setCustomerOpen(false)}
        title="Add customer"
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
