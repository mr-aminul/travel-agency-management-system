import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  Link,
  Navigate,
  useNavigate,
  useOutlet,
  useParams,
  useSearchParams,
} from 'react-router-dom'
import {
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
  Receipt,
  UserRound,
  Wallet,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { CasesList } from '@/components/cases/CasesList'
import { NewCaseForm } from '@/components/cases/NewCaseForm'
import { ClientCustomFieldControl } from '@/components/clients/ClientCustomFieldControl'
import { ClientDocumentsPanel } from '@/components/clients/ClientDocumentsPanel'
import { PaymentsList } from '@/components/payments/PaymentsList'
import {
  Avatar,
  Badge,
  Button,
  CopyableText,
  EmptyState,
  Input,
  Select,
  SideDrawer,
  Tabs,
  type BadgeVariant,
} from '@/components/ui'
import { createCase, getEnabledServiceOptions, useCasesByClientId } from '@/lib/casesStore'
import { caseServiceFee } from '@/lib/caseMoney'
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
import {
  compactCustomFieldValues,
  emptyCustomFieldValues,
} from '@/lib/clientCustomFields'
import { useClientProfileFields } from '@/lib/clientProfileFieldsStore'
import { formatDisplayDate } from '@/lib/formatDate'
import type { ServiceType, CreateCaseInput } from '@/types/case'
import type {
  Client,
  ClientGender,
  ClientMaritalStatus,
  ClientStatus,
} from '@/types/client'
import type { ClientProfileField } from '@/types/clientProfileField'
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
  return fromServices ?? enabled[0]?.value ?? 'Tour Package'
}

function formatDate(value: string): string {
  return formatDisplayDate(value)
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
  status: ClientStatus
  customFields: Record<string, string>
}

type ProfileFieldDef = {
  key: keyof ProfileDraft
  label: string
  kind?: 'text' | 'date' | 'gender' | 'marital' | 'blood'
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
]

function toProfileDraft(
  client: Client,
  customFieldDefs: ClientProfileField[],
): ProfileDraft {
  return {
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
    status: client.status,
    customFields: emptyCustomFieldValues(
      customFieldDefs,
      client.customFields,
    ),
  }
}

function profileDraftsEqual(a: ProfileDraft, b: ProfileDraft): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

function ProfileFieldControl({
  field,
  value,
  onChange,
}: {
  field: ProfileFieldDef
  value: string
  onChange: (value: string) => void
}) {
  if (field.kind === 'gender') {
    return (
      <Select
        label={field.label}
        value={value}
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
        onChange={(event) => onChange(event.target.value)}
        options={BLOOD_GROUP_OPTIONS}
      />
    )
  }
  return (
    <Input
      label={field.label}
      type={field.kind === 'date' ? 'date' : 'text'}
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

export default function ClientDetailPage() {
  const { id = '', caseId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const serviceOutlet = useOutlet()
  useClients()
  const customFieldDefs = useClientProfileFields()
  const client = getClientById(id)
  const clientCases = useCasesByClientId(id)
  const activeTab = serviceOutlet ? 'services' : tabFromSearch(searchParams)
  const [newCaseOpen, setNewCaseOpen] = useState(false)
  const [serviceFeeHighlightToken, setServiceFeeHighlightToken] = useState(0)
  const [draft, setDraft] = useState<ProfileDraft | null>(null)

  useEffect(() => {
    if (searchParams.get('newCase') === '1') {
      setNewCaseOpen(true)
    }
  }, [searchParams])

  useEffect(() => {
    if (!client) return
    setDraft(toProfileDraft(client, customFieldDefs))
  }, [client?.id, customFieldDefs])

  const savedDraft = useMemo(
    () => (client ? toProfileDraft(client, customFieldDefs) : null),
    [client, customFieldDefs],
  )

  if (!client || !savedDraft) {
    return <Navigate to="/clients" replace />
  }

  const profileDraft = draft ?? savedDraft
  const isDirty = !profileDraftsEqual(profileDraft, savedDraft)

  const partner = client.partnerId ? getPartnerById(client.partnerId) : undefined
  const totalServiceFee = clientCases.reduce(
    (sum, item) => sum + caseServiceFee(item),
    0,
  )

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

  const discardChanges = () => {
    setDraft(savedDraft)
  }

  const saveProfile = () => {
    if (!profileDraft.name.trim() || !profileDraft.phone.trim()) return
    const phone = normalizePhone(profileDraft.phone)
    if (getClientByPhone(phone, client.id)) return
    const updated = updateClient(client.id, {
      name: profileDraft.name.trim(),
      phone,
      email: profileDraft.email.trim() || undefined,
      address: profileDraft.address.trim() || undefined,
      nid: profileDraft.nid.trim() || undefined,
      passport: profileDraft.passport.trim() || undefined,
      fatherName: profileDraft.fatherName.trim() || undefined,
      motherName: profileDraft.motherName.trim() || undefined,
      dateOfBirth: profileDraft.dateOfBirth.trim() || undefined,
      gender: profileDraft.gender,
      maritalStatus: parseMaritalStatus(profileDraft.maritalStatus),
      nationality: profileDraft.nationality.trim() || undefined,
      placeOfBirth: profileDraft.placeOfBirth.trim() || undefined,
      spouseName: profileDraft.spouseName.trim() || undefined,
      bloodGroup: profileDraft.bloodGroup.trim() || undefined,
      passportExpiry: profileDraft.passportExpiry.trim() || undefined,
      passportIssuedOn: profileDraft.passportIssuedOn.trim() || undefined,
      passportPlaceOfIssue: profileDraft.passportPlaceOfIssue.trim() || undefined,
      customFields: compactCustomFieldValues({
        ...Object.fromEntries(
          Object.entries(client.customFields ?? {}).filter(
            ([fieldId]) =>
              !customFieldDefs.some((field) => field.id === fieldId),
          ),
        ),
        ...emptyCustomFieldValues(customFieldDefs, {
          ...client.customFields,
          ...profileDraft.customFields,
        }),
      }),
      status: profileDraft.status,
    })
    if (updated) setDraft(toProfileDraft(updated, customFieldDefs))
  }

  const displayName = profileDraft.name || client.name
  const displayStatus = profileDraft.status
  const displayPhone = profileDraft.phone
  const displayEmail = profileDraft.email
  const displayPassport = profileDraft.passport

  return (
    <div className="pd-page pd-client-detail" aria-label={client.name}>
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
              <ContactChip value={displayEmail} label="email address" />
            ) : null}
            {displayPassport ? (
              <ContactChip value={displayPassport} label="passport number" />
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
                    onClick={() => {
                      selectTab('services')
                      setServiceFeeHighlightToken((token) => token + 1)
                    }}
                  >
                    <span className="pd-client-detail__stat-icon" aria-hidden>
                      <Receipt size={16} strokeWidth={2.25} />
                    </span>
                    <div className="pd-client-detail__stat-copy">
                      <span className="pd-client-detail__stat-label">
                        Total service fee
                      </span>
                      <span className="pd-client-detail__stat-value">
                        {formatBalance(totalServiceFee)}
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
                        <a
                          href={`tel:${displayPhone}`}
                          className="pd-client-detail__link"
                        >
                          {displayPhone}
                        </a>
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
                        {client.address || (
                          <span className="pd-client-detail__empty">—</span>
                        )}
                      </dd>
                    </div>
                    <div className="pd-client-detail__field">
                      <FieldLabel icon={IdCard}>NID</FieldLabel>
                      <dd>
                        {client.nid || (
                          <span className="pd-client-detail__empty">—</span>
                        )}
                      </dd>
                    </div>
                    <div className="pd-client-detail__field">
                      <FieldLabel icon={BookUser}>Passport</FieldLabel>
                      <dd>
                        {client.passport || (
                          <span className="pd-client-detail__empty">—</span>
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
              <div className="pd-client-detail__profile">
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
                              className={[
                                'pd-client-profile__field',
                                field.wide ? 'is-wide' : '',
                                String(profileDraft[field.key] ?? '') !==
                                String(savedDraft[field.key] ?? '')
                                  ? 'is-dirty'
                                  : '',
                              ]
                                .filter(Boolean)
                                .join(' ')}
                            >
                              <ProfileFieldControl
                                field={field}
                                value={String(profileDraft[field.key] ?? '')}
                                onChange={(value) =>
                                  setDraft((current) => ({
                                    ...(current ?? savedDraft),
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
                    {customFieldDefs.length ? (
                      <div className="pd-client-profile__group">
                        <h3 className="pd-client-profile__group-title">
                          Additional information
                        </h3>
                        <div className="pd-client-profile__grid">
                          {customFieldDefs.map((field) => (
                            <div
                              key={field.id}
                              className={
                                (profileDraft.customFields[field.id] ?? '') !==
                                (savedDraft.customFields[field.id] ?? '')
                                  ? 'pd-client-profile__field is-dirty'
                                  : 'pd-client-profile__field'
                              }
                            >
                              <ClientCustomFieldControl
                                field={field}
                                value={
                                  profileDraft.customFields[field.id] ?? ''
                                }
                                onChange={(value) =>
                                  setDraft((current) => {
                                    const base = current ?? savedDraft
                                    return {
                                      ...base,
                                      customFields: {
                                        ...base.customFields,
                                        [field.id]: value,
                                      },
                                    }
                                  })
                                }
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
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
            id: 'services',
            label: <TabLabel icon={Folder}>Services</TabLabel>,
            content: (
              <div className="pd-client-detail__services">
                <CasesList
                  cases={clientCases}
                  label={`${client.name} services`}
                  showClientColumn={false}
                  showServiceColumn
                  defaultClientId={client.id}
                  lockClient
                  defaultService={primaryServiceType(client.services)}
                  embedded
                  selectedId={caseId}
                  emptyTitle="No services yet"
                  emptyDescription="Add a service on this profile to track steps, documents, and payments."
                  serviceFeeHighlightToken={serviceFeeHighlightToken}
                />
                {serviceOutlet}
              </div>
            ),
          },
          {
            id: 'documents',
            label: <TabLabel icon={FileText}>Documents</TabLabel>,
            content: (
              <ClientDocumentsPanel
                client={client}
                cases={clientCases}
                onAddService={openNewCase}
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

      <SideDrawer
        open={newCaseOpen}
        onClose={closeNewCase}
        title="Add service"
        description="What does this client need? Progress starts at the first step of that service."
        className="pd-cases-drawer"
      >
        <NewCaseForm
          onSubmit={handleCreateCase}
          onCancel={closeNewCase}
          defaultClientId={client.id}
          lockClient
          defaultService={primaryServiceType(client.services)}
        />
      </SideDrawer>
    </div>
  )
}
