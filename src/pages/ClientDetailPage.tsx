import { useEffect, useState, type ReactNode } from 'react'
import {
  Link,
  Navigate,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom'
import {
  ArrowLeft,
  BookUser,
  Calendar,
  Check,
  CircleDot,
  Contact,
  Copy,
  FileText,
  Folder,
  IdCard,
  LayoutDashboard,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  SquarePen,
  Wallet,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { CasesList } from '@/components/cases/CasesList'
import { NewCaseForm } from '@/components/cases/NewCaseForm'
import { PaymentsList } from '@/components/payments/PaymentsList'
import {
  Avatar,
  Badge,
  Button,
  EmptyState,
  Input,
  Modal,
  Select,
  Tabs,
  Textarea,
  type BadgeVariant,
} from '@/components/ui'
import { createCase, getEnabledServiceOptions, useCasesByClientId } from '@/lib/casesStore'
import {
  formatBalance,
  getClientById,
  getClientByPhone,
  normalizePhone,
  updateClient,
  useClients,
} from '@/lib/clientsStore'
import type { ServiceType, CreateCaseInput } from '@/types/case'
import type { ClientStatus } from '@/types/client'
import '@/styles/layout-clients.css'

const STATUS_OPTIONS = [
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

function primaryServiceType(services: ServiceType[]): ServiceType {
  const enabled = getEnabledServiceOptions()
  const fromServices = services.find((service) =>
    enabled.some((option) => option.value === service),
  )
  return fromServices ?? enabled[0]?.value ?? 'Leisure'
}

function formatDate(value: string): string {
  const date = new Date(`${value}T00:00:00`)
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

export default function ClientDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  useClients()
  const client = getClientById(id)
  const clientCases = useCasesByClientId(id)
  const [activeTab, setActiveTab] = useState('overview')
  const [editing, setEditing] = useState(false)
  const [phoneError, setPhoneError] = useState<string | undefined>()
  const [newCaseOpen, setNewCaseOpen] = useState(false)
  const [draft, setDraft] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    nid: '',
    passport: '',
    status: 'Active' as ClientStatus,
  })

  useEffect(() => {
    if (searchParams.get('newCase') === '1') {
      setNewCaseOpen(true)
    }
  }, [searchParams])

  if (!client) {
    return <Navigate to="/clients" replace />
  }

  const openNewCase = () => {
    setNewCaseOpen(true)
    if (searchParams.get('newCase') !== '1') {
      const next = new URLSearchParams(searchParams)
      next.set('newCase', '1')
      setSearchParams(next, { replace: true })
    }
  }

  const closeNewCase = () => {
    setNewCaseOpen(false)
    if (searchParams.get('newCase')) {
      const next = new URLSearchParams(searchParams)
      next.delete('newCase')
      setSearchParams(next, { replace: true })
    }
  }

  const handleCreateCase = (input: CreateCaseInput) => {
    const created = createCase(input)
    closeNewCase()
    navigate(`/cases/${created.id}`)
  }

  const startEditing = () => {
    setDraft({
      name: client.name,
      phone: client.phone,
      email: client.email ?? '',
      address: client.address ?? '',
      nid: client.nid ?? '',
      passport: client.passport ?? '',
      status: client.status,
    })
    setPhoneError(undefined)
    setEditing(true)
  }

  const finishEditing = () => {
    if (!draft.name.trim() || !draft.phone.trim()) return
    const phone = normalizePhone(draft.phone)
    const conflict = getClientByPhone(phone, client.id)
    if (conflict) {
      setPhoneError(
        `This mobile number is already registered to ${conflict.name}.`,
      )
      return
    }
    updateClient(client.id, {
      name: draft.name.trim(),
      phone,
      email: draft.email.trim() || undefined,
      address: draft.address.trim() || undefined,
      nid: draft.nid.trim() || undefined,
      passport: draft.passport.trim() || undefined,
      status: draft.status,
    })
    setPhoneError(undefined)
    setEditing(false)
  }

  const displayName = editing ? draft.name || client.name : client.name
  const displayStatus = editing ? draft.status : client.status
  const displayPhone = editing ? draft.phone : client.phone
  const displayEmail = editing ? draft.email : client.email

  return (
    <div className="pd-page pd-client-detail" aria-label={client.name}>
      <Link to="/clients" className="pd-client-detail__back">
        <ArrowLeft size={14} strokeWidth={2.25} aria-hidden />
        All clients
      </Link>

      <header
        className={
          editing
            ? 'pd-client-detail__header is-editing'
            : 'pd-client-detail__header'
        }
      >
        <Avatar name={displayName} src={client.avatarUrl} size="xl" />
        <div className="pd-client-detail__header-text">
          {editing ? (
            <Input
              label="Full name"
              value={draft.name}
              onChange={(event) =>
                setDraft((current) => ({ ...current, name: event.target.value }))
              }
            />
          ) : (
            <div className="pd-client-detail__title-row">
              <h1 className="pd-client-detail__name">{client.name}</h1>
              <Badge variant={statusBadgeVariant(displayStatus)}>
                {displayStatus}
              </Badge>
            </div>
          )}
          {editing ? null : (
            <div className="pd-client-detail__meta-row">
              <ContactChip
                href={`tel:${client.phone}`}
                value={client.phone}
                label="phone number"
              />
              {client.email ? (
                <ContactChip
                  href={`mailto:${client.email}`}
                  value={client.email}
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
              <Button size="sm" onClick={openNewCase}>
                <Folder size={14} strokeWidth={2.25} aria-hidden />
                Open case
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
                    onClick={() => setActiveTab('cases')}
                  >
                    <span className="pd-client-detail__stat-icon" aria-hidden>
                      <Folder size={16} strokeWidth={2.25} />
                    </span>
                    <div className="pd-client-detail__stat-copy">
                      <span className="pd-client-detail__stat-label">
                        Active cases
                      </span>
                      <span className="pd-client-detail__stat-value">
                        {client.activeCases}
                      </span>
                    </div>
                  </button>
                  <button
                    type="button"
                    className="pd-client-detail__stat"
                    onClick={() => setActiveTab('payments')}
                  >
                    <span className="pd-client-detail__stat-icon" aria-hidden>
                      <Wallet size={16} strokeWidth={2.25} />
                    </span>
                    <div className="pd-client-detail__stat-copy">
                      <span className="pd-client-detail__stat-label">
                        Balance due
                      </span>
                      <span className="pd-client-detail__stat-value">
                        {formatBalance(client.balance)}
                      </span>
                    </div>
                  </button>
                </div>

                <div className="pd-client-detail__grid">
                  <section className="pd-client-detail__section">
                    <SectionTitle icon={Contact}>Contact</SectionTitle>
                    <dl className="pd-client-detail__fields">
                      <div className="pd-client-detail__field">
                        <FieldLabel icon={Phone}>Phone</FieldLabel>
                        <dd>
                          {editing ? (
                            <Input
                              value={draft.phone}
                              onChange={(event) => {
                                setPhoneError(undefined)
                                setDraft((current) => ({
                                  ...current,
                                  phone: event.target.value,
                                }))
                              }}
                              error={phoneError}
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
                            client.address || (
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
                        <FieldLabel icon={IdCard}>NID</FieldLabel>
                        <dd>
                          {editing ? (
                            <Input
                              value={draft.nid}
                              onChange={(event) =>
                                setDraft((current) => ({
                                  ...current,
                                  nid: event.target.value,
                                }))
                              }
                            />
                          ) : (
                            client.nid || (
                              <span className="pd-client-detail__empty">—</span>
                            )
                          )}
                        </dd>
                      </div>
                      <div className="pd-client-detail__field">
                        <FieldLabel icon={BookUser}>Passport</FieldLabel>
                        <dd>
                          {editing ? (
                            <Input
                              value={draft.passport}
                              onChange={(event) =>
                                setDraft((current) => ({
                                  ...current,
                                  passport: event.target.value,
                                }))
                              }
                            />
                          ) : (
                            client.passport || (
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
                                  status: event.target.value as ClientStatus,
                                }))
                              }
                              options={STATUS_OPTIONS}
                            />
                          ) : (
                            <Badge variant={statusBadgeVariant(client.status)}>
                              {client.status}
                            </Badge>
                          )}
                        </dd>
                      </div>
                      <div className="pd-client-detail__field">
                        <FieldLabel icon={Calendar}>Member since</FieldLabel>
                        <dd>{formatDate(client.createdAt)}</dd>
                      </div>
                    </dl>
                  </section>
                </div>
              </div>
            ),
          },
          {
            id: 'cases',
            label: <TabLabel icon={Folder}>Cases</TabLabel>,
            content: (
              <CasesList
                cases={clientCases}
                label={`${client.name} cases`}
                showClientColumn={false}
                showServiceColumn
                defaultClientId={client.id}
                lockClient
                defaultService={primaryServiceType(client.services)}
                embedded
                emptyTitle="No cases yet"
                emptyDescription="Open a case for this client to track their purpose step by step."
              />
            ),
          },
          {
            id: 'documents',
            label: <TabLabel icon={FileText}>Documents</TabLabel>,
            content: (
              <EmptyState
                icon={FileText}
                title="Identity on this profile"
                description="NID and passport are stored on the client. Case-required documents (medical, visa, tickets) live on each case and unlock as steps advance."
              />
            ),
          },
          {
            id: 'payments',
            label: <TabLabel icon={Wallet}>Payments</TabLabel>,
            content: (
              <PaymentsList
                clientId={client.id}
                cases={clientCases}
              />
            ),
          },
          {
            id: 'messages',
            label: <TabLabel icon={MessageSquare}>Messages</TabLabel>,
            content: (
              <EmptyState
                icon={MessageSquare}
                title="No messages yet"
                description="SMS and email history for this client will appear here."
              />
            ),
          },
        ]}
      />

      <Modal
        open={newCaseOpen}
        onClose={closeNewCase}
        title="Open case"
        description="Capture why this client came — progress starts at the first service step."
        className="pd-cases-modal"
      >
        <NewCaseForm
          onSubmit={handleCreateCase}
          onCancel={closeNewCase}
          defaultClientId={client.id}
          lockClient
          defaultService={primaryServiceType(client.services)}
        />
      </Modal>
    </div>
  )
}
