import { useEffect, useState, type ReactNode } from 'react'
import {
  Link,
  Navigate,
  useNavigate,
  useOutlet,
  useParams,
  useSearchParams,
} from 'react-router-dom'
import {
  ArrowLeft,
  BookUser,
  Calendar,
  Check,
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
  UserRound,
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
  type BadgeVariant,
} from '@/components/ui'
import { createCase, getEnabledServiceOptions, useCasesByClientId } from '@/lib/casesStore'
import { clientPath, workDetailPath } from '@/lib/workPaths'
import { getPartnerById } from '@/lib/partnersStore'
import {
  formatBalance,
  getClientById,
  getClientByPhone,
  normalizePhone,
  updateClient,
  useClients,
} from '@/lib/clientsStore'
import type { ServiceType, CreateCaseInput } from '@/types/case'
import type {
  Client,
  ClientGender,
  ClientMaritalStatus,
  ClientStatus,
} from '@/types/client'
import { DESTINATION_COUNTRIES } from '@/lib/destinationCountries'
import '@/styles/layout-clients.css'

const CLIENT_TABS = [
  'overview',
  'profile',
  'services',
  'documents',
  'payments',
  'messages',
] as const

function tabFromSearch(searchParams: URLSearchParams): string {
  const tab = searchParams.get('tab')
  return tab && CLIENT_TABS.includes(tab as (typeof CLIENT_TABS)[number])
    ? tab
    : 'overview'
}

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

const GENDER_OPTIONS = [
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
  { value: 'Other', label: 'Other' },
]

const MARITAL_VALUES = ['Single', 'Married', 'Divorced', 'Widowed'] as const

const MARITAL_OPTIONS = [
  { value: '', label: '—' },
  ...MARITAL_VALUES.map((value) => ({ value, label: value })),
]

function parseMaritalStatus(value: string): ClientMaritalStatus | undefined {
  return MARITAL_VALUES.find((entry) => entry === value)
}

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const

const BLOOD_GROUP_OPTIONS = [
  { value: '', label: '—' },
  ...BLOOD_GROUPS.map((value) => ({ value, label: value })),
]

function countryOptions(current: string) {
  const listed = DESTINATION_COUNTRIES as readonly string[]
  const extra =
    current && !listed.includes(current) ? [{ value: current, label: current }] : []
  return [
    { value: '', label: '—' },
    ...extra,
    ...listed.map((country) => ({ value: country, label: country })),
  ]
}

type ProfileDraft = {
  name: string
  phone: string
  email: string
  address: string
  nid: string
  passport: string
  fatherName: string
  motherName: string
  dateOfBirth: string
  gender: ClientGender
  maritalStatus: string
  nationality: string
  placeOfBirth: string
  spouseName: string
  bloodGroup: string
  passportExpiry: string
  passportIssuedOn: string
  passportPlaceOfIssue: string
  profession: string
  preferredCountry: string
  preferredJob: string
  status: ClientStatus
}

type ProfileFieldDef = {
  key: keyof ProfileDraft
  label: string
  kind?: 'text' | 'date' | 'gender' | 'marital' | 'country' | 'blood'
  wide?: boolean
}

const PROFILE_GROUPS: { title: string; fields: ProfileFieldDef[] }[] = [
  {
    title: 'Person',
    fields: [
      { key: 'name', label: 'Full name' },
      { key: 'dateOfBirth', label: 'Date of birth', kind: 'date' },
      { key: 'placeOfBirth', label: 'Place of birth' },
      { key: 'gender', label: 'Gender', kind: 'gender' },
      { key: 'maritalStatus', label: 'Marital status', kind: 'marital' },
      { key: 'spouseName', label: 'Spouse name' },
      { key: 'fatherName', label: 'Father name' },
      { key: 'motherName', label: 'Mother name' },
      { key: 'nationality', label: 'Nationality' },
      { key: 'bloodGroup', label: 'Blood group', kind: 'blood' },
    ],
  },
  {
    title: 'Passport',
    fields: [
      { key: 'passport', label: 'Passport number' },
      { key: 'passportIssuedOn', label: 'Date of issue', kind: 'date' },
      { key: 'passportExpiry', label: 'Date of expiry', kind: 'date' },
      { key: 'passportPlaceOfIssue', label: 'Place of issue' },
    ],
  },
  {
    title: 'Placement',
    fields: [
      { key: 'profession', label: 'Profession' },
      { key: 'preferredCountry', label: 'Preferred country', kind: 'country' },
      { key: 'preferredJob', label: 'Preferred job' },
    ],
  },
]

