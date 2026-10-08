import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Accordion, Avatar, Badge, Button, CopyableText, EmptyState, Input, SearchField, Select, SideDrawer, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tabs, Tooltip, type BadgeVariant } from '@/components/ui'
import {
  Link,
  Navigate,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom'
import {
  Calendar,
  Check,
  CircleDot,
  Contact,
  Copy,
  IdCard,
  LayoutDashboard,
  LayoutGrid,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Table2,
  Users,
  Wallet,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { ProfilePhotoField } from '@/components/ProfilePhotoField'
import { AddClientSplitButton } from '@/components/clients/AddClientSplitButton'
import { NewClientForm } from '@/components/clients/NewClientForm'
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon'
import { updateSubAgent, useSubAgents } from '@/lib/subAgentsStore'
import {
  validateOptionalEmail,
  validateOptionalText,
  validateRequiredName,
  validateRequiredPhone,
} from '@/lib/fieldValidation'
import { formatDisplayDate } from '@/lib/formatDate'
import { useTouchedFields } from '@/lib/useTouchedFields'
import { caseStatusBadgeVariant } from '@/components/cases/CasesList'
import { useCases } from '@/lib/casesStore'
import {
  clientMatchesServiceStatusFilters,
  deriveClientServiceStatus,
  deriveSubAgentActivityStatus,
  groupCasesByClientId,
} from '@/lib/clientServiceStatus'
import {
  createClient,
  formatBalance,
  getEnabledServiceTypeOptions,
  normalizePhone,
  useClients,
} from '@/lib/clientsStore'
import {
  settleEntries,
  useCommissionSettlements,
  usePendingCommissions,
} from '@/lib/commissionsStore'
import { formatPaymentAmount, usePayments } from '@/lib/paymentsStore'
import type { Case } from '@/types/case'
import type { SubAgent, SubAgentStatus } from '@/types/subAgent'
import type {
  Client,
  CreateClientInput,
  ServiceType,
} from '@/types/client'
import '@/styles/layout-clients.css'

const PARTNER_TABS = ['overview', 'profile', 'clients'] as const

const CLIENT_STATUS_FILTERS: { value: string; label: string }[] = [
  { value: 'Pending', label: 'Pending' },
  { value: 'In-Progress', label: 'In progress' },
  { value: 'On-Hold', label: 'On hold' },
  { value: 'Completed', label: 'Completed' },
  { value: 'Cancelled', label: 'Cancelled' },
]

type SubAgentClientsListView = 'table' | 'grid'

const SUB_AGENT_CLIENTS_LIST_VIEW_KEY = 'subAgent-clients-list-view'

type ProfileDraft = {
  name: string
  phone: string
  email: string
  address: string
  licenseNumber: string
  branch: string
  photoUrl: string | undefined
}

function tabFromSearch(searchParams: URLSearchParams): string {
  const tab = searchParams.get('tab')
  return tab && PARTNER_TABS.includes(tab as (typeof PARTNER_TABS)[number])
    ? tab
    : 'overview'
}

function readSubAgentClientsListView(): SubAgentClientsListView {
  try {
    return localStorage.getItem(SUB_AGENT_CLIENTS_LIST_VIEW_KEY) === 'grid'
      ? 'grid'
      : 'table'
  } catch {
    return 'table'
  }
}

function persistSubAgentClientsListView(view: SubAgentClientsListView) {
  try {
    localStorage.setItem(SUB_AGENT_CLIENTS_LIST_VIEW_KEY, view)
  } catch {
    /* ignore quota / private mode */
  }
}

function formatMobile(phone: string): string {
  return phone.replace(/\D/g, '')
}

function whatsappHref(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (!digits) return '#'
  const withCountry =
    digits.startsWith('880') || digits.length > 11
      ? digits
      : digits.startsWith('0')
        ? `88${digits}`
        : digits
  return `https://wa.me/${withCountry}`
}

function matchesSubAgentClientFilters(
  client: Client,
  search: string,
  serviceFilters: string[],
  statusFilters: string[],
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

function statusBadgeVariant(status: SubAgentStatus): BadgeVariant {
  return status === 'Active' ? 'completed' : 'on-hold'
}

function formatDate(value: string): string {
  return formatDisplayDate(value)
}

function toProfileDraft(subAgent: SubAgent): ProfileDraft {
  return {
    name: subAgent.name,
    phone: subAgent.phone,
    email: subAgent.email ?? '',
    address: subAgent.address ?? '',
    licenseNumber: subAgent.licenseNumber ?? '',
    branch: subAgent.branch ?? '',
    photoUrl: subAgent.photoUrl,
  }
}

function StatusChip({ status }: { status: SubAgentStatus }) {
  return (
    <Badge variant={statusBadgeVariant(status)}>{status}</Badge>
  )
}

function profileDraftsEqual(a: ProfileDraft, b: ProfileDraft): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
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
  to,
  value,
  label,
}: {
  href?: string
  to?: string
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

  const valueNode = to ? (
    <Link to={to} className="pd-client-detail__contact-value">
      {value}
    </Link>
  ) : href ? (
    <a href={href} className="pd-client-detail__contact-value">
      {value}
    </a>
  ) : (
    <span className="pd-client-detail__contact-value">{value}</span>
  )

  return (
    <span className="pd-client-detail__contact">
      {valueNode}
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

export default function SubAgentDetailPage() {
  const { id = '' } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const subAgents = useSubAgents()
  const subAgent = subAgents.find((item) => item.id === id)
  const allClients = useClients()
  const allCases = useCases()
  const clients = useMemo(
    () => allClients.filter((client) => client.subAgentId === id),
    [allClients, id],
  )
  const casesByClientId = useMemo(
    () => groupCasesByClientId(allCases),
    [allCases],
  )
  const subAgentCases = useMemo(() => {
    const clientIds = new Set(clients.map((client) => client.id))
    return allCases.filter((item) => clientIds.has(item.clientId))
  }, [allCases, clients])
  const activityStatus = deriveSubAgentActivityStatus(subAgentCases)
  const payments = usePayments()
  const pendingCommissions = usePendingCommissions(id)
  const commissionSettlements = useCommissionSettlements(id)
  const activeTab = tabFromSearch(searchParams)
  const [customerOpen, setCustomerOpen] = useState(false)
  const [clientSearch, setClientSearch] = useState('')
  const [clientServiceFilters, setClientServiceFilters] = useState<string[]>([])
  const [clientStatusFilters, setClientStatusFilters] = useState<string[]>([])
  const [clientsListView, setClientsListView] = useState<SubAgentClientsListView>(
    readSubAgentClientsListView,
  )
  const [draft, setDraft] = useState<ProfileDraft | null>(null)
  const { markAllTouched, showError, blur } = useTouchedFields<
    'name' | 'phone' | 'email' | 'address' | 'licenseNumber' | 'branch'
  >()

  useEffect(() => {
    if (!subAgent) return
    setDraft(toProfileDraft(subAgent))
  }, [subAgent?.id])

  useEffect(() => {
    if (!subAgent) return
    if (subAgent.status === activityStatus) return
    updateSubAgent(subAgent.id, { status: activityStatus })
  }, [subAgent, activityStatus])

  const savedDraft = useMemo(
    () => (subAgent ? toProfileDraft(subAgent) : null),
    [subAgent],
  )

  if (!subAgent || !savedDraft) {
    return <Navigate to="/sub-agents" replace />
  }

  const profileDraft = draft ?? savedDraft
  const isDirty = !profileDraftsEqual(profileDraft, savedDraft)
  const subAgentErrors = {
    name: validateRequiredName(profileDraft.name, 'Sub agent name'),
    phone: validateRequiredPhone(profileDraft.phone),
    email: validateOptionalEmail(profileDraft.email),
    address: validateOptionalText(profileDraft.address, 'Address'),
    licenseNumber: validateOptionalText(
      profileDraft.licenseNumber,
      'License',
      40,
    ),
    branch: validateOptionalText(profileDraft.branch, 'Branch'),
  }

  const collected = payments
    .filter((item) => clients.some((client) => client.id === item.clientId))
    .reduce((sum, item) => sum + item.amount, 0)
  const outstanding = clients.reduce((sum, client) => sum + client.balance, 0)
  const filteredClients = clients.filter((client) =>
    matchesSubAgentClientFilters(
      client,
      clientSearch,
      clientServiceFilters,
      clientStatusFilters,
      casesByClientId.get(client.id) ?? [],
    ),
  )
  const hasClientFilters =
    clientServiceFilters.length > 0 || clientStatusFilters.length > 0

  const selectTab = (tab: string) => {
    const next = new URLSearchParams(searchParams)
    if (tab === 'overview') next.delete('tab')
    else next.set('tab', tab)
    setSearchParams(next, { replace: true })
  }

  const selectClientsListView = (view: SubAgentClientsListView) => {
    setClientsListView(view)
    persistSubAgentClientsListView(view)
  }

  const resetClientFilters = () => {
    setClientSearch('')
    setClientServiceFilters([])
    setClientStatusFilters([])
  }

  const discardChanges = () => {
    setDraft(savedDraft)
  }

  const saveProfile = () => {
    markAllTouched([
      'name',
      'phone',
      'email',
      'address',
      'licenseNumber',
      'branch',
    ])
    if (Object.values(subAgentErrors).some(Boolean)) return
    const updated = updateSubAgent(subAgent.id, {
      name: profileDraft.name.trim(),
      phone: profileDraft.phone.trim(),
      email: profileDraft.email.trim() || undefined,
      address: profileDraft.address.trim() || undefined,
      licenseNumber: profileDraft.licenseNumber.trim() || undefined,
      branch: profileDraft.branch.trim() || undefined,
      photoUrl: profileDraft.photoUrl,
      status: activityStatus,
    })
    if (updated) setDraft(toProfileDraft(updated))
  }

  const handleCreateClient = (input: CreateClientInput) => {
    const created = createClient({ ...input, subAgentId: subAgent.id })
    setCustomerOpen(false)
    navigate(`/clients/${created.id}?newCase=1`)
  }

  const displayName = profileDraft.name || subAgent.name
  const displayPhone = profileDraft.phone
  const displayEmail = profileDraft.email
  const displayAddress = profileDraft.address
  const displayLicense = profileDraft.licenseNumber
  const displayBranch = profileDraft.branch
  const statusForClient = (clientId: string) =>
    deriveClientServiceStatus(casesByClientId.get(clientId) ?? [])

  return (
    <div className="pd-page pd-client-detail" aria-label={subAgent.name}>
      <div className="pd-client-detail__layout">
        <aside className="pd-client-detail__card" aria-label="Sub agent profile">
          <div className="pd-client-detail__card-identity">
            <Avatar
              name={displayName}
              src={profileDraft.photoUrl ?? subAgent.photoUrl}
              size="xl"
            />
            <div className="pd-client-detail__title-row">
              <h1 className="pd-client-detail__name">
                <ContactChip value={displayName} label="sub agent name" />
              </h1>
            </div>
          </div>

          <div className="pd-client-detail__card-actions">
            <Button size="sm" onClick={() => setCustomerOpen(true)}>
              <Users size={14} strokeWidth={2.25} aria-hidden />
              Add client
            </Button>
            <div className="pd-client-detail__card-quick">
              <a
                className="pd-btn pd-btn--secondary pd-btn--sm pd-btn--icon"
                href={`tel:${displayPhone}`}
                aria-label={`Call ${displayName}`}
                title="Call"
              >
                <span className="pd-btn__label">
                  <Phone size={14} strokeWidth={2.25} aria-hidden />
                </span>
              </a>
              <a
                className="pd-btn pd-btn--secondary pd-btn--sm pd-btn--icon pd-client-detail__whatsapp"
                href={whatsappHref(displayPhone)}
                target="_blank"
                rel="noreferrer"
                aria-label={`WhatsApp ${displayName}`}
                title="WhatsApp"
              >
                <span className="pd-btn__label">
                  <WhatsAppIcon size={14} />
                </span>
              </a>
              <Button
                size="sm"
                variant="secondary"
                className="pd-btn--icon"
                onClick={() => selectTab('profile')}
                aria-label="Edit profile"
                title="Edit profile"
              >
                <Pencil size={14} strokeWidth={2.25} aria-hidden />
              </Button>
            </div>
          </div>

          <dl className="pd-client-detail__card-fields">
            <div className="pd-client-detail__card-field">
              <dt>Status</dt>
              <dd>
                <StatusChip status={activityStatus} />
              </dd>
            </div>
            <div className="pd-client-detail__card-field">
              <dt>Phone</dt>
              <dd>
                <ContactChip
                  value={displayPhone}
                  label="phone number"
                />
              </dd>
            </div>
            <div className="pd-client-detail__card-field">
              <dt>Email</dt>
              <dd>
                {displayEmail ? (
                  <ContactChip
                    value={displayEmail}
                    label="email address"
                  />
                ) : (
                  <span className="pd-client-detail__empty">—</span>
                )}
              </dd>
            </div>
            <div className="pd-client-detail__card-field">
              <dt>License</dt>
              <dd>
                {displayLicense ? (
                  <ContactChip value={displayLicense} label="license number" />
                ) : (
                  <span className="pd-client-detail__empty">—</span>
                )}
              </dd>
            </div>
            <div className="pd-client-detail__card-field">
              <dt>Branch</dt>
              <dd>
                {displayBranch ? (
                  <ContactChip value={displayBranch} label="branch" />
                ) : (
                  <span className="pd-client-detail__empty">—</span>
                )}
              </dd>
            </div>
            <div className="pd-client-detail__card-field">
              <dt>Address</dt>
              <dd>
                {displayAddress ? (
                  <ContactChip value={displayAddress} label="address" />
                ) : (
                  <span className="pd-client-detail__empty">—</span>
                )}
              </dd>
            </div>
          </dl>

          <div className="pd-client-detail__card-snapshot" aria-label="Snapshot">
            <button
              type="button"
              className="pd-client-detail__card-snap"
              onClick={() => selectTab('clients')}
            >
              <span className="pd-client-detail__card-snap-label">Clients</span>
              <span className="pd-client-detail__card-snap-value">
                {clients.length}
              </span>
            </button>
            <button
              type="button"
              className="pd-client-detail__card-snap"
              onClick={() => selectTab('clients')}
            >
              <span className="pd-client-detail__card-snap-label">
                Outstanding
              </span>
              <span
                className={[
                  'pd-client-detail__card-snap-value',
                  outstanding > 0 ? 'is-due' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {formatBalance(outstanding)}
              </span>
            </button>
          </div>

          <p className="pd-client-detail__card-footer">
            <Calendar size={12} strokeWidth={2.25} aria-hidden />
            Member since {formatDate(subAgent.createdAt)}
          </p>
        </aside>

        <div className="pd-client-detail__main">
          <Tabs
            className="pd-client-detail__tabs"
            value={activeTab}
            onValueChange={selectTab}
            items={[
              {
                id: 'overview',
                label: <TabLabel icon={LayoutDashboard}>Overview</TabLabel>,
                content: (
                  <div className="pd-client-detail__overview">
                    <section className="pd-client-detail__section pd-client-detail__section--compact">
                      <div className="pd-client-detail__section-head">
                        <SectionTitle icon={Contact}>
                          Profile Information
                        </SectionTitle>
                      </div>
                      <dl className="pd-client-detail__fields">
                        <div className="pd-client-detail__field">
                          <FieldLabel icon={Phone}>Phone</FieldLabel>
                          <dd>
                            {displayPhone}
                          </dd>
                        </div>
                        <div className="pd-client-detail__field">
                          <FieldLabel icon={Mail}>Email</FieldLabel>
                          <dd>
                            {displayEmail ? (
                              <CopyableText value={displayEmail} />
                            ) : (
                              <span className="pd-client-detail__empty">—</span>
                            )}
                          </dd>
                        </div>
                        <div className="pd-client-detail__field">
                          <FieldLabel icon={MapPin}>Address</FieldLabel>
                          <dd>
                            {displayAddress || (
                              <span className="pd-client-detail__empty">—</span>
                            )}
                          </dd>
                        </div>
                        <div className="pd-client-detail__field">
                          <FieldLabel icon={IdCard}>License</FieldLabel>
                          <dd>
                            {displayLicense || (
                              <span className="pd-client-detail__empty">—</span>
                            )}
                          </dd>
                        </div>
                        <div className="pd-client-detail__field">
                          <FieldLabel icon={MapPin}>Branch</FieldLabel>
                          <dd>
                            {displayBranch || (
                              <span className="pd-client-detail__empty">—</span>
                            )}
                          </dd>
                        </div>
                        <div className="pd-client-detail__field">
                          <FieldLabel icon={CircleDot}>Status</FieldLabel>
                          <dd>
                            <StatusChip status={activityStatus} />
                          </dd>
                        </div>
                        <div className="pd-client-detail__field">
                          <FieldLabel icon={Wallet}>Collected</FieldLabel>
                          <dd>{formatBalance(collected)}</dd>
                        </div>
                        <div className="pd-client-detail__field">
                          <FieldLabel icon={Calendar}>Member since</FieldLabel>
                          <dd>{formatDate(subAgent.createdAt)}</dd>
                        </div>
                      </dl>
                    </section>

                    <Accordion
                      className="pd-accordion--cards pd-client-detail__services-accordion"
                      defaultOpenIds={['clients', 'settlements']}
                      items={[
                        {
                          id: 'settlements',
                          title: (
                            <span className="pd-client-detail__services-accordion-title">
                              <span
                                className="pd-client-detail__section-icon"
                                aria-hidden
                              >
                                <Wallet size={15} strokeWidth={2.25} />
                              </span>
                              Settlements
                            </span>
                          ),
                          meta:
                            pendingCommissions.length > 0
                              ? String(pendingCommissions.length)
                              : undefined,
                          content:
                            pendingCommissions.length === 0 &&
                            commissionSettlements.length === 0 ? (
                              <EmptyState
                                icon={Wallet}
                                title="No commissions yet"
                                description="Commissions appear when you collect payment on clients referred by this sub agent."
                              />
                            ) : (
                              <div className="pd-client-detail__overview">
                                {pendingCommissions.length > 0 ? (
                                  <>
                                    <div className="pd-ops__toolbar">
                                      <p className="pd-ops__meta">
                                        Pending ·{' '}
                                        {formatPaymentAmount(
                                          pendingCommissions.reduce(
                                            (sum, item) => sum + item.amount,
                                            0,
                                          ),
                                        )}
                                      </p>
                                      <Button
                                        size="sm"
                                        onClick={() =>
                                          settleEntries(
                                            subAgent.id,
                                            pendingCommissions.map(
                                              (item) => item.id,
                                            ),
                                          )
                                        }
                                      >
                                        Settle all
                                      </Button>
                                    </div>
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead>Date</TableHead>
                                          <TableHead>Amount</TableHead>
                                          <TableHead>Status</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {pendingCommissions.map((entry) => (
                                          <TableRow key={entry.id}>
                                            <TableCell>
                                              {formatDisplayDate(
                                                entry.createdAt,
                                              )}
                                            </TableCell>
                                            <TableCell>
                                              {formatPaymentAmount(entry.amount)}
                                            </TableCell>
                                            <TableCell>Pending</TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </>
                                ) : null}
                                {commissionSettlements.length > 0 ? (
                                  <>
                                    <h3 className="pd-ops__section-title">
                                      Past settlements
                                    </h3>
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead>Date</TableHead>
                                          <TableHead>Entries</TableHead>
                                          <TableHead>Total</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {commissionSettlements.map((item) => (
                                          <TableRow key={item.id}>
                                            <TableCell>
                                              {formatDisplayDate(item.settledAt)}
                                            </TableCell>
                                            <TableCell>
                                              {item.entryIds.length}
                                            </TableCell>
                                            <TableCell>
                                              {formatPaymentAmount(item.total)}
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </>
                                ) : null}
                              </div>
                            ),
                        },
                        {
                          id: 'clients',
                          title: (
                            <span className="pd-client-detail__services-accordion-title">
                              <span
                                className="pd-client-detail__section-icon"
                                aria-hidden
                              >
                                <Users size={15} strokeWidth={2.25} />
                              </span>
                              Clients
                            </span>
                          ),
                          meta:
                            clients.length > 0
                              ? String(clients.length)
                              : undefined,
                          content:
                            clients.length === 0 ? (
                              <EmptyState
                                icon={Users}
                                title="No clients yet"
                                description="Register a client against this sub agent to start their first case."
                                action={
                                  <AddClientSplitButton
                                    size="md"
                                    subAgentId={subAgent.id}
                                    onAddClient={() => setCustomerOpen(true)}
                                  />
                                }
                              />
                            ) : (
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Mobile</TableHead>
                                    <TableHead>Balance due</TableHead>
                                    <TableHead>Status</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {clients.map((client) => {
                                    const serviceStatus = statusForClient(
                                      client.id,
                                    )
                                    return (
                                      <TableRow
                                        key={client.id}
                                        className="pd-clients__row"
                                        onClick={() =>
                                          navigate(`/clients/${client.id}`)
                                        }
                                      >
                                        <TableCell>
                                          <div className="pd-clients__identity">
                                            <Avatar
                                              name={client.name}
                                              src={client.avatarUrl}
                                              size="sm"
                                            />
                                            <p className="pd-clients__name">
                                              {client.name}
                                            </p>
                                          </div>
                                        </TableCell>
                                        <TableCell>
                                          {normalizePhone(client.phone) ||
                                            client.phone}
                                        </TableCell>
                                        <TableCell className="pd-clients__balance">
                                          {formatBalance(client.balance)}
                                        </TableCell>
                                        <TableCell>
                                          {serviceStatus ? (
                                            <Badge
                                              variant={caseStatusBadgeVariant(
                                                serviceStatus,
                                              )}
                                            >
                                              {serviceStatus}
                                            </Badge>
                                          ) : (
                                            '—'
                                          )}
                                        </TableCell>
                                      </TableRow>
                                    )
                                  })}
                                </TableBody>
                              </Table>
                            ),
                        },
                      ]}
                    />
                  </div>
                ),
              },
              {
                id: 'profile',
                label: <TabLabel icon={Contact}>Profile</TabLabel>,
                content: (
                  <div className="pd-client-detail__profile">
                    <div className="pd-client-profile">
                      <div className="pd-client-profile__group">
                        <h3 className="pd-client-profile__group-title">
                          Identity
                        </h3>
                        <div className="pd-client-profile__grid">
                          <div
                            className={[
                              'pd-client-profile__field',
                              'is-wide',
                              profileDraft.photoUrl !== savedDraft.photoUrl
                                ? 'is-dirty'
                                : '',
                            ]
                              .filter(Boolean)
                              .join(' ')}
                          >
                            <ProfilePhotoField
                              name={profileDraft.name}
                              value={profileDraft.photoUrl}
                              onChange={(photoUrl) =>
                                setDraft((current) => ({
                                  ...(current ?? savedDraft),
                                  photoUrl,
                                }))
                              }
                            >
                              <Input
                                label="Sub agent name"
                                required
                                value={profileDraft.name}
                                onChange={(event) =>
                                  setDraft((current) => ({
                                    ...(current ?? savedDraft),
                                    name: event.target.value,
                                  }))
                                }
                                onBlur={blur('name')}
                                error={
                                  showError('name')
                                    ? subAgentErrors.name
                                    : undefined
                                }
                              />
                            </ProfilePhotoField>
                          </div>
                          <div
                            className={
                              profileDraft.phone !== savedDraft.phone
                                ? 'pd-client-profile__field is-dirty'
                                : 'pd-client-profile__field'
                            }
                          >
                            <Input
                              label="Phone"
                              required
                              type="tel"
                              value={profileDraft.phone}
                              onChange={(event) =>
                                setDraft((current) => ({
                                  ...(current ?? savedDraft),
                                  phone: event.target.value,
                                }))
                              }
                              onBlur={blur('phone')}
                              error={
                                showError('phone')
                                  ? subAgentErrors.phone
                                  : undefined
                              }
                            />
                          </div>
                          <div
                            className={
                              profileDraft.email !== savedDraft.email
                                ? 'pd-client-profile__field is-dirty'
                                : 'pd-client-profile__field'
                            }
                          >
                            <Input
                              label="Email"
                              type="email"
                              value={profileDraft.email}
                              onChange={(event) =>
                                setDraft((current) => ({
                                  ...(current ?? savedDraft),
                                  email: event.target.value,
                                }))
                              }
                              onBlur={blur('email')}
                              error={
                                showError('email')
                                  ? subAgentErrors.email
                                  : undefined
                              }
                            />
                          </div>
                          <div
                            className={
                              profileDraft.address !== savedDraft.address
                                ? 'pd-client-profile__field is-dirty'
                                : 'pd-client-profile__field'
                            }
                          >
                            <Input
                              label="Address"
                              value={profileDraft.address}
                              onChange={(event) =>
                                setDraft((current) => ({
                                  ...(current ?? savedDraft),
                                  address: event.target.value,
                                }))
                              }
                              onBlur={blur('address')}
                              error={
                                showError('address')
                                  ? subAgentErrors.address
                                  : undefined
                              }
                            />
                          </div>
                          <div
                            className={
                              profileDraft.licenseNumber !==
                              savedDraft.licenseNumber
                                ? 'pd-client-profile__field is-dirty'
                                : 'pd-client-profile__field'
                            }
                          >
                            <Input
                              label="License"
                              value={profileDraft.licenseNumber}
                              onChange={(event) =>
                                setDraft((current) => ({
                                  ...(current ?? savedDraft),
                                  licenseNumber: event.target.value,
                                }))
                              }
                              onBlur={blur('licenseNumber')}
                              error={
                                showError('licenseNumber')
                                  ? subAgentErrors.licenseNumber
                                  : undefined
                              }
                            />
                          </div>
                          <div
                            className={
                              profileDraft.branch !== savedDraft.branch
                                ? 'pd-client-profile__field is-dirty'
                                : 'pd-client-profile__field'
                            }
                          >
                            <Input
                              label="Branch"
                              value={profileDraft.branch}
                              onChange={(event) =>
                                setDraft((current) => ({
                                  ...(current ?? savedDraft),
                                  branch: event.target.value,
                                }))
                              }
                              onBlur={blur('branch')}
                              error={
                                showError('branch')
                                  ? subAgentErrors.branch
                                  : undefined
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    {isDirty ? (
                      <div className="pd-client-detail__profile-actions">
                        <Button variant="secondary" onClick={discardChanges}>
                          Discard changes
                        </Button>
                        <Button onClick={saveProfile}>
                          <Check size={16} strokeWidth={2.25} aria-hidden />
                          Save
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ),
              },
              {
                id: 'clients',
                label: <TabLabel icon={Users}>Clients</TabLabel>,
                content: (
                  <div className="pd-sub-agent-clients">
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
                              <LayoutGrid
                                size={16}
                                strokeWidth={2.25}
                                aria-hidden
                              />
                            </button>
                          </Tooltip>
                        </div>
                        <AddClientSplitButton
                          size="md"
                          label="New client"
                          subAgentId={subAgent.id}
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
                            subAgentId={subAgent.id}
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
                        {filteredClients.map((client) => {
                          const serviceStatus = deriveClientServiceStatus(
                            casesByClientId.get(client.id) ?? [],
                          )
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
                                  <p className="pd-clients__name">
                                    {client.name}
                                  </p>
                                </div>
                                {serviceStatus ? (
                                  <Badge
                                    variant={caseStatusBadgeVariant(
                                      serviceStatus,
                                    )}
                                  >
                                    {serviceStatus}
                                  </Badge>
                                ) : null}
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
                          )
                        })}
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
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredClients.map((client) => {
                            const serviceStatus = statusForClient(client.id)
                            return (
                              <TableRow
                                key={client.id}
                                className="pd-clients__row"
                                onClick={() =>
                                  navigate(`/clients/${client.id}`)
                                }
                              >
                                <TableCell>
                                  <div className="pd-clients__identity">
                                    <Avatar
                                      name={client.name}
                                      src={client.avatarUrl}
                                      size="sm"
                                    />
                                    <p className="pd-clients__name">
                                      {client.name}
                                    </p>
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
                                <TableCell>
                                  {serviceStatus ? (
                                    <Badge
                                      variant={caseStatusBadgeVariant(
                                        serviceStatus,
                                      )}
                                    >
                                      {serviceStatus}
                                    </Badge>
                                  ) : (
                                    '—'
                                  )}
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                ),
              },
            ]}
          />
        </div>
      </div>

      <SideDrawer
        open={customerOpen}
        onClose={() => setCustomerOpen(false)}
        title="Add client"
        description="This client will be linked to this sub agent."
        className="pd-clients-drawer"
      >
        <NewClientForm
          defaultSubAgentId={subAgent.id}
          onCancel={() => setCustomerOpen(false)}
          onSubmit={handleCreateClient}
        />
      </SideDrawer>
    </div>
  )
}