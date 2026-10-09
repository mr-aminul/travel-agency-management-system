import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Accordion, Avatar, Badge, Button, Input, Select, SideDrawer, Tabs } from '@/components/ui'
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
  UserRound,
  Wallet,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { CasesList } from '@/components/cases/CasesList'
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon'
import { ClientServicesWorkspace } from '@/components/cases/ClientServicesWorkspace'
import { NewCaseForm } from '@/components/cases/NewCaseForm'
import { ClientCustomFieldControl } from '@/components/clients/ClientCustomFieldControl'
import { ClientDocumentsPanel } from '@/components/clients/ClientDocumentsPanel'
import { ClientMessagesPanel } from '@/components/clients/ClientMessagesPanel'
import { PaymentsList } from '@/components/payments/PaymentsList'
import { caseStatusBadgeVariant } from '@/components/cases/CasesList'
import {
  createCase,
  getEnabledServiceOptions,
  reconcileClientIdentityFromCases,
  useCasesByClientId,
} from '@/lib/casesStore'
import { countClientDocumentAlerts } from '@/lib/clientDocuments'
import {
  listClientInfoGaps,
  type ClientInfoGap,
  type ClientInfoGapId,
} from '@/lib/clientMissingInfo'
import { toServiceBoardItem } from '@/lib/clientServiceBoard'
import { deriveClientServiceStatus } from '@/lib/clientServiceStatus'
import { useRequests } from '@/lib/requestsStore'
import { clientPath, workDetailPath } from '@/lib/workPaths'
import { getSubAgentById, useSubAgents } from '@/lib/subAgentsStore'
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
import { validateCustomFieldValue } from '@/lib/clientCustomFieldValidation'
import { useClientProfileFields } from '@/lib/clientProfileFieldsStore'
import {
  validateOptionalDateOfBirth,
  validateOptionalEmail,
  validateOptionalNid,
  validateOptionalPassport,
  validateOptionalPersonName,
  validateOptionalText,
  validatePassportDates,
  validateRequiredName,
  validateRequiredPhone,
} from '@/lib/fieldValidation'
import { formatDisplayDate } from '@/lib/formatDate'
import { flashAndReveal } from '@/lib/scrollWithin'
import { useTouchedFields } from '@/lib/useTouchedFields'
import type { ServiceType, CreateCaseInput } from '@/types/case'
import type {
  Client,
  ClientGender,
  ClientMaritalStatus,
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
  'email',
] as const

function tabFromSearch(searchParams: URLSearchParams): string {
  const tab = searchParams.get('tab')
  return tab && CLIENT_TABS.includes(tab as (typeof CLIENT_TABS)[number])
    ? tab
    : 'overview'
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
  banglaName: string
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
  /** Empty string = agency-direct (no referring sub agent). */
  subAgentId: string
  customFields: Record<string, string>
}

type ProfileFieldDef = {
  key: keyof ProfileDraft
  label: string
  kind?: 'text' | 'date' | 'gender' | 'marital' | 'blood' | 'subAgent'
  /** Share of a 6-column row. Defaults to 2 (one-third). */
  span?: 1 | 2 | 3 | 6
  wide?: boolean
}

function profileFieldLayoutClass(field: Pick<ProfileFieldDef, 'span' | 'wide'>): string {
  if (field.wide) return 'is-wide'
  if (field.span === 1) return 'is-span-1'
  if (field.span === 3) return 'is-span-3'
  if (field.span === 6) return 'is-span-6'
  return ''
}

/** Profile draft keys that map to missing-info gap ids. */
const PROFILE_GAP_FIELD: Record<ClientInfoGapId, keyof ProfileDraft> = {
  passport: 'passport',
  passportIssuedOn: 'passportIssuedOn',
  passportExpiry: 'passportExpiry',
  nid: 'nid',
  address: 'address',
  email: 'email',
}