function profileFieldValue(
  client: Client,
  draft: ProfileDraft,
  editing: boolean,
  field: ProfileFieldDef,
): string {
  if (editing) return String(draft[field.key] ?? '')
  const value = client[field.key as keyof Client]
  return typeof value === 'string' ? value : ''
}

function ProfileFieldControl({
  field,
  value,
  editing,
  onChange,
}: {
  field: ProfileFieldDef
  value: string
  editing: boolean
  onChange: (value: string) => void
}) {
  if (field.kind === 'gender') {
    return (
      <Select
        label={field.label}
        value={value}
        readOnly={!editing}
        onChange={(event) => onChange(event.target.value)}
        options={GENDER_OPTIONS}
      />
    )
  }
  if (field.kind === 'marital') {
    return (
      <Select
        label={field.label}
        value={value}
        readOnly={!editing}
        onChange={(event) => onChange(event.target.value)}
        options={MARITAL_OPTIONS}
      />
    )
  }
  if (field.kind === 'blood') {
    return (
      <Select
        label={field.label}
        value={value}
        readOnly={!editing}
        onChange={(event) => onChange(event.target.value)}
        options={BLOOD_GROUP_OPTIONS}
      />
    )
  }
  if (field.kind === 'country') {
    return (
      <Select
        label={field.label}
        value={value}
        readOnly={!editing}
        searchable
        onChange={(event) => onChange(event.target.value)}
        options={countryOptions(value)}
      />
    )
  }
  return (
    <Input
      label={field.label}
      type={field.kind === 'date' ? 'date' : 'text'}
      readOnly={!editing}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  )
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
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const serviceOutlet = useOutlet()
  useClients()
  const client = getClientById(id)
  const clientCases = useCasesByClientId(id)
  const activeTab = serviceOutlet ? 'services' : tabFromSearch(searchParams)
  const [editing, setEditing] = useState(false)
  const [phoneError, setPhoneError] = useState<string | undefined>()
  const [newCaseOpen, setNewCaseOpen] = useState(false)
  const [draft, setDraft] = useState<ProfileDraft>({
    name: '',
    phone: '',
    email: '',
    address: '',
    nid: '',
    passport: '',
    fatherName: '',
    motherName: '',
    dateOfBirth: '',
    gender: 'Male' as ClientGender,
    maritalStatus: '',
    nationality: '',
    placeOfBirth: '',
    spouseName: '',
    bloodGroup: '',
    passportExpiry: '',
    passportIssuedOn: '',
    passportPlaceOfIssue: '',
    profession: '',
    preferredCountry: '',
    preferredJob: '',
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

  const partner = client.partnerId ? getPartnerById(client.partnerId) : undefined

  const selectTab = (tab: string) => {
    if (serviceOutlet) {
      navigate(clientPath(id, tab))
      return
    }
    const next = new URLSearchParams(searchParams)
    if (tab === 'overview') next.delete('tab')
    else next.set('tab', tab)
    setSearchParams(next, { replace: true })
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
    navigate(workDetailPath(created))
  }

  const startEditing = () => {
    setDraft({
      name: client.name,
      phone: client.phone,
      email: client.email ?? '',
      address: client.address ?? '',
      nid: client.nid ?? '',
      passport: client.passport ?? '',
      fatherName: client.fatherName ?? '',
      motherName: client.motherName ?? '',
      dateOfBirth: client.dateOfBirth ?? '',
      gender: client.gender ?? 'Male',
      maritalStatus: client.maritalStatus ?? '',
      nationality: client.nationality ?? '',
      placeOfBirth: client.placeOfBirth ?? '',
      spouseName: client.spouseName ?? '',
      bloodGroup: client.bloodGroup ?? '',
      passportExpiry: client.passportExpiry ?? '',
      passportIssuedOn: client.passportIssuedOn ?? '',
      passportPlaceOfIssue: client.passportPlaceOfIssue ?? '',
      profession: client.profession ?? '',
      preferredCountry: client.preferredCountry ?? '',
      preferredJob: client.preferredJob ?? '',
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
      fatherName: draft.fatherName.trim() || undefined,
      motherName: draft.motherName.trim() || undefined,
      dateOfBirth: draft.dateOfBirth.trim() || undefined,
      gender: draft.gender,
      maritalStatus: parseMaritalStatus(draft.maritalStatus),
      nationality: draft.nationality.trim() || undefined,
      placeOfBirth: draft.placeOfBirth.trim() || undefined,
      spouseName: draft.spouseName.trim() || undefined,
      bloodGroup: draft.bloodGroup.trim() || undefined,
      passportExpiry: draft.passportExpiry.trim() || undefined,
      passportIssuedOn: draft.passportIssuedOn.trim() || undefined,
      passportPlaceOfIssue: draft.passportPlaceOfIssue.trim() || undefined,
      profession: draft.profession.trim() || undefined,
      preferredCountry: draft.preferredCountry.trim() || undefined,
      preferredJob: draft.preferredJob.trim() || undefined,
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
    <div
      className={
        serviceOutlet
          ? 'pd-page pd-client-detail is-service-open'
          : 'pd-page pd-client-detail'
      }
      aria-label={client.name}
    >
      <Link to="/clients" className="pd-client-detail__back">
        <ArrowLeft size={14} strokeWidth={2.25} aria-hidden />
        All clients
      </Link>

      <header className="pd-client-detail__header">
        <Avatar name={displayName} src={client.avatarUrl} size="xl" />
        <div className="pd-client-detail__header-text">
          <div className="pd-client-detail__title-row">
            <h1 className="pd-client-detail__name">{displayName}</h1>
            <Badge variant={statusBadgeVariant(displayStatus)}>
              {displayStatus}
            </Badge>
          </div>
          <div className="pd-client-detail__meta-row">
            <ContactChip
              href={`tel:${displayPhone}`}
              value={displayPhone}
              label="phone number"
            />
            {displayEmail ? (
              <ContactChip
                href={`mailto:${displayEmail}`}
                value={displayEmail}
                label="email address"
              />
            ) : null}
          </div>
        </div>
        <div className="pd-client-detail__header-actions">
          <Button size="sm" onClick={openNewCase}>
            <Folder size={14} strokeWidth={2.25} aria-hidden />
            Add service
          </Button>
        </div>
      </header>

      <Tabs
        value={activeTab}
        onValueChange={selectTab}
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
                    onClick={() => selectTab('services')}
                  >
                    <span className="pd-client-detail__stat-icon" aria-hidden>
                      <Folder size={16} strokeWidth={2.25} />
                    </span>
                    <div className="pd-client-detail__stat-copy">
                      <span className="pd-client-detail__stat-label">
                        Open services
                      </span>
                      <span className="pd-client-detail__stat-value">
                        {client.activeCases}
                      </span>
                    </div>
                  </button>
                  <button
                    type="button"
                    className="pd-client-detail__stat"
                    onClick={() => selectTab('payments')}
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

                <section className="pd-client-detail__section pd-client-detail__section--compact">
                  <div className="pd-client-detail__section-head">
                    <SectionTitle icon={Contact}>Profile Information</SectionTitle>
                  </div>
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
                          client.address || (
                            <span className="pd-client-detail__empty">—</span>
                          )
                        )}
                      </dd>
                    </div>
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
                      <FieldLabel icon={Calendar}>Member since</FieldLabel>
                      <dd>{formatDate(client.createdAt)}</dd>
                    </div>
                    <div className="pd-client-detail__field">
                      <FieldLabel icon={UserRound}>Sub Agent</FieldLabel>
                      <dd>
                        {partner ? (
                          <Link
                            to={`/partners/${partner.id}`}
                            className="pd-client-detail__link"
                          >
                            {partner.name}
                          </Link>
                        ) : (
                          <span className="pd-client-detail__empty">—</span>
                        )}
                      </dd>
                    </div>
                  </dl>
                </section>

                <section className="pd-client-detail__section pd-client-detail__section--compact pd-client-detail__section--services">
                  <div className="pd-client-detail__section-head">
                    <SectionTitle icon={Folder}>Services</SectionTitle>
                  </div>
                  <CasesList
                    cases={clientCases}
                    label={`${client.name} services`}
                    showClientColumn={false}
                    showServiceColumn
                    defaultClientId={client.id}
                    lockClient
                    defaultService={primaryServiceType(client.services)}
                    embedded
                    showToolbar={false}
                    emptyTitle="No services yet"
                    emptyDescription="Add a service on this profile to track steps, documents, and payments."
                  />
                </section>
              </div>
            ),
          },
          {
            id: 'profile',
            label: <TabLabel icon={Contact}>Profile</TabLabel>,
            content: (
              <div className="pd-client-detail__overview">
                <section
                  className={
                    editing
                      ? 'pd-client-detail__section pd-client-detail__section--profile is-editing'
                      : 'pd-client-detail__section pd-client-detail__section--profile'
                  }
                >
                  <div className="pd-client-detail__section-head">
                    <SectionTitle icon={Contact}>Personal information</SectionTitle>
                    <div className="pd-client-detail__section-actions">
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
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={startEditing}
                        >
                          <SquarePen size={14} strokeWidth={2.25} aria-hidden />
                          Edit
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="pd-client-profile">
                    {PROFILE_GROUPS.map((group) => (
                      <div key={group.title} className="pd-client-profile__group">
                        <h3 className="pd-client-profile__group-title">
                          {group.title}
                        </h3>
                        <div className="pd-client-profile__grid">
                          {group.fields.map((field) => (
                            <div
                              key={field.key}
                              className={
                                field.wide
                                  ? 'pd-client-profile__field is-wide'
                                  : 'pd-client-profile__field'
                              }
                            >
                              <ProfileFieldControl
                                field={field}
                                value={profileFieldValue(
                                  client,
                                  draft,
                                  editing,
                                  field,
                                )}
                                editing={editing}
                                onChange={(value) =>
                                  setDraft((current) => ({
                                    ...current,
                                    [field.key]:
                                      field.kind === 'gender'
                                        ? (value as ClientGender)
                                        : value,
                                  }))
                                }
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            ),
          },
          {
            id: 'services',
            label: <TabLabel icon={Folder}>Services</TabLabel>,
            content: serviceOutlet ?? (
              <section className="pd-client-detail__section pd-client-detail__section--compact pd-client-detail__section--services">
                <div className="pd-client-detail__section-head">
                  <SectionTitle icon={Folder}>Services</SectionTitle>
                </div>
                <CasesList
                  cases={clientCases}
                  label={`${client.name} services`}
                  showClientColumn={false}
                  showServiceColumn
                  defaultClientId={client.id}
                  lockClient
                  defaultService={primaryServiceType(client.services)}
                  embedded
                  emptyTitle="No services yet"
                  emptyDescription="Add a service on this profile to track steps, documents, and payments."
                />
              </section>
            ),
          },
          {
            id: 'documents',
            label: <TabLabel icon={FileText}>Documents</TabLabel>,
            content: (
              <EmptyState
                icon={FileText}
                title="Identity on this profile"
                description="NID and passport are stored on the client. Papers for a service (medical, visa, tickets) live on that service and unlock as steps advance."
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
        title="Add service"
        description="What does this client need? Progress starts at the first step of that service."
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
