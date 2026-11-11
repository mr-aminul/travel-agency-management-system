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
import { Button } from '@/components/shadcn/button'
import { cn } from '@/lib/utils'
import type { ClientMessageChannel } from '@/types/clientMessage'
import {
  Link,
  Navigate,
  useNavigate,
  useOutlet,
  useParams,
  useSearchParams,
} from 'react-router-dom'
import {
  Check,
  Contact,
  Copy,
  Folder,
  LayoutDashboard,
  Wallet,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { AddServicePicker } from '@/components/cases/AddServicePicker'
import { ClientServicesWorkspace } from '@/components/cases/ClientServicesWorkspace'
import { ClientActionItems } from '@/components/clients/ClientActionItems'
import { ClientIdentityDocumentWorkspace } from '@/components/clients/ClientIdentityDocumentWorkspace'
import { ClientOverviewAttention } from '@/components/clients/ClientOverviewAttention'
import { ClientProfileAside } from '@/components/clients/ClientProfileAside'
import { ClientMessagesPanel } from '@/components/clients/ClientMessagesPanel'
import { ClientProfileWorkspace } from '@/components/clients/ClientProfileWorkspace'
import { ClientRecentActivity } from '@/components/clients/ClientRecentActivity'
import {
  EDITABLE_PROFILE_KEYS,
  parseMaritalStatus,
  profileFieldError,
  profileSectionFromParam,
  sectionForGap,
  toClientProfileDraft,
  type ClientProfileDraft,
} from '@/components/clients/clientProfileDraft'
import { PaymentsList } from '@/components/payments/PaymentsList'
import {
  createCase,
  reconcileClientIdentityFromCases,
  useCasesByClientId,
} from '@/lib/casesStore'
import { countClientServicePaperAlerts } from '@/lib/clientDocuments'
import {
  listClientInfoGaps,
  listProfileFormGaps,
  type ClientInfoGapId,
} from '@/lib/clientMissingInfo'
import { toServiceBoardItem } from '@/lib/clientServiceBoard'
import { useRequests } from '@/lib/requestsStore'
import { notifyIfPendingApproval } from '@/lib/notifyPendingApproval'
import {
  clientIdentityFocusPath,
  clientPath,
  workDetailPath,
} from '@/lib/workPaths'
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
import { useTouchedFields } from '@/lib/useTouchedFields'
import type { CreateCaseInput } from '@/types/case'
import {
  elevatedPageClass,
  floatingSheetClass,
  floatingSheetWideClass,
} from '@/components/clients/shadcnChrome'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/shadcn/sheet'

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
  'payments',
] as const

function tabFromSearch(searchParams: URLSearchParams): string {
  const tab = searchParams.get('tab')
  // Legacy Documents tab (papers) lives inside Services now.
  if (tab === 'documents') return 'services'
  // Legacy Messages / Email tabs open as a write window.
  if (tab === 'messages' || tab === 'email') return 'overview'
  return tab &&
    CLIENT_TABS.includes(tab as (typeof CLIENT_TABS)[number]) &&
    tab !== 'messages' &&
    tab !== 'email'
    ? tab
    : 'overview'
}

function writeChannelFromSearch(
  searchParams: URLSearchParams,
): ClientMessageChannel | null {
  const write = searchParams.get('write')
  if (write === 'email' || write === 'sms') return write
  // Legacy ?tab=messages|email&channel=
  const tab = searchParams.get('tab')
  if (tab === 'email' || searchParams.get('channel') === 'email') return 'email'
  if (tab === 'messages') return 'sms'
  return null
}