const PROFILE_GROUPS: {
  title: string
  icon: LucideIcon
  fields: ProfileFieldDef[]
}[] = [
  {
    title: 'Person',
    icon: UserRound,
    fields: [
      { key: 'name', label: 'Full name' },
      { key: 'banglaName', label: 'Bangla name' },
      { key: 'dateOfBirth', label: 'Date of birth', kind: 'date', span: 1 },
      { key: 'gender', label: 'Gender', kind: 'gender', span: 1 },
      { key: 'placeOfBirth', label: 'Place of birth' },
      { key: 'maritalStatus', label: 'Marital status', kind: 'marital', span: 1 },
      { key: 'spouseName', label: 'Spouse name' },
      { key: 'bloodGroup', label: 'Blood group', kind: 'blood', span: 1 },
      { key: 'fatherName', label: 'Father name' },
      { key: 'motherName', label: 'Mother name' },
      { key: 'nationality', label: 'Nationality' },
    ],
  },
  {
    title: 'Contact',
    icon: Phone,
    fields: [
      { key: 'phone', label: 'Mobile number' },
      { key: 'email', label: 'Email' },
      { key: 'subAgentId', label: 'Sub Agent', kind: 'subAgent' },
      { key: 'address', label: 'Address', span: 6 },
    ],
  },
  {
    title: 'Identity',
    icon: IdCard,
    fields: [
      { key: 'passport', label: 'Passport number' },
      { key: 'nid', label: 'NID number', span: 1 },
      { key: 'passportPlaceOfIssue', label: 'Place of issue', span: 1 },
      { key: 'passportIssuedOn', label: 'Date of issue', kind: 'date', span: 1 },
      { key: 'passportExpiry', label: 'Date of expiry', kind: 'date', span: 1 },
    ],
  },
]

function toProfileDraft(
  client: Client,
  customFieldDefs: ClientProfileField[],
): ProfileDraft {
  return {
    name: client.name,
    banglaName: client.banglaName ?? '',
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
    subAgentId: client.subAgentId ?? '',
    customFields: emptyCustomFieldValues(
      customFieldDefs,
      client.customFields,
    ),
  }
}

function profileDraftsEqual(a: ProfileDraft, b: ProfileDraft): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

const IDENTITY_PROFILE_KEYS = new Set<keyof ProfileDraft>([
  'passport',
  'passportPlaceOfIssue',
  'passportIssuedOn',
  'passportExpiry',
  'nid',
])

function isIdentityProfileField(key: keyof ProfileDraft): boolean {
  return IDENTITY_PROFILE_KEYS.has(key)
}

const IDENTITY_READOUT: {
  key: keyof ProfileDraft
  label: string
  icon: LucideIcon
  date?: boolean
}[] = [
  { key: 'passport', label: 'Passport', icon: BookUser },
  { key: 'nid', label: 'NID', icon: IdCard },
  { key: 'passportPlaceOfIssue', label: 'Place of issue', icon: MapPin },
  { key: 'passportIssuedOn', label: 'Date of issue', icon: Calendar, date: true },
  { key: 'passportExpiry', label: 'Date of expiry', icon: Calendar, date: true },
]

