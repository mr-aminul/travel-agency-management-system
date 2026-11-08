import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { Badge } from '@/components/shadcn/badge'
import { Button } from '@/components/shadcn/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/shadcn/sheet'
import { cn } from '@/lib/utils'
import type { ClientMessageChannel } from '@/types/clientMessage'
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
  Calendar,
  Check,
  Contact,
  Copy,
  FileText,
  Folder,
  LayoutDashboard,
  Mail,
  MessageSquare,
  Phone,
  Wallet,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon'
import { ClientServicesWorkspace } from '@/components/cases/ClientServicesWorkspace'
import { NewCaseForm } from '@/components/cases/NewCaseForm'
import { ClientActionItems } from '@/components/clients/ClientActionItems'
import { ClientDealStrip } from '@/components/clients/ClientDealStrip'
import { ClientIdentityExtras } from '@/components/clients/ClientIdentityExtras'
import { ClientOverviewAttention } from '@/components/clients/ClientOverviewAttention'
import { ClientDocumentsPanel } from '@/components/clients/ClientDocumentsPanel'
import { ClientMessagesPanel } from '@/components/clients/ClientMessagesPanel'
import { ClientProfileWorkspace } from '@/components/clients/ClientProfileWorkspace'
import { ClientRecentActivity } from '@/components/clients/ClientRecentActivity'
import {
  EDITABLE_PROFILE_KEYS,
  parseMaritalStatus,
  profileFieldError,
  sectionForGap,
  toClientProfileDraft,
  type ClientProfileDraft,
  type ClientProfileSectionId,
} from '@/components/clients/clientProfileDraft'
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
  type ClientInfoGapId,
} from '@/lib/clientMissingInfo'
import { toServiceBoardItem } from '@/lib/clientServiceBoard'
import { deriveClientServiceStatus } from '@/lib/clientServiceStatus'
import { useRequests } from '@/lib/requestsStore'
import { notifyIfPendingApproval } from '@/lib/notifyPendingApproval'
import { clientPath, workDetailPath } from '@/lib/workPaths'
import { useSubAgents } from '@/lib/subAgentsStore'
import {
  getClientById,
  getClientByPhone,
  normalizePhone,
  updateClient,
  useClients,
} from '@/lib/clientsStore'
import { useClientMessages } from '@/lib/clientMessagesStore'
import { usePaymentsByClientId } from '@/lib/paymentsStore'
import { compactCustomFieldValues } from '@/lib/clientCustomFields'
import { validateCustomFieldValue } from '@/lib/clientCustomFieldValidation'
import { useClientProfileFields } from '@/lib/clientProfileFieldsStore'
import { formatDisplayDate } from '@/lib/formatDate'
import { flashAndReveal } from '@/lib/scrollWithin'
import { useTouchedFields } from '@/lib/useTouchedFields'
import type { ServiceType, CreateCaseInput } from '@/types/case'
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

const MAIN_TABS = [
  'overview',
  'profile',
  'services',
  'documents',
  'payments',
  'messages',
] as const

const PROFILE_SECTIONS = new Set<ClientProfileSectionId>([
  'reach',
  'travel',
  'personal',
  'family',
  'work',
  'places',
  'extra',
])

function tabFromSearch(searchParams: URLSearchParams): string {
  const tab = searchParams.get('tab')
  if (tab === 'email') return 'messages'
  return tab && CLIENT_TABS.includes(tab as (typeof CLIENT_TABS)[number])
    ? tab
    : 'overview'
}

function messageChannelFromSearch(
  searchParams: URLSearchParams,
): ClientMessageChannel {
  return searchParams.get('channel') === 'email' ? 'email' : 'sms'
}