function profileSectionFromSearch(
  searchParams: URLSearchParams,
) {
  return profileSectionFromParam(searchParams.get('section'))
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
    if (searchParams.get('newCase') !== '1') {
      setNewCaseOpen(false)
      return
    }
    setNewCaseOpen(true)
    if (searchParams.get('tab') !== 'services') {
      const next = new URLSearchParams(searchParams)
      next.set('tab', 'services')
      setSearchParams(next, { replace: true })
    }
  }, [searchParams, setSearchParams])

  useEffect(() => {
    // Legacy ?tab=documents → Services (papers) or Profile (passport/NID).
    if (searchParams.get('tab') !== 'documents') return
    const next = new URLSearchParams(searchParams)
    const focus = next.get('focus')
    const focusCase = next.get('case')
    if (focus === 'passport' || focus === 'nid') {
      next.set('tab', 'profile')
      setSearchParams(next, { replace: true })
      return
    }
    next.set('tab', 'services')
    if (focus === 'docs' && focusCase) {
      const open = clientCases.find((item) => item.id === focusCase)
      if (open) {
        navigate(workDetailPath(open), { replace: true })
        return
      }
    }
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams, clientCases, navigate])

  useEffect(() => {
    // Legacy ?tab=messages|email → write window on the current page.
    const tab = searchParams.get('tab')
    if (tab !== 'messages' && tab !== 'email') return
    const next = new URLSearchParams(searchParams)
    const channel =
      tab === 'email' || next.get('channel') === 'email' ? 'email' : 'sms'
    next.delete('tab')
    next.delete('channel')
    next.set('write', channel)
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  useEffect(() => {
    if (!client) return
    // Pull identity that only exists on service files onto the client so
    // Profile and service papers never disagree.
    reconcileClientIdentityFromCases(client.id)
  }, [client?.id])

  useEffect(() => {
    if (!client) return
    setDraft(toClientProfileDraft(client, customFieldDefs))
  }, [client?.id, customFieldDefs])

  // Identity is edited in Profile → document workspace. Keep form fields mirrored.
  useEffect(() => {
    if (!client) return
    setDraft((current) => {
      if (!current) return current
      return {
        ...current,
        passport: client.passport ?? '',
        passportExpiry: client.passportExpiry ?? '',
        passportIssuedOn: client.passportIssuedOn ?? '',
        nid: client.nid ?? '',
      }
    })
  }, [
    client?.passport,
    client?.passportExpiry,
    client?.passportIssuedOn,
    client?.nid,
  ])

  const savedDraft = useMemo(
    () => (client ? toClientProfileDraft(client, customFieldDefs) : null),
    [client, customFieldDefs],
  )

  if (!client || !savedDraft) {
    return <Navigate to="/clients" replace />
  }

  const profileDraft = draft ?? savedDraft

  const selectTab = (tab: string) => {
    const resolved =
      tab === 'email' || tab === 'messages' ? 'overview' : tab
    if (serviceOutlet) {
      navigate(clientPath(id, resolved))
      return
    }
    const next = new URLSearchParams(searchParams)
    if (resolved === 'overview') next.delete('tab')
    else next.set('tab', resolved)
    if (resolved !== 'payments') next.delete('record')
    if (resolved !== 'profile') {
      next.delete('section')
      next.delete('field')
      next.delete('focus')
    }
    setSearchParams(next, { replace: true })
  }

  const openMessages = (channel: ClientMessageChannel) => {
    const next = new URLSearchParams(searchParams)
    next.delete('channel')
    next.set('write', channel === 'email' ? 'email' : 'sms')
    setSearchParams(next, { replace: true })
  }

  const closeWriteWindow = () => {
    const next = new URLSearchParams(searchParams)
    if (!next.get('write') && next.get('tab') !== 'messages' && next.get('tab') !== 'email') {
      return
    }
    next.delete('write')
    next.delete('channel')
    if (next.get('tab') === 'messages' || next.get('tab') === 'email') {
      next.delete('tab')
    }
    setSearchParams(next, { replace: true })
  }

  const openMissingGap = (gapId: ClientInfoGapId) => {
    const target = sectionForGap(gapId)
    if (target === 'identity') {
      navigate(clientIdentityFocusPath(id, gapId === 'nid' ? 'nid' : 'passport'))
      return
    }
    const next = new URLSearchParams()
    next.set('tab', 'profile')
    next.set('section', target)
    if (gapId === 'email') next.set('field', 'email')
    if (gapId === 'address') next.set('field', 'presentAddress')
    navigate(`/clients/${id}?${next.toString()}`)
  }

  const openDocumentsFromProfile = (focus?: 'passport' | 'nid') => {
    navigate(clientIdentityFocusPath(id, focus === 'nid' ? 'nid' : 'passport'))
  }

  const closeIdentityDocument = () => {
    const next = new URLSearchParams(searchParams)
    if (!next.get('focus')) return
    next.delete('focus')
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
    navigate(`/clients/${id}?tab=services&newCase=1`, { replace: true })
  }

  const closeNewCase = () => {
    setNewCaseOpen(false)
    navigate(`/clients/${id}?tab=services`, { replace: true })
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
    const presentAddress = profileDraft.presentAddress.trim() || undefined
    // Identity (passport/NID) is owned by Profile → document workspace. Do not overwrite here.
    try {
      const updated = updateClient(client.id, {
        name: profileDraft.name.trim(),
        banglaName: profileDraft.banglaName.trim() || undefined,
        phone,
        email: profileDraft.email.trim() || undefined,
        whatsapp: profileDraft.whatsapp.trim() || undefined,
        address: presentAddress,
        presentAddress,
        permanentAddress: profileDraft.permanentAddress.trim() || undefined,
        district: profileDraft.district.trim() || undefined,
        upazila: profileDraft.upazila.trim() || undefined,
        fatherName: profileDraft.fatherName.trim() || undefined,
        motherName: profileDraft.motherName.trim() || undefined,
        dateOfBirth: profileDraft.dateOfBirth.trim() || undefined,
        gender: profileDraft.gender || undefined,
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
  const displayPhone = profileDraft.phone
  const displayWhatsapp = profileDraft.whatsapp.trim() || displayPhone
  const writeChannel = writeChannelFromSearch(searchParams)
  const profileSection = profileSectionFromSearch(searchParams)
  const focusFieldParam = searchParams.get('field')
  const focusField =
    focusFieldParam === 'email'
      ? 'email'
      : focusFieldParam === 'address' || focusFieldParam === 'presentAddress'
        ? 'presentAddress'
        : undefined
  const openCases = clientCases.filter(
    (item) => item.status !== 'Completed' && item.status !== 'Cancelled',
  )
  const dueBalance = openCases.reduce((sum, item) => sum + item.balance, 0)
  const recentMessages = [...smsMessages, ...emailMessages].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  )

  const gapSource = {
    passport: profileDraft.passport,
    passportIssuedOn: profileDraft.passportIssuedOn,
    passportExpiry: profileDraft.passportExpiry,
    nid: profileDraft.nid,
    address: profileDraft.presentAddress,
    presentAddress: profileDraft.presentAddress,
    email: profileDraft.email,
  }
  /** Overview still lists every gap (including passport / NID). */
  const profileGaps = listClientInfoGaps(gapSource)
  /** Profile tab chip / badge only counts fields editable on that tab. */
  const profileFormGaps = listProfileFormGaps(gapSource)
  const profileAlertCount = profileFormGaps.length

  const servicePaperAlertCount = countClientServicePaperAlerts(clientCases)

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
    servicesAttentionCases +
    pendingStatusRequestsList.length +
    servicePaperAlertCount

  const identityFocus =
    searchParams.get('focus') === 'nid'
      ? ('nid' as const)
      : searchParams.get('focus') === 'passport'
        ? ('passport' as const)
        : undefined
  const selectedDocId = searchParams.get('doc')
  return (
    <div
      className={cn(elevatedPageClass, 'mx-auto w-full max-w-full gap-5')}
      data-elevated-canvas
      aria-label={client.name}
    >
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(16rem,20rem)_minmax(0,1fr)]">
        <ClientProfileAside
          client={client}
          cases={clientCases}
          displayName={displayName}
          banglaName={profileDraft.banglaName || undefined}
          displayPhone={displayPhone}
          displayEmail={profileDraft.email}
          displayWhatsapp={displayWhatsapp}
          activeDocument={identityFocus}
          onAvatarChange={(avatarUrl) => {
            try {
              updateClient(client.id, { avatarUrl })
            } catch (error) {
              notifyIfPendingApproval(error)
            }
          }}
          onEditProfile={() => selectTab('profile')}
          onAddService={openNewCase}
          onOpenMessages={openMessages}
          onOpenDocuments={(focus) => openDocumentsFromProfile(focus)}
          contactChip={(props) => <ContactChip {...props} />}
        />

        <div className="flex min-w-0 flex-col gap-3">
          <DetailTabs
            value={
              newCaseOpen
                ? 'services'
                : MAIN_TABS.includes(activeTab as (typeof MAIN_TABS)[number])
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
                    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(17rem,20rem)]">
                      <ClientOverviewAttention
                        clientName={client.name}
                        gaps={profileGaps}
                        cases={clientCases}
                        dueBalance={dueBalance}
                        pendingRequests={pendingStatusRequestsList}
                        onOpenGap={openMissingGap}
                        onOpenPayments={() => selectTab('payments')}
                      />
                      <ClientActionItems clientId={client.id} />
                    </div>
                    <ClientRecentActivity
                      cases={clientCases}
                      messages={recentMessages}
                      payments={clientPayments}
                      requests={requests.filter(
                        (item) => item.clientId === client.id,
                      )}
                      onOpenMessages={(channel) => openMessages(channel)}
                      onOpenPayments={() => selectTab('payments')}
                      onOpenService={(caseId) =>
                        navigate(workDetailPath({ id: caseId, clientId: client.id }))
                      }
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
                  <ClientProfileWorkspace
                    draft={profileDraft}
                    savedDraft={savedDraft}
                    gaps={profileFormGaps}
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
                content: newCaseOpen ? (
                  <AddServicePicker
                    clientId={client.id}
                    clientName={client.name}
                    defaultCountry={
                      clientCases.find((item) => item.serviceCountry)
                        ?.serviceCountry || client.preferredCountry
                    }
                    onSubmit={handleCreateCase}
                    onCancel={closeNewCase}
                  />
                ) : (
                  <ClientServicesWorkspace
                    client={client}
                    cases={clientCases}
                    selectedId={caseId}
                    selectedDocId={selectedDocId}
                    onAddService={openNewCase}
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
            ]}
          />
        </div>
      </div>

      <Sheet
        open={identityFocus != null}
        onOpenChange={(open) => {
          if (!open) closeIdentityDocument()
        }}
      >
        <SheetContent
          className={cn(floatingSheetClass, floatingSheetWideClass, 'overflow-hidden')}
        >
          <SheetHeader className="border-b border-border px-4 py-3 pr-12">
            <SheetTitle className="text-sm font-semibold">
              {identityFocus === 'nid' ? 'National ID' : 'Passport'}
            </SheetTitle>
          </SheetHeader>
          {identityFocus ? (
            <ClientIdentityDocumentWorkspace
              client={client}
              cases={clientCases}
              identityKind={identityFocus}
            />
          ) : null}
        </SheetContent>
      </Sheet>

      <Sheet
        open={writeChannel != null}
        onOpenChange={(open) => {
          if (!open) closeWriteWindow()
        }}
      >
        <SheetContent
          className={cn(
            floatingSheetClass,
            floatingSheetWideClass,
            'flex flex-col overflow-hidden p-0',
          )}
        >
          <SheetHeader className="border-b border-border px-4 py-3 pr-12">
            <SheetTitle className="text-sm font-semibold">
              {writeChannel === 'email' ? 'Email' : 'SMS'}
            </SheetTitle>
          </SheetHeader>
          {writeChannel ? (
            <ClientMessagesPanel
              client={client}
              channel={writeChannel}
              embedded
            />
          ) : null}
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
        className="relative inline-flex h-10 max-w-full items-stretch self-start overflow-x-auto rounded-lg border border-border bg-card p-0.5 shadow-sm"
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