function ProfileFieldControl({
  field,
  value,
  onChange,
  onBlur,
  error,
  required,
  readOnly,
  subAgentOptions,
}: {
  field: ProfileFieldDef
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  error?: string
  required?: boolean
  readOnly?: boolean
  subAgentOptions?: { value: string; label: string }[]
}) {
  if (field.kind === 'gender') {
    return (
      <Select
        label={field.label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        options={GENDER_OPTIONS}
        error={error}
        readOnly={readOnly}
      />
    )
  }
  if (field.kind === 'marital') {
    return (
      <Select
        label={field.label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        options={MARITAL_OPTIONS}
        error={error}
        readOnly={readOnly}
      />
    )
  }
  if (field.kind === 'blood') {
    return (
      <Select
        label={field.label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        options={BLOOD_GROUP_OPTIONS}
        error={error}
        readOnly={readOnly}
      />
    )
  }
  if (field.kind === 'subAgent') {
    return (
      <Select
        label={field.label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        options={subAgentOptions ?? [{ value: '', label: 'None' }]}
        error={error}
        readOnly={readOnly}
      />
    )
  }
  return (
    <Input
      label={field.label}
      required={required}
      type={
        field.kind === 'date'
          ? 'date'
          : field.key === 'email'
            ? 'email'
            : field.key === 'phone'
              ? 'tel'
              : 'text'
      }
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onBlur={onBlur}
      error={error}
      readOnly={readOnly}
    />
  )
}

function gapForProfileField(
  gaps: ClientInfoGap[],
  fieldKey: keyof ProfileDraft,
): ClientInfoGap | undefined {
  return gaps.find((gap) => PROFILE_GAP_FIELD[gap.id] === fieldKey)
}

function profileFieldError(
  key: keyof ProfileDraft,
  draft: ProfileDraft,
  duplicateName?: string,
): string | undefined {
  switch (key) {
    case 'name':
      return validateRequiredName(draft.name)
    case 'phone':
      return validateRequiredPhone(draft.phone, { duplicateName })
    case 'email':
      return validateOptionalEmail(draft.email)
    case 'banglaName':
      return validateOptionalPersonName(draft.banglaName, 'Bangla name')
    case 'fatherName':
      return validateOptionalPersonName(draft.fatherName, 'Father name')
    case 'motherName':
      return validateOptionalPersonName(draft.motherName, 'Mother name')
    case 'spouseName':
      return validateOptionalPersonName(draft.spouseName, 'Spouse name')
    case 'dateOfBirth':
      return validateOptionalDateOfBirth(draft.dateOfBirth)
    case 'placeOfBirth':
      return validateOptionalText(draft.placeOfBirth, 'Place of birth')
    case 'nationality':
      return validateOptionalText(draft.nationality, 'Nationality')
    case 'address':
      return validateOptionalText(draft.address, 'Address')
    case 'passport':
      return validateOptionalPassport(draft.passport)
    case 'passportPlaceOfIssue':
      return validateOptionalText(draft.passportPlaceOfIssue, 'Place of issue')
    case 'passportIssuedOn':
      return validatePassportDates(
        draft.passportIssuedOn,
        draft.passportExpiry,
        draft.passport,
      ).issuedOn
    case 'passportExpiry':
      return validatePassportDates(
        draft.passportIssuedOn,
        draft.passportExpiry,
        draft.passport,
      ).expiry
    case 'nid':
      return validateOptionalNid(draft.nid)
    default:
      return undefined
  }
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
  alertCount = 0,
}: {
  icon: LucideIcon
  children: ReactNode
  /** Red count when this section needs attention. */
  alertCount?: number
}) {
  const count = alertCount > 0 ? alertCount : 0
  return (
    <>
      <Icon size={15} strokeWidth={2.25} aria-hidden />
      {children}
      {count > 0 ? (
        <span className="pd-tabs__alert" aria-hidden title={`${count} needing attention`}>
          {count > 99 ? '99+' : count}
        </span>
      ) : null}
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
  /** In-app route; preferred over `href` for SPA navigation. */
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

export default function ClientDetailPage() {
  const { id = '', caseId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const serviceOutlet = useOutlet()
  useClients()
  const subAgents = useSubAgents()
  const customFieldDefs = useClientProfileFields()
  const client = getClientById(id)
  const clientCases = useCasesByClientId(id)
  const requests = useRequests()
  const activeTab = serviceOutlet ? 'services' : tabFromSearch(searchParams)
  const [newCaseOpen, setNewCaseOpen] = useState(false)
  const [draft, setDraft] = useState<ProfileDraft | null>(null)
  const [docsFlash, setDocsFlash] = useState(false)
  const { markAllTouched, showError, blur } = useTouchedFields<string>()
  const subAgentOptions = useMemo(
    () => [
      { value: '', label: 'None' },
      ...subAgents.map((subAgent) => ({
        value: subAgent.id,
        label: subAgent.name,
      })),
    ],
    [subAgents],
  )

  useEffect(() => {
    if (searchParams.get('newCase') === '1') {
      setNewCaseOpen(true)
    }
  }, [searchParams])

  useEffect(() => {
    const focus = searchParams.get('focus')
    if (focus !== 'passport' && focus !== 'docs') return

    // Identity edits happen in Documents (passport/NID + scans).
    setDocsFlash(true)
    const next = new URLSearchParams(searchParams)
    if (next.get('tab') !== 'documents') {
      next.set('tab', 'documents')
      setSearchParams(next, { replace: true })
      return
    }

    const frame = window.requestAnimationFrame(() => {
      flashAndReveal('client-documents')
    })

    const timer = window.setTimeout(() => {
      setDocsFlash(false)
      const cleaned = new URLSearchParams(searchParams)
      cleaned.delete('focus')
      cleaned.delete('case')
      setSearchParams(cleaned, { replace: true })
    }, 2800)

    return () => {
      window.cancelAnimationFrame(frame)
      window.clearTimeout(timer)
    }
  }, [searchParams, setSearchParams])

  useEffect(() => {
    if (!client) return
    // Pull identity that only exists on service files onto the client so
    // Profile and Documents never disagree.
    reconcileClientIdentityFromCases(client.id)
  }, [client?.id])

  useEffect(() => {
    if (!client) return
    setDraft(toProfileDraft(client, customFieldDefs))
  }, [client?.id, customFieldDefs])

  // Identity is owned by Documents — keep Profile fields mirrored from the client.
  useEffect(() => {
    if (!client) return
    setDraft((current) => {
      if (!current) return current
      return {
        ...current,
        passport: client.passport ?? '',
        passportExpiry: client.passportExpiry ?? '',
        passportIssuedOn: client.passportIssuedOn ?? '',
        passportPlaceOfIssue: client.passportPlaceOfIssue ?? '',
        nid: client.nid ?? '',
      }
    })
  }, [
    client?.passport,
    client?.passportExpiry,
    client?.passportIssuedOn,
    client?.passportPlaceOfIssue,
    client?.nid,
  ])

  const savedDraft = useMemo(
    () => (client ? toProfileDraft(client, customFieldDefs) : null),
    [client, customFieldDefs],
  )

  useEffect(() => {
    if (caseId) return
    if (tabFromSearch(searchParams) !== 'services') return
    const open = clientCases[0]
    if (open) navigate(workDetailPath(open), { replace: true })
  }, [caseId, clientCases, navigate, searchParams])

  if (!client || !savedDraft) {
    return <Navigate to="/clients" replace />
  }

  const profileDraft = draft ?? savedDraft
  const isDirty = !profileDraftsEqual(profileDraft, savedDraft)

  const subAgent = profileDraft.subAgentId
    ? getSubAgentById(profileDraft.subAgentId)
    : undefined

  const selectTab = (tab: string) => {
    if (tab === 'services') {
      const open =
        clientCases.find((item) => item.id === caseId) ?? clientCases[0]
      if (open) {
        navigate(workDetailPath(open))
        return
      }
    }
    if (serviceOutlet) {
      navigate(clientPath(id, tab))
      return
    }
    const next = new URLSearchParams(searchParams)
    if (tab === 'overview') next.delete('tab')
    else next.set('tab', tab)
    if (tab !== 'payments') next.delete('record')
    setSearchParams(next, { replace: true })
  }

  const clearRecordIntent = () => {
    if (!searchParams.get('record')) return
    const next = new URLSearchParams(searchParams)
    next.delete('record')
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

  const duplicatePhoneOwner = (() => {
    const phone = normalizePhone(profileDraft.phone)
    if (!phone) return undefined
    return getClientByPhone(phone, client.id)?.name
  })()

  const profileFieldKeys = PROFILE_GROUPS.flatMap((group) =>
    group.fields
      .map((field) => field.key)
      .filter((key) => !isIdentityProfileField(key)),
  )
  const customFieldKeys = customFieldDefs.map((field) => `custom:${field.id}`)

  const saveProfile = () => {
    markAllTouched([...profileFieldKeys, ...customFieldKeys])
    const hasProfileError = profileFieldKeys.some((key) =>
      profileFieldError(key, profileDraft, duplicatePhoneOwner),
    )
    const hasCustomError = customFieldDefs.some(
      (field) =>
        validateCustomFieldValue(
          field,
          profileDraft.customFields[field.id] ?? '',
        ) != null,
    )
    if (hasProfileError || hasCustomError) return
    const phone = normalizePhone(profileDraft.phone)
    // Identity (passport/NID) is owned by Documents — do not overwrite from Profile.
    const updated = updateClient(client.id, {
      name: profileDraft.name.trim(),
      banglaName: profileDraft.banglaName.trim() || undefined,
      phone,
      email: profileDraft.email.trim() || undefined,
      address: profileDraft.address.trim() || undefined,
      fatherName: profileDraft.fatherName.trim() || undefined,
      motherName: profileDraft.motherName.trim() || undefined,
      dateOfBirth: profileDraft.dateOfBirth.trim() || undefined,
      gender: profileDraft.gender,
      maritalStatus: parseMaritalStatus(profileDraft.maritalStatus),
      nationality: profileDraft.nationality.trim() || undefined,
      placeOfBirth: profileDraft.placeOfBirth.trim() || undefined,
      spouseName: profileDraft.spouseName.trim() || undefined,
      bloodGroup: profileDraft.bloodGroup.trim() || undefined,
      subAgentId: profileDraft.subAgentId.trim() || undefined,
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
    })
    if (updated) setDraft(toProfileDraft(updated, customFieldDefs))
  }

  const displayName = profileDraft.name || client.name
  const displayStatus = deriveClientServiceStatus(clientCases)
  const displayPhone = profileDraft.phone
  const displayEmail = profileDraft.email
  const displayPassport = profileDraft.passport
  const displayNid = profileDraft.nid
  const displayWhatsapp = client.whatsapp?.trim() || displayPhone
  const openCases = clientCases.filter(
    (item) => item.status !== 'Completed' && item.status !== 'Cancelled',
  )
  const dueBalance = openCases.reduce((sum, item) => sum + item.balance, 0)

  const profileGaps = listClientInfoGaps({
    passport: profileDraft.passport,
    passportIssuedOn: profileDraft.passportIssuedOn,
    passportExpiry: profileDraft.passportExpiry,
    nid: profileDraft.nid,
    address: profileDraft.address,
    presentAddress: client.presentAddress,
    email: profileDraft.email,
  })
  const profileAlertCount = profileGaps.length

  const documentsAlertCount = countClientDocumentAlerts(client, clientCases)

  const paymentsAlertCount = openCases.filter((item) => item.balance > 0).length

  const servicesAttentionCases = openCases.filter((item) => {
    const boardItem = toServiceBoardItem(item)
    return (
      boardItem != null &&
      (boardItem.state === 'blocked' || boardItem.state === 'on-hold')
    )
  }).length
  const pendingStatusRequests = requests.filter(
    (request) =>
      request.clientId === client.id && request.reviewStatus === 'Pending',
  ).length
  const servicesAlertCount = servicesAttentionCases + pendingStatusRequests

  return (
    <div className="pd-page pd-client-detail" aria-label={client.name}>
      <div className="pd-client-detail__layout">
        <aside className="pd-client-detail__card" aria-label="Client profile">
          <div className="pd-client-detail__card-identity">
            <Avatar
              name={displayName}
              src={client.avatarUrl}
              size="xl"
              kind="client"
            />
            <div className="pd-client-detail__title-row">
              <h1 className="pd-client-detail__name">
                <ContactChip value={displayName} label="client name" />
              </h1>
              {profileDraft.banglaName ? (
                <p className="pd-client-detail__card-subtitle">
                  <ContactChip
                    value={profileDraft.banglaName}
                    label="Bangla name"
                  />
                </p>
              ) : null}
            </div>
          </div>

          <div className="pd-client-detail__card-actions">
            <Button size="sm" onClick={openNewCase}>
              <Folder size={14} strokeWidth={2.25} aria-hidden />
              Add service
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
                href={whatsappHref(displayWhatsapp)}
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
                onClick={() => selectTab('messages')}
                aria-label="Open messages"
                title="Messages"
              >
                <MessageSquare size={14} strokeWidth={2.25} aria-hidden />
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="pd-btn--icon"
                onClick={() => selectTab('email')}
                aria-label="Open email"
                title="Email"
              >
                <Mail size={14} strokeWidth={2.25} aria-hidden />
              </Button>
            </div>
          </div>

          <dl className="pd-client-detail__card-fields">
            <div className="pd-client-detail__card-field">
              <dt>Status</dt>
              <dd>
                {displayStatus ? (
                  <Badge variant={caseStatusBadgeVariant(displayStatus)}>
                    {displayStatus}
                  </Badge>
                ) : (
                  <span className="pd-client-detail__empty">—</span>
                )}
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
              <dt>NID</dt>
              <dd>
                {displayNid ? (
                  <ContactChip value={displayNid} label="NID number" />
                ) : (
                  <span className="pd-client-detail__empty">—</span>
                )}
              </dd>
            </div>
            <div className="pd-client-detail__card-field">
              <dt>Passport</dt>
              <dd>
                {displayPassport ? (
                  <ContactChip
                    value={displayPassport}
                    label="passport number"
                  />
                ) : (
                  <span className="pd-client-detail__empty">—</span>
                )}
              </dd>
            </div>
            <div className="pd-client-detail__card-field">
              <dt>Gender</dt>
              <dd>{profileDraft.gender}</dd>
            </div>
            <div className="pd-client-detail__card-field">
              <dt>Address</dt>
              <dd>
                {profileDraft.address || client.address ? (
                  <ContactChip
                    value={profileDraft.address || client.address || ''}
                    label="address"
                  />
                ) : (
                  <span className="pd-client-detail__empty">—</span>
                )}
              </dd>
            </div>
            <div className="pd-client-detail__card-field">
              <dt>Sub agent</dt>
              <dd>
                {subAgent ? (
                  <ContactChip
                    to={`/sub-agents/${subAgent.id}`}
                    value={subAgent.name}
                    label="sub agent"
                  />
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
              onClick={() => selectTab('services')}
            >
              <span className="pd-client-detail__card-snap-label">Services</span>
              <span className="pd-client-detail__card-snap-value">
                {openCases.length}
              </span>
            </button>
            <button
              type="button"
              className="pd-client-detail__card-snap"
              onClick={() => selectTab('payments')}
            >
              <span className="pd-client-detail__card-snap-label">
                Due balance
              </span>
              <span
                className={[
                  'pd-client-detail__card-snap-value',
                  dueBalance > 0 ? 'is-due' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {formatBalance(dueBalance)}
              </span>
            </button>
          </div>

          <p className="pd-client-detail__card-footer">
            <Calendar size={12} strokeWidth={2.25} aria-hidden />
            Member since {formatDate(client.createdAt)}
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
                        <SectionTitle icon={Contact}>Profile Information</SectionTitle>
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
                              displayEmail
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
                            {subAgent ? (
                              <Link
                                to={`/sub-agents/${subAgent.id}`}
                                className="pd-client-detail__link"
                              >
                                {subAgent.name}
                              </Link>
                            ) : (
                              <span className="pd-client-detail__empty">—</span>
                            )}
                          </dd>
                        </div>
                      </dl>
                    </section>

                    <Accordion
                      className="pd-accordion--cards pd-client-detail__services-accordion"
                      defaultOpenIds={['services']}
                      items={[
                        {
                          id: 'services',
                          title: (
                            <span className="pd-client-detail__services-accordion-title">
                              <span
                                className="pd-client-detail__section-icon"
                                aria-hidden
                              >
                                <Folder size={15} strokeWidth={2.25} />
                              </span>
                              Services
                            </span>
                          ),
                          meta:
                            clientCases.length > 0
                              ? String(clientCases.length)
                              : undefined,
                          content: (
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
                          ),
                        },
                      ]}
                    />
                  </div>
                ),
              },
              {
                id: 'profile',
                label: (
                  <TabLabel icon={Contact} alertCount={profileAlertCount}>
                    Profile
                  </TabLabel>
                ),
                content: (
                  <div className="pd-client-detail__profile">
                    <div className="pd-client-profile">
                      {PROFILE_GROUPS.map((group) => (
                        <div
                          key={group.title}
                          id={
                            group.title === 'Identity'
                              ? 'client-profile-identity'
                              : undefined
                          }
                          className={[
                            'pd-client-detail__section',
                            'pd-client-detail__section--compact',
                            'pd-client-profile__group',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                        >
                          <div className="pd-client-detail__section-head">
                            <SectionTitle icon={group.icon}>
                              {group.title}
                            </SectionTitle>
                            {group.title === 'Identity' ? (
                              <Link
                                to={`/clients/${client.id}?tab=documents&focus=passport`}
                                className="pd-btn pd-btn--secondary pd-btn--sm"
                              >
                                <FileText size={14} strokeWidth={2.25} aria-hidden />
                                Edit in Documents
                              </Link>
                            ) : null}
                          </div>
                          {group.title === 'Identity' ? (
                            <dl className="pd-client-detail__fields">
                              {IDENTITY_READOUT.map((row) => {
                                const raw = String(
                                  profileDraft[row.key] ?? '',
                                ).trim()
                                const gap = gapForProfileField(
                                  profileGaps,
                                  row.key,
                                )
                                const display = raw
                                  ? row.date
                                    ? formatDate(raw)
                                    : raw
                                  : null
                                return (
                                  <div
                                    key={row.key}
                                    className={[
                                      'pd-client-detail__field',
                                      gap ? 'is-attention' : '',
                                      gap?.blocksProgress ? 'is-blocking' : '',
                                    ]
                                      .filter(Boolean)
                                      .join(' ')}
                                  >
                                    <FieldLabel icon={row.icon}>
                                      {row.label}
                                    </FieldLabel>
                                    <dd>
                                      {display ? (
                                        display
                                      ) : (
                                        <span className="pd-client-detail__empty">
                                          —
                                        </span>
                                      )}
                                    </dd>
                                  </div>
                                )
                              })}
                            </dl>
                          ) : (
                          <div className="pd-client-profile__grid">
                            {group.fields.map((field) => {
                              const gap = gapForProfileField(
                                profileGaps,
                                field.key,
                              )
                              return (
                                <div
                                  key={field.key}
                                  className={[
                                    'pd-client-profile__field',
                                    profileFieldLayoutClass(field),
                                    String(profileDraft[field.key] ?? '') !==
                                      String(savedDraft[field.key] ?? '')
                                      ? 'is-dirty'
                                      : '',
                                    gap ? 'is-attention' : '',
                                    gap?.blocksProgress ? 'is-blocking' : '',
                                  ]
                                    .filter(Boolean)
                                    .join(' ')}
                                >
                                  <ProfileFieldControl
                                    field={field}
                                    value={String(profileDraft[field.key] ?? '')}
                                    required={
                                      field.key === 'name' ||
                                      field.key === 'phone'
                                    }
                                    subAgentOptions={
                                      field.kind === 'subAgent'
                                        ? subAgentOptions
                                        : undefined
                                    }
                                    error={
                                      showError(field.key)
                                        ? profileFieldError(
                                          field.key,
                                          profileDraft,
                                          duplicatePhoneOwner,
                                        )
                                        : undefined
                                    }
                                    onBlur={blur(field.key)}
                                    onChange={(value) => {
                                      setDraft((current) => ({
                                        ...(current ?? savedDraft),
                                        [field.key]:
                                          field.kind === 'gender'
                                            ? (value as ClientGender)
                                            : value,
                                      }))
                                    }}
                                  />
                                </div>
                              )
                            })}
                          </div>
                          )}
                        </div>
                      ))}
                      {customFieldDefs.length ? (
                        <div className="pd-client-detail__section pd-client-detail__section--compact pd-client-profile__group">
                          <div className="pd-client-detail__section-head">
                            <SectionTitle icon={FileText}>
                              Additional information
                            </SectionTitle>
                          </div>
                          <div className="pd-client-profile__grid">
                            {customFieldDefs.map((field) => {
                              const key = `custom:${field.id}`
                              return (
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
                                    error={
                                      showError(key)
                                        ? validateCustomFieldValue(
                                          field,
                                          profileDraft.customFields[field.id] ??
                                          '',
                                        )
                                        : undefined
                                    }
                                    onBlur={blur(key)}
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
                              )
                            })}
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
                label: (
                  <TabLabel icon={Folder} alertCount={servicesAlertCount}>
                    Services
                  </TabLabel>
                ),
                content: (
                  <ClientServicesWorkspace
                    cases={clientCases}
                    clientName={client.name}
                    selectedId={caseId}
                    onAddService={openNewCase}
                  >
                    {serviceOutlet}
                  </ClientServicesWorkspace>
                ),
              },
              {
                id: 'documents',
                label: (
                  <TabLabel icon={FileText} alertCount={documentsAlertCount}>
                    Documents
                  </TabLabel>
                ),
                content: (
                  <ClientDocumentsPanel
                    client={client}
                    cases={clientCases}
                    onAddService={openNewCase}
                    focusCaseId={
                      searchParams.get('focus') === 'docs'
                        ? searchParams.get('case')
                        : null
                    }
                    focusIdentityKind={
                      searchParams.get('focus') === 'passport'
                        ? 'passport'
                        : null
                    }
                    highlight={docsFlash}
                  />
                ),
              },
              {
                id: 'payments',
                label: (
                  <TabLabel icon={Wallet} alertCount={paymentsAlertCount}>
                    Payments
                  </TabLabel>
                ),
                content: (
                  <PaymentsList
                    clientId={client.id}
                    cases={clientCases}
                    startRecording={searchParams.get('record') === '1'}
                    onRecordingChange={(recording) => {
                      if (!recording) clearRecordIntent()
                    }}
                  />
                ),
              },
              {
                id: 'messages',
                label: <TabLabel icon={MessageSquare}>Messages</TabLabel>,
                content: <ClientMessagesPanel client={client} channel="sms" />,
              },
              {
                id: 'email',
                label: <TabLabel icon={Mail}>Email</TabLabel>,
                content: <ClientMessagesPanel client={client} channel="email" />,
              },
            ]}
          />
        </div>
      </div>

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