function profileSectionFromSearch(
  searchParams: URLSearchParams,
): ClientProfileSectionId | undefined {
  const section = searchParams.get('section')
  if (section && PROFILE_SECTIONS.has(section as ClientProfileSectionId)) {
    return section as ClientProfileSectionId
  }
  return undefined
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
  const clientPayments = usePaymentsByClientId(id)
  const smsMessages = useClientMessages(id, 'sms')
  const emailMessages = useClientMessages(id, 'email')
  const requests = useRequests()
  const activeTab = serviceOutlet ? 'services' : tabFromSearch(searchParams)
  const [newCaseOpen, setNewCaseOpen] = useState(false)
  const [draft, setDraft] = useState<ClientProfileDraft | null>(null)
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
    setDraft(toClientProfileDraft(client, customFieldDefs))
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
    () => (client ? toClientProfileDraft(client, customFieldDefs) : null),
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

  const selectTab = (tab: string) => {
    const resolved = tab === 'email' ? 'messages' : tab
    if (resolved === 'services') {
      const open =
        clientCases.find((item) => item.id === caseId) ?? clientCases[0]
      if (open) {
        navigate(workDetailPath(open))
        return
      }
    }
    if (serviceOutlet) {
      navigate(clientPath(id, resolved))
      return
    }
    const next = new URLSearchParams(searchParams)
    if (resolved === 'overview') next.delete('tab')
    else next.set('tab', resolved)
    if (resolved !== 'payments') next.delete('record')
    if (resolved !== 'messages') next.delete('channel')
    if (resolved !== 'profile') {
      next.delete('section')
      next.delete('field')
    }
    setSearchParams(next, { replace: true })
  }

  const openMessages = (channel: ClientMessageChannel) => {
    const params = new URLSearchParams()
    params.set('tab', 'messages')
    if (channel === 'email') params.set('channel', 'email')
    navigate(`/clients/${id}?${params.toString()}`)
  }

  const setMessageChannel = (channel: ClientMessageChannel) => {
    const next = new URLSearchParams(searchParams)
    next.set('tab', 'messages')
    if (channel === 'email') next.set('channel', 'email')
    else next.delete('channel')
    setSearchParams(next, { replace: true })
  }

  const openMissingGap = (gapId: ClientInfoGapId) => {
    const target = sectionForGap(gapId)
    if (target === 'documents') {
      const next = new URLSearchParams()
      next.set('tab', 'documents')
      if (gapId !== 'nid') next.set('focus', 'passport')
      navigate(`/clients/${id}?${next.toString()}`)
      return
    }
    const next = new URLSearchParams()
    next.set('tab', 'profile')
    next.set('section', target)
    if (gapId === 'email' || gapId === 'address') next.set('field', gapId)
    navigate(`/clients/${id}?${next.toString()}`)
  }

  const openDocumentsFromProfile = (focus?: 'passport' | 'nid') => {
    const next = new URLSearchParams()
    next.set('tab', 'documents')
    if (focus === 'passport') next.set('focus', 'passport')
    navigate(`/clients/${id}?${next.toString()}`)
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

  const customFieldKeys = customFieldDefs.map((field) => `custom:${field.id}`)

  const saveProfile = (): boolean => {
    markAllTouched([...EDITABLE_PROFILE_KEYS, ...customFieldKeys])
    const hasProfileError = EDITABLE_PROFILE_KEYS.some((key) =>
      profileFieldError(key, profileDraft, duplicatePhoneOwner),
    )
    const hasCustomError = customFieldDefs.some(
      (field) =>
        validateCustomFieldValue(
          field,
          profileDraft.customFields[field.id] ?? '',
        ) != null,
    )
    if (hasProfileError || hasCustomError) return false
    const phone = normalizePhone(profileDraft.phone)
    const address = profileDraft.address.trim() || undefined
    // Identity (passport/NID) is owned by Documents. Do not overwrite from Profile.
    try {
      const updated = updateClient(client.id, {
        name: profileDraft.name.trim(),
        banglaName: profileDraft.banglaName.trim() || undefined,
        phone,
        email: profileDraft.email.trim() || undefined,
        address,
        presentAddress:
          profileDraft.presentAddress.trim() || address || undefined,
        permanentAddress: profileDraft.permanentAddress.trim() || undefined,
        district: profileDraft.district.trim() || undefined,
        upazila: profileDraft.upazila.trim() || undefined,
        fatherName: profileDraft.fatherName.trim() || undefined,
        motherName: profileDraft.motherName.trim() || undefined,
        dateOfBirth: profileDraft.dateOfBirth.trim() || undefined,
        gender: profileDraft.gender,
        maritalStatus: parseMaritalStatus(profileDraft.maritalStatus),
        nationality: profileDraft.nationality.trim() || undefined,
        placeOfBirth: profileDraft.placeOfBirth.trim() || undefined,
        spouseName: profileDraft.spouseName.trim() || undefined,
        bloodGroup: profileDraft.bloodGroup.trim() || undefined,
        education: profileDraft.education.trim() || undefined,
        profession: profileDraft.profession.trim() || undefined,
        skillTrade: profileDraft.skillTrade.trim() || undefined,
        experience: profileDraft.experience.trim() || undefined,
        previousOverseasExp:
          profileDraft.previousOverseasExp.trim() || undefined,
        preferredCountry: profileDraft.preferredCountry.trim() || undefined,
        preferredJob: profileDraft.preferredJob.trim() || undefined,
        expectedSalary: profileDraft.expectedSalary.trim() || undefined,
        branch: profileDraft.branch.trim() || undefined,
        subAgentId: profileDraft.subAgentId.trim() || undefined,
        customFields: compactCustomFieldValues({
          ...Object.fromEntries(
            Object.entries(client.customFields ?? {}).filter(
              ([fieldId]) =>
                !customFieldDefs.some((field) => field.id === fieldId),
            ),
          ),
          ...profileDraft.customFields,
        }),
      })
      if (updated) setDraft(toClientProfileDraft(updated, customFieldDefs))
      return true
    } catch (error) {
      notifyIfPendingApproval(error)
      return false
    }
  }

  const displayName = profileDraft.name || client.name
  const displayStatus = deriveClientServiceStatus(clientCases)
  const displayPhone = profileDraft.phone
  const displayWhatsapp = client.whatsapp?.trim() || displayPhone
  const messageChannel = messageChannelFromSearch(searchParams)
  const profileSection = profileSectionFromSearch(searchParams)
  const focusFieldParam = searchParams.get('field')
  const focusField =
    focusFieldParam === 'email' || focusFieldParam === 'address'
      ? focusFieldParam
      : undefined
  const openCases = clientCases.filter(
    (item) => item.status !== 'Completed' && item.status !== 'Cancelled',
  )
  const dueBalance = openCases.reduce((sum, item) => sum + item.balance, 0)
  const paidTotal = clientPayments.reduce((sum, item) => sum + item.amount, 0)
  const recentMessages = [...smsMessages, ...emailMessages].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  )

  const profileGaps = listClientInfoGaps({
    passport: profileDraft.passport,
    passportIssuedOn: profileDraft.passportIssuedOn,
    passportExpiry: profileDraft.passportExpiry,
    nid: profileDraft.nid,
    address: profileDraft.address,
    presentAddress: profileDraft.presentAddress || client.presentAddress,
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
  const pendingStatusRequestsList = requests.filter(
    (request) =>
      request.clientId === client.id && request.reviewStatus === 'Pending',
  )
  const servicesAlertCount =
    servicesAttentionCases + pendingStatusRequestsList.length

  return (
    <div
      className={cn(elevatedPageClass, 'gap-5')}
      data-elevated-canvas
      aria-label={client.name}
    >
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(16rem,20rem)_minmax(0,1fr)]">
        <aside
          className="flex min-w-0 flex-col gap-4 overflow-hidden rounded-2xl border border-border bg-card shadow-sm lg:sticky lg:top-0 lg:z-[1] lg:max-h-[calc(100dvh-8.5rem)] lg:overflow-y-auto"
          aria-label="Client profile"
        >
          <div className="flex shrink-0 flex-col items-center gap-2 bg-[color-mix(in_srgb,var(--color-theme)_8%,var(--color-surface))] px-4 pt-5 pb-4 text-center">
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
            {displayStatus ? (
              <Badge
                variant={displayStatus === 'Completed' ? 'default' : 'secondary'}
                className="shrink-0"
              >
                {displayStatus}
              </Badge>
            ) : null}
            <p className="m-0 flex shrink-0 justify-center text-[0.8125rem] font-normal leading-snug text-foreground">
              <ContactChip value={displayPhone} label="Phone Number" />
            </p>
          </div>

          <div className="flex flex-col gap-3 px-4 pb-4">
            <div className="grid shrink-0 grid-cols-4 gap-1.5">
              <a
                className="inline-flex size-9 items-center justify-center rounded-lg border border-border bg-background text-foreground transition-colors hover:bg-muted"
                href={`tel:${displayPhone}`}
                aria-label={`Call ${displayName}`}
                title="Call"
              >
                <Phone size={14} strokeWidth={2.25} aria-hidden />
              </a>
              <a
                className="inline-flex size-9 items-center justify-center rounded-lg border border-border bg-background text-foreground transition-colors hover:bg-muted"
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
                onClick={() => openMessages('sms')}
                aria-label="Open messages"
                title="Messages"
              >
                <MessageSquare size={14} strokeWidth={2.25} aria-hidden />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => openMessages('email')}
                aria-label="Open email"
                title="Email"
              >
                <Mail size={14} strokeWidth={2.25} aria-hidden />
              </Button>
            </div>

            <Button className="h-9 w-full shrink-0 rounded-lg" onClick={openNewCase}>
              <Folder data-icon="inline-start" />
              Add Service
            </Button>
            <Button
              variant="outline"
              className="h-9 w-full shrink-0 justify-start rounded-lg"
              onClick={() => selectTab('profile')}
            >
              <Contact data-icon="inline-start" />
              Edit Profile
              {profileAlertCount > 0 ? (
                <Badge variant="destructive" className="ms-auto">
                  {profileAlertCount}
                </Badge>
              ) : null}
            </Button>

            <p className="m-0 inline-flex items-center justify-center gap-1.5 text-[0.6875rem] font-medium text-muted-foreground">
              <Calendar size={12} strokeWidth={2.25} aria-hidden />
              Member Since {formatDate(client.createdAt)}
            </p>
          </div>

          <ClientIdentityExtras
            client={client}
            dueBalance={dueBalance}
            paidTotal={paidTotal}
            onOpenPayments={() => selectTab('payments')}
            onOpenDocuments={(focus) => openDocumentsFromProfile(focus)}
            onOpenProfile={() => selectTab('profile')}
          />
        </aside>

        <div className="flex min-w-0 flex-col gap-3">
          <DetailTabs
            value={
              MAIN_TABS.includes(activeTab as (typeof MAIN_TABS)[number])
                ? activeTab
                : 'overview'
            }
            onValueChange={selectTab}
            items={[
              {
                id: 'overview',
                label: <TabLabel icon={LayoutDashboard}>Overview</TabLabel>,
                content: (
                  <div className="flex flex-col gap-4">
                    <ClientDealStrip
                      cases={clientCases}
                      onCollectPayment={() => {
                        const next = new URLSearchParams()
                        next.set('tab', 'payments')
                        next.set('record', '1')
                        navigate(`/clients/${id}?${next.toString()}`)
                      }}
                    />
                    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(17rem,20rem)]">
                      <div className="flex min-w-0 flex-col gap-4">
                        <ClientOverviewAttention
                          clientName={client.name}
                          gaps={profileGaps}
                          cases={clientCases}
                          dueBalance={dueBalance}
                          documentsAlertCount={documentsAlertCount}
                          pendingRequests={pendingStatusRequestsList}
                          onOpenGap={openMissingGap}
                          onOpenPayments={() => selectTab('payments')}
                          onOpenProfile={() => selectTab('profile')}
                          onOpenDocuments={() => selectTab('documents')}
                          onOpenServices={() => selectTab('services')}
                        />
                        <ClientRecentActivity
                          messages={recentMessages}
                          payments={clientPayments}
                          onOpenMessages={() => openMessages('sms')}
                          onOpenPayments={() => selectTab('payments')}
                        />
                      </div>
                      <ClientActionItems clientId={client.id} />
                    </div>
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
                  <ClientProfileWorkspace
                    draft={profileDraft}
                    savedDraft={savedDraft}
                    gaps={profileGaps}
                    customFieldDefs={customFieldDefs}
                    subAgentOptions={subAgentOptions}
                    showError={showError}
                    fieldError={(key) =>
                      profileFieldError(key, profileDraft, duplicatePhoneOwner)
                    }
                    customFieldError={(fieldId) => {
                      const field = customFieldDefs.find(
                        (entry) => entry.id === fieldId,
                      )
                      if (!field) return undefined
                      return validateCustomFieldValue(
                        field,
                        profileDraft.customFields[fieldId] ?? '',
                      )
                    }}
                    blur={blur}
                    onChange={(key, value) => {
                      setDraft((current) => ({
                        ...(current ?? savedDraft),
                        [key]: value,
                      }))
                    }}
                    onCustomChange={(fieldId, value) => {
                      setDraft((current) => {
                        const base = current ?? savedDraft
                        return {
                          ...base,
                          customFields: {
                            ...base.customFields,
                            [fieldId]: value,
                          },
                        }
                      })
                    }}
                    onDiscard={discardChanges}
                    onSave={saveProfile}
                    onOpenDocuments={openDocumentsFromProfile}
                    initialSection={profileSection}
                    focusField={focusField}
                  />
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
                content: (
                  <ClientMessagesPanel
                    client={client}
                    channel={messageChannel}
                    onChannelChange={setMessageChannel}
                  />
                ),
              },
            ]}
          />
        </div>
      </div>

      <Sheet
        open={newCaseOpen}
        onOpenChange={(open) => {
          if (!open) closeNewCase()
        }}
      >
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
  const [indicator, setIndicator] = useState<{
    left: number
    width: number
  } | null>(null)

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
    if (!root || typeof ResizeObserver === 'undefined') return
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
        className="relative inline-flex h-10 max-w-full items-stretch self-start overflow-x-auto rounded-xl border border-border bg-card p-1 shadow-sm"
      >
        {indicator ? (
          <span
            aria-hidden
            className="pointer-events-none absolute top-0.5 bottom-0.5 z-0 rounded-md bg-primary transition-[left,width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={
              {
                left: indicator.left,
                width: indicator.width,
              } as CSSProperties
            }
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
