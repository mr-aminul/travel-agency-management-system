import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Badge } from '@/components/shadcn/badge'
import { Button } from '@/components/shadcn/button'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/shadcn/accordion'
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/shadcn/card'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/shadcn/sheet'
import { Input, Select } from '@/components/clients/clientShadcnFields'
import { cn } from '@/lib/utils'
import { ProfilePhotoField } from '@/components/ProfilePhotoField'
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
import { ClientActionItems } from '@/components/clients/ClientActionItems'
import { ClientCustomFieldControl } from '@/components/clients/ClientCustomFieldControl'
import { ClientDocumentsPanel } from '@/components/clients/ClientDocumentsPanel'
import { ClientMessagesPanel } from '@/components/clients/ClientMessagesPanel'
import { PaymentsList } from '@/components/payments/PaymentsList'
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
import { notifyIfPendingApproval } from '@/lib/notifyPendingApproval'
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
import {
  elevatedPageClass,
  floatingSheetClass,
} from '@/components/clients/shadcnChrome'

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
  { value: '', label: '-' },
  ...MARITAL_VALUES.map((value) => ({ value, label: value })),
]

function parseMaritalStatus(value: string): ClientMaritalStatus | undefined {
  return MARITAL_VALUES.find((entry) => entry === value)
}

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const

const BLOOD_GROUP_OPTIONS = [
  { value: '', label: '-' },
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
  if (field.wide) return 'col-span-4'
  if (field.span === 1) return 'col-span-1'
  if (field.span === 3) return 'col-span-3'
  if (field.span === 6) return 'col-span-6'
  return 'col-span-2'
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
      { key: 'name', label: 'Full Name' },
      { key: 'banglaName', label: 'Bangla Name' },
      { key: 'dateOfBirth', label: 'Date of Birth', kind: 'date', span: 1 },
      { key: 'gender', label: 'Gender', kind: 'gender', span: 1 },
      { key: 'placeOfBirth', label: 'Place of Birth' },
      { key: 'maritalStatus', label: 'Marital Status', kind: 'marital', span: 1 },
      { key: 'spouseName', label: 'Spouse Name' },
      { key: 'bloodGroup', label: 'Blood Group', kind: 'blood', span: 1 },
      { key: 'fatherName', label: 'Father Name' },
      { key: 'motherName', label: 'Mother Name' },
      { key: 'nationality', label: 'Nationality' },
    ],
  },
  {
    title: 'Contact',
    icon: Phone,
    fields: [
      { key: 'phone', label: 'Mobile Number' },
      { key: 'email', label: 'Email' },
      { key: 'subAgentId', label: 'Sub Agent', kind: 'subAgent' },
      { key: 'address', label: 'Address', span: 6 },
    ],
  },
  {
    title: 'Identity',
    icon: IdCard,
    fields: [
      { key: 'passport', label: 'Passport Number' },
      { key: 'nid', label: 'NID Number', span: 1 },
      { key: 'passportPlaceOfIssue', label: 'Place of Issue', span: 1 },
      { key: 'passportIssuedOn', label: 'Date of Issue', kind: 'date', span: 1 },
      { key: 'passportExpiry', label: 'Date of Expiry', kind: 'date', span: 1 },
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
  { key: 'passportPlaceOfIssue', label: 'Place of Issue', icon: MapPin },
  { key: 'passportIssuedOn', label: 'Date of Issue', icon: Calendar, date: true },
  { key: 'passportExpiry', label: 'Date of Expiry', icon: Calendar, date: true },
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
      return validateOptionalPersonName(draft.banglaName, 'Bangla Name')
    case 'fatherName':
      return validateOptionalPersonName(draft.fatherName, 'Father Name')
    case 'motherName':
      return validateOptionalPersonName(draft.motherName, 'Mother Name')
    case 'spouseName':
      return validateOptionalPersonName(draft.spouseName, 'Spouse Name')
    case 'dateOfBirth':
      return validateOptionalDateOfBirth(draft.dateOfBirth)
    case 'placeOfBirth':
      return validateOptionalText(draft.placeOfBirth, 'Place of Birth')
    case 'nationality':
      return validateOptionalText(draft.nationality, 'Nationality')
    case 'address':
      return validateOptionalText(draft.address, 'Address')
    case 'passport':
      return validateOptionalPassport(draft.passport)
    case 'passportPlaceOfIssue':
      return validateOptionalText(draft.passportPlaceOfIssue, 'Place of Issue')
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
    <dt className="mb-1.5 flex items-center gap-1.5 text-[0.6875rem] font-medium tracking-wide text-muted-foreground">
      <span
        className="inline-flex size-5 shrink-0 items-center justify-center rounded-[0.35rem] bg-muted text-muted-foreground"
        aria-hidden
      >
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
        <span
          className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[0.625rem] font-bold text-white"
          aria-hidden
          title={`${count} needing attention`}
        >
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
    <span className="inline-flex items-center gap-2">
      <span
        className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-[var(--color-theme-subtle)] text-[var(--color-theme-ink)]"
        aria-hidden
      >
        <Icon size={15} strokeWidth={2.25} />
      </span>
      {children}
    </span>
  )
}

function ContactChip({
  href,
  to,
  value,
  label,
  variant = 'identity',
}: {
  href?: string
  /** In-app route; preferred over `href` for SPA navigation. */
  to?: string
  value: string
  label: string
  variant?: 'identity' | 'cardField'
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

  const valueClass = cn(
    'break-words',
    variant === 'cardField' && 'block min-w-0 max-w-full pe-5',
    (to || href) && 'text-primary underline-offset-2 hover:underline',
  )

  const valueNode = to ? (
    <Link to={to} className={valueClass}>
      {value}
    </Link>
  ) : href ? (
    <a href={href} className={valueClass}>
      {value}
    </a>
  ) : (
    <span className={valueClass}>{value}</span>
  )

  return (
    <span
      className={cn(
        'group relative overflow-visible',
        variant === 'cardField'
          ? 'flex w-full min-w-0 items-start'
          : 'inline-flex max-w-full items-center justify-center',
      )}
    >
      {valueNode}
      <button
        type="button"
        className={cn(
          'absolute size-5 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100',
          variant === 'cardField'
            ? 'end-0 top-0'
            : 'start-full top-1/2 -translate-y-1/2',
        )}
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

  // Identity is owned by Documents. Keep Profile fields mirrored from the client.
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
    try {
      const created = createCase(input)
      closeNewCase()
      navigate(workDetailPath(created))
    } catch (error) {
      if (notifyIfPendingApproval(error)) {
        closeNewCase()
        return
      }
      throw error
    }
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
    // Identity (passport/NID) is owned by Documents. Do not overwrite from Profile.
    try {
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
    } catch (error) {
      notifyIfPendingApproval(error)
    }
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
    <div className={cn(elevatedPageClass, 'gap-5')} data-elevated-canvas aria-label={client.name}>
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(16rem,20rem)_minmax(0,1fr)]">
        <aside
          className="flex min-w-0 flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm lg:sticky lg:top-0 lg:z-[1] lg:max-h-[calc(100dvh-8.5rem)] lg:overflow-y-auto"
          aria-label="Client profile"
        >
          <div className="flex shrink-0 flex-col items-center gap-2 text-center">
            <ProfilePhotoField
              name={displayName}
              fallbackName="Client"
              kind="client"
              value={client.avatarUrl}
              onChange={(avatarUrl) => {
                try {
                  updateClient(client.id, { avatarUrl })
                } catch (error) {
                  notifyIfPendingApproval(error)
                }
              }}
            />
            <div className="flex flex-col items-center justify-center gap-1">
              <h1 className="m-0 text-[1.0625rem] font-semibold leading-tight tracking-tight">
                <ContactChip value={displayName} label="Client Name" />
              </h1>
              {profileDraft.banglaName ? (
                <p className="m-0 text-xs font-medium leading-snug text-muted-foreground">
                  <ContactChip
                    value={profileDraft.banglaName}
                    label="Bangla Name"
                  />
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex w-full shrink-0 flex-col gap-1.5">
            <Button className="h-9 w-full rounded-lg" onClick={openNewCase}>
              <Folder data-icon="inline-start" />
              Add Service
            </Button>
            <div className="grid grid-cols-4 gap-1.5">
              <a
                className="inline-flex size-9 items-center justify-center rounded-lg border border-border bg-card text-foreground transition-colors hover:bg-[color-mix(in_srgb,var(--color-text)_6%,transparent)]"
                href={`tel:${displayPhone}`}
                aria-label={`Call ${displayName}`}
                title="Call"
              >
                <Phone size={14} strokeWidth={2.25} aria-hidden />
              </a>
              <a
                className="inline-flex size-9 items-center justify-center rounded-lg border border-border bg-card text-foreground transition-colors hover:bg-[color-mix(in_srgb,var(--color-text)_6%,transparent)]"
                href={whatsappHref(displayWhatsapp)}
                target="_blank"
                rel="noreferrer"
                aria-label={`WhatsApp ${displayName}`}
                title="WhatsApp"
              >
                <WhatsAppIcon size={14} />
              </a>
              <Button
                variant="outline"
                size="icon"
                onClick={() => selectTab('messages')}
                aria-label="Open messages"
                title="Messages"
              >
                <MessageSquare size={14} strokeWidth={2.25} aria-hidden />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => selectTab('email')}
                aria-label="Open email"
                title="Email"
              >
                <Mail size={14} strokeWidth={2.25} aria-hidden />
              </Button>
            </div>
          </div>

          <dl className="m-0 flex shrink-0 flex-col overflow-hidden rounded-[0.625rem] border border-border bg-background">
            <div className="grid min-w-0 grid-cols-[4.5rem_minmax(0,1fr)] items-start gap-2 border-b border-border px-2.5 py-1.5 last:border-b-0">
              <dt className="m-0 pt-0.5 text-[0.625rem] font-medium tracking-wide text-muted-foreground leading-snug">
                Status
              </dt>
              <dd className="m-0 flex min-w-0 flex-col gap-0.5 text-[0.8125rem] font-normal leading-snug text-foreground break-words">
                {displayStatus ? (
                  <Badge variant={displayStatus === 'Completed' ? 'default' : 'secondary'}>
                    {displayStatus}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </dd>
            </div>
            <div className="grid min-w-0 grid-cols-[4.5rem_minmax(0,1fr)] items-start gap-2 border-b border-border px-2.5 py-1.5 last:border-b-0">
              <dt className="m-0 pt-0.5 text-[0.625rem] font-medium tracking-wide text-muted-foreground leading-snug">
                Phone
              </dt>
              <dd className="m-0 flex min-w-0 flex-col gap-0.5 text-[0.8125rem] font-normal leading-snug text-foreground break-words">
                <ContactChip
                  variant="cardField"
                  value={displayPhone}
                  label="Phone Number"
                />
              </dd>
            </div>
            <div className="grid min-w-0 grid-cols-[4.5rem_minmax(0,1fr)] items-start gap-2 border-b border-border px-2.5 py-1.5 last:border-b-0">
              <dt className="m-0 pt-0.5 text-[0.625rem] font-medium tracking-wide text-muted-foreground leading-snug">
                Email
              </dt>
              <dd className="m-0 flex min-w-0 flex-col gap-0.5 text-[0.8125rem] font-normal leading-snug text-foreground break-words">
                {displayEmail ? (
                  <ContactChip
                    variant="cardField"
                    value={displayEmail}
                    label="Email Address"
                  />
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </dd>
            </div>
            <div className="grid min-w-0 grid-cols-[4.5rem_minmax(0,1fr)] items-start gap-2 border-b border-border px-2.5 py-1.5 last:border-b-0">
              <dt className="m-0 pt-0.5 text-[0.625rem] font-medium tracking-wide text-muted-foreground leading-snug">
                NID
              </dt>
              <dd className="m-0 flex min-w-0 flex-col gap-0.5 text-[0.8125rem] font-normal leading-snug text-foreground break-words">
                {displayNid ? (
                  <ContactChip variant="cardField" value={displayNid} label="NID Number" />
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </dd>
            </div>
            <div className="grid min-w-0 grid-cols-[4.5rem_minmax(0,1fr)] items-start gap-2 border-b border-border px-2.5 py-1.5 last:border-b-0">
              <dt className="m-0 pt-0.5 text-[0.625rem] font-medium tracking-wide text-muted-foreground leading-snug">
                Passport
              </dt>
              <dd className="m-0 flex min-w-0 flex-col gap-0.5 text-[0.8125rem] font-normal leading-snug text-foreground break-words">
                {displayPassport ? (
                  <ContactChip
                    variant="cardField"
                    value={displayPassport}
                    label="Passport Number"
                  />
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </dd>
            </div>
            <div className="grid min-w-0 grid-cols-[4.5rem_minmax(0,1fr)] items-start gap-2 border-b border-border px-2.5 py-1.5 last:border-b-0">
              <dt className="m-0 pt-0.5 text-[0.625rem] font-medium tracking-wide text-muted-foreground leading-snug">
                Gender
              </dt>
              <dd className="m-0 flex min-w-0 flex-col gap-0.5 text-[0.8125rem] font-normal leading-snug text-foreground break-words">
                {profileDraft.gender}
              </dd>
            </div>
            <div className="grid min-w-0 grid-cols-[4.5rem_minmax(0,1fr)] items-start gap-2 border-b border-border px-2.5 py-1.5 last:border-b-0">
              <dt className="m-0 pt-0.5 text-[0.625rem] font-medium tracking-wide text-muted-foreground leading-snug">
                Address
              </dt>
              <dd className="m-0 flex min-w-0 flex-col gap-0.5 text-[0.8125rem] font-normal leading-snug text-foreground break-words">
                {profileDraft.address || client.address ? (
                  <ContactChip
                    variant="cardField"
                    value={profileDraft.address || client.address || ''}
                    label="Address"
                  />
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </dd>
            </div>
            <div className="grid min-w-0 grid-cols-[4.5rem_minmax(0,1fr)] items-start gap-2 border-b border-border px-2.5 py-1.5 last:border-b-0">
              <dt className="m-0 pt-0.5 text-[0.625rem] font-medium tracking-wide text-muted-foreground leading-snug">
                Sub Agent
              </dt>
              <dd className="m-0 flex min-w-0 flex-col gap-0.5 text-[0.8125rem] font-normal leading-snug text-foreground break-words">
                {subAgent ? (
                  <ContactChip
                    variant="cardField"
                    to={`/sub-agents/${subAgent.id}`}
                    value={subAgent.name}
                    label="Sub Agent"
                  />
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </dd>
            </div>
          </dl>

          <div className="grid shrink-0 grid-cols-2 gap-1.5" aria-label="Snapshot">
            <button
              type="button"
              className="m-0 flex min-w-0 cursor-pointer flex-col gap-0.5 rounded-[0.625rem] border border-border bg-background px-2.5 py-1.5 text-start font-inherit text-inherit transition-colors hover:border-[color-mix(in_srgb,var(--color-theme)_35%,var(--color-border))] hover:bg-[color-mix(in_srgb,var(--color-theme)_6%,var(--color-surface))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-theme)]"
              onClick={() => selectTab('services')}
            >
              <span className="text-[0.625rem] font-semibold tracking-wide text-muted-foreground">
                Services
              </span>
              <span className="text-sm font-medium leading-tight text-foreground">
                {openCases.length}
              </span>
            </button>
            <button
              type="button"
              className="m-0 flex min-w-0 cursor-pointer flex-col gap-0.5 rounded-[0.625rem] border border-border bg-background px-2.5 py-1.5 text-start font-inherit text-inherit transition-colors hover:border-[color-mix(in_srgb,var(--color-theme)_35%,var(--color-border))] hover:bg-[color-mix(in_srgb,var(--color-theme)_6%,var(--color-surface))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-theme)]"
              onClick={() => selectTab('payments')}
            >
              <span className="text-[0.625rem] font-semibold tracking-wide text-muted-foreground">
                Due Balance
              </span>
              <span
                className={cn(
                  'text-sm font-medium leading-tight text-foreground',
                  dueBalance > 0 && 'text-destructive',
                )}
              >
                {formatBalance(dueBalance)}
              </span>
            </button>
          </div>

          <p className="m-0 inline-flex items-center justify-center gap-1.5 text-[0.6875rem] font-medium text-muted-foreground">
            <Calendar size={12} strokeWidth={2.25} aria-hidden />
            Member Since {formatDate(client.createdAt)}
          </p>
        </aside>

        <div className="flex min-w-0 flex-col gap-3">
          <DetailTabs
            value={activeTab}
            onValueChange={selectTab}
            items={[
              {
                id: 'overview',
                label: <TabLabel icon={LayoutDashboard}>Overview</TabLabel>,
                content: (
                  <div className="flex flex-col gap-4">
                    <ClientActionItems clientId={client.id} />

                    <Card size="sm" className="shadow-sm">
                      <CardHeader>
                        <CardTitle>
                          <SectionTitle icon={Contact}>Profile Information</SectionTitle>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <dl className="m-0 grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div className="min-w-0">
                            <FieldLabel icon={Phone}>Phone</FieldLabel>
                            <dd className="m-0 ps-[1.65rem] text-[0.9375rem] leading-snug">
                              {displayPhone}
                            </dd>
                          </div>
                          <div className="min-w-0">
                            <FieldLabel icon={Mail}>Email</FieldLabel>
                            <dd className="m-0 ps-[1.65rem] text-[0.9375rem] leading-snug">
                              {displayEmail ? (
                                displayEmail
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </dd>
                          </div>
                          <div className="min-w-0">
                            <FieldLabel icon={MapPin}>Address</FieldLabel>
                            <dd className="m-0 ps-[1.65rem] text-[0.9375rem] leading-snug">
                              {client.address || (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </dd>
                          </div>
                          <div className="min-w-0">
                            <FieldLabel icon={IdCard}>NID</FieldLabel>
                            <dd className="m-0 ps-[1.65rem] text-[0.9375rem] leading-snug">
                              {client.nid || (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </dd>
                          </div>
                          <div className="min-w-0">
                            <FieldLabel icon={BookUser}>Passport</FieldLabel>
                            <dd className="m-0 ps-[1.65rem] text-[0.9375rem] leading-snug">
                              {client.passport || (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </dd>
                          </div>
                          <div className="min-w-0">
                            <FieldLabel icon={Calendar}>Member Since</FieldLabel>
                            <dd className="m-0 ps-[1.65rem] text-[0.9375rem] leading-snug">
                              {formatDate(client.createdAt)}
                            </dd>
                          </div>
                          <div className="min-w-0">
                            <FieldLabel icon={UserRound}>Sub Agent</FieldLabel>
                            <dd className="m-0 ps-[1.65rem] text-[0.9375rem] leading-snug">
                              {subAgent ? (
                                <Link
                                  to={`/sub-agents/${subAgent.id}`}
                                  className="text-primary underline-offset-2 hover:underline"
                                >
                                  {subAgent.name}
                                </Link>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </dd>
                          </div>
                        </dl>
                      </CardContent>
                    </Card>

                    <Accordion
                      type="single"
                      collapsible
                      defaultValue="services"
                      className="rounded-xl border border-border bg-card px-4 shadow-sm"
                    >
                      <AccordionItem value="services" className="border-0">
                        <AccordionTrigger className="hover:no-underline">
                          <span className="inline-flex items-center gap-2">
                            <span
                              className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-[var(--color-theme-subtle)] text-[var(--color-theme-ink)]"
                              aria-hidden
                            >
                              <Folder size={15} strokeWidth={2.25} />
                            </span>
                            Services
                            {clientCases.length > 0 ? (
                              <span className="text-muted-foreground">{clientCases.length}</span>
                            ) : null}
                          </span>
                        </AccordionTrigger>
                        <AccordionContent>
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
                            allowDelete
                            emptyTitle="No Services Yet"
                            emptyAction={
                              <Button className="h-9 rounded-lg" onClick={openNewCase}>
                                <Folder data-icon="inline-start" />
                                Add Service
                              </Button>
                            }
                          />
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
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
                  <div className="flex min-w-0 flex-col gap-4">
                    <div className="flex flex-col gap-3">
                      {PROFILE_GROUPS.map((group) => (
                        <Card
                          key={group.title}
                          id={
                            group.title === 'Identity'
                              ? 'client-profile-identity'
                              : undefined
                          }
                          size="sm"
                          className="min-w-0 shadow-sm"
                        >
                          <CardHeader>
                            <CardTitle>
                              <SectionTitle icon={group.icon}>
                                {group.title}
                              </SectionTitle>
                            </CardTitle>
                            {group.title === 'Identity' ? (
                              <CardAction>
                                <Button variant="outline" size="sm" className="h-8" asChild>
                                  <Link to={`/clients/${client.id}?tab=documents&focus=passport`}>
                                    <FileText size={14} strokeWidth={2.25} aria-hidden />
                                    Edit In Documents
                                  </Link>
                                </Button>
                              </CardAction>
                            ) : null}
                          </CardHeader>
                          <CardContent>
                            {group.title === 'Identity' ? (
                              <dl className="m-0 grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                                      className={cn(
                                        'min-w-0',
                                        gap && '[&_dd]:text-destructive',
                                        gap?.blocksProgress &&
                                          '[&_dd]:font-semibold [&_dd]:text-destructive',
                                      )}
                                    >
                                      <FieldLabel icon={row.icon}>
                                        {row.label}
                                      </FieldLabel>
                                      <dd className="m-0 ps-[1.65rem] text-[0.9375rem] leading-snug">
                                        {display ? (
                                          display
                                        ) : (
                                          <span className="text-muted-foreground">-</span>
                                        )}
                                      </dd>
                                    </div>
                                  )
                                })}
                              </dl>
                            ) : (
                              <div className="m-0 grid grid-cols-6 gap-x-3 gap-y-[0.95rem]">
                                {group.fields.map((field) => {
                                  const gap = gapForProfileField(
                                    profileGaps,
                                    field.key,
                                  )
                                  return (
                                    <div
                                      key={field.key}
                                      className={cn(
                                        'min-w-0',
                                        profileFieldLayoutClass(field),
                                        String(profileDraft[field.key] ?? '') !==
                                          String(savedDraft[field.key] ?? '') &&
                                          '[&_input]:border-[var(--color-theme-ink)] [&_button]:border-[var(--color-theme-ink)]',
                                        gap &&
                                          '[&_input]:border-[color-mix(in_srgb,var(--color-danger)_55%,var(--color-border))] [&_input]:bg-[color-mix(in_srgb,var(--color-danger)_5%,var(--color-surface))]',
                                        gap?.blocksProgress &&
                                          '[&_input]:border-[var(--color-danger)]',
                                      )}
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
                          </CardContent>
                        </Card>
                      ))}
                      {customFieldDefs.length ? (
                        <Card size="sm" className="min-w-0 shadow-sm">
                          <CardHeader>
                            <CardTitle>
                              <SectionTitle icon={FileText}>
                                Additional Information
                              </SectionTitle>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="m-0 grid grid-cols-6 gap-x-3 gap-y-[0.95rem]">
                              {customFieldDefs.map((field) => {
                                const key = `custom:${field.id}`
                                return (
                                  <div
                                    key={field.id}
                                    className={cn(
                                      'col-span-2 min-w-0',
                                      (profileDraft.customFields[field.id] ?? '') !==
                                        (savedDraft.customFields[field.id] ?? '') &&
                                        '[&_input]:border-[var(--color-theme-ink)] [&_button]:border-[var(--color-theme-ink)]',
                                    )}
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
                          </CardContent>
                        </Card>
                      ) : null}
                    </div>
                    {isDirty ? (
                      <div className="flex items-center justify-start gap-3 pt-0.5">
                        <Button variant="outline" className="h-9 rounded-lg" onClick={discardChanges}>
                          Discard Changes
                        </Button>
                        <Button className="h-9 rounded-lg" onClick={saveProfile}>
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

      <Sheet open={newCaseOpen} onOpenChange={(open) => { if (!open) closeNewCase() }}>
        <SheetContent className={floatingSheetClass}>
          <SheetHeader className="border-b border-border px-5 py-4 pr-12">
            <SheetTitle className="text-base font-semibold">Add Service</SheetTitle>
          </SheetHeader>
          <NewCaseForm
            onSubmit={handleCreateCase}
            onCancel={closeNewCase}
            defaultClientId={client.id}
            lockClient
            defaultService={primaryServiceType(client.services)}
            defaultCountry={client.preferredCountry}
          />
        </SheetContent>
      </Sheet>
    </div>
  )
}

function DetailTabs({
  value,
  onValueChange,
  items,
}: {
  value: string
  onValueChange: (value: string) => void
  items: { id: string; label: ReactNode; content: ReactNode }[]
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRefs = useRef(new Map<string, HTMLButtonElement>())
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null)

  const updateIndicator = useCallback(() => {
    const button = buttonRefs.current.get(value)
    if (!button) return
    setIndicator({ left: button.offsetLeft, width: button.offsetWidth })
  }, [value])

  useLayoutEffect(() => {
    updateIndicator()
  }, [updateIndicator, items.length])

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const observer = new ResizeObserver(() => updateIndicator())
    observer.observe(root)
    window.addEventListener('resize', updateIndicator)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', updateIndicator)
    }
  }, [updateIndicator])

  const active = items.find((item) => item.id === value) ?? items[0]

  return (
    <div className="flex flex-col gap-4">
      <div
        ref={rootRef}
        role="tablist"
        aria-label="Client sections"
        className="relative inline-flex h-9 max-w-full items-stretch self-start overflow-x-auto rounded-lg border border-input bg-card p-0.5"
      >
        {indicator ? (
          <span
            aria-hidden
            className="pointer-events-none absolute top-0.5 bottom-0.5 z-0 rounded-md bg-primary transition-[left,width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{ left: indicator.left, width: indicator.width } as CSSProperties}
          />
        ) : null}
        {items.map((item) => {
          const isActive = item.id === value
          return (
            <Button
              key={item.id}
              ref={(node) => {
                if (node) buttonRefs.current.set(item.id, node)
                else buttonRefs.current.delete(item.id)
              }}
              type="button"
              variant="ghost"
              role="tab"
              aria-selected={isActive}
              className={cn(
                'relative z-[1] h-full min-h-0 shrink-0 rounded-md px-3 text-sm font-medium shadow-none',
                isActive
                  ? 'text-primary-foreground hover:!bg-transparent hover:text-primary-foreground'
                  : 'text-muted-foreground hover:!bg-[color-mix(in_srgb,var(--color-text)_6%,transparent)] hover:text-foreground',
              )}
              onClick={() => onValueChange(item.id)}
            >
              {item.label}
            </Button>
          )
        })}
      </div>
      <div role="tabpanel">{active?.content}</div>
    </div>
  )
}
