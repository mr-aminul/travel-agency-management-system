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
  useParams,
  useSearchParams,
} from 'react-router-dom'
import { Check, Contact, Copy, Folder, Wallet } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { AddServicePicker } from '@/components/cases/AddServicePicker'
import { ClientServicesWorkspace } from '@/components/cases/ClientServicesWorkspace'
import { ClientIdentityDocumentWorkspace } from '@/components/clients/ClientIdentityDocumentWorkspace'
import { ClientNextAction } from '@/components/clients/ClientNextAction'
import { ClientProfileAside } from '@/components/clients/ClientProfileAside'
import { ClientMessagesPanel } from '@/components/clients/ClientMessagesPanel'
import { ClientProfileWorkspace } from '@/components/clients/ClientProfileWorkspace'
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
import {
  listClientInfoGaps,
  listProfileFormGaps,
  type ClientInfoGapId,
} from '@/lib/clientMissingInfo'
import { notifyIfPendingApproval } from '@/lib/notifyPendingApproval'
import {
  clientV3IdentityFocusPath,
  clientV3Path,
  clientV3WorkDetailPath,
  clientsV3Path,
} from '@/lib/workPaths'
import { useSubAgents } from '@/lib/subAgentsStore'
import {
  getClientById,
  getClientByPhone,
  normalizePhone,
  updateClient,
  useClients,
} from '@/lib/clientsStore'
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
import '@/styles/layout-clients.css'

const MAIN_TABS = ['services', 'profile', 'payments'] as const

function tabFromSearch(searchParams: URLSearchParams): string {
  const tab = searchParams.get('tab')
  // Legacy pay=1 / record-only links → Payments tab.
  if (tab === 'payments' || searchParams.get('pay') === '1') return 'payments'
  // Legacy edit sheet → Profile tab.
  if (tab === 'profile' || searchParams.get('edit') === '1') return 'profile'
  if (tab === 'documents') return 'services'
  if (!tab || tab === 'overview') return 'services'
  if (tab === 'messages' || tab === 'email') return 'services'
  return MAIN_TABS.includes(tab as (typeof MAIN_TABS)[number]) ? tab : 'services'
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

export default function ClientsV3DetailPage() {
  const { id = '', caseId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  useClients()
  const subAgents = useSubAgents()
  const customFieldDefs = useClientProfileFields()
  const client = getClientById(id)
  const clientCases = useCasesByClientId(id)
  const activeTab = caseId ? 'services' : tabFromSearch(searchParams)
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
      next.delete('tab')
      setSearchParams(next, { replace: true })
      return
    }
    next.set('tab', 'services')
    if (focus === 'docs' && focusCase) {
      const open = clientCases.find((item) => item.id === focusCase)
      if (open) {
        navigate(clientV3WorkDetailPath(open), { replace: true })
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
    // Legacy ?edit=1 → Profile tab.
    if (searchParams.get('edit') !== '1') return
    const next = new URLSearchParams(searchParams)
    next.delete('edit')
    next.set('tab', 'profile')
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  useEffect(() => {
    // Legacy ?tab=overview → Services (default).
    if (searchParams.get('tab') !== 'overview') return
    const next = new URLSearchParams(searchParams)
    next.delete('tab')
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
    return <Navigate to={clientsV3Path()} replace />
  }

  const profileDraft = draft ?? savedDraft

  const selectTab = (tab: string) => {
    const resolved =
      tab === 'email' || tab === 'messages' || tab === 'overview' ? 'services' : tab
    // Leaving a nested service file → flat client desk tab.
    if (caseId) {
      if (resolved === 'payments') {
        navigate(`/clients-v3/${id}?tab=payments`)
        return
      }
      if (resolved === 'profile') {
        navigate(`/clients-v3/${id}?tab=profile`)
        return
      }
      navigate(clientV3Path(id))
      return
    }
    const next = new URLSearchParams(searchParams)
    if (resolved === 'services') next.delete('tab')
    else next.set('tab', resolved)
    if (resolved !== 'payments') {
      next.delete('record')
      next.delete('pay')
    } else {
      next.delete('pay')
    }
    next.delete('edit')
    if (resolved !== 'profile') {
      next.delete('section')
      next.delete('field')
    }
    if (resolved !== 'services') next.delete('focus')
    setSearchParams(next, { replace: true })
  }

  const openPayments = (record = true) => {
    if (caseId) {
      const qs = new URLSearchParams()
      qs.set('tab', 'payments')
      if (record) qs.set('record', '1')
      navigate(`/clients-v3/${id}?${qs.toString()}`)
      return
    }
    const next = new URLSearchParams(searchParams)
    next.set('tab', 'payments')
    next.delete('pay')
    if (record) next.set('record', '1')
    else next.delete('record')
    setSearchParams(next, { replace: true })
  }

  useEffect(() => {
    // Normalize legacy ?pay=1 into the Payments tab.
    if (searchParams.get('pay') !== '1') return
    const next = new URLSearchParams(searchParams)
    next.delete('pay')
    next.set('tab', 'payments')
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  const openProfile = (opts?: { section?: string; field?: string }) => {
    if (caseId) {
      const qs = new URLSearchParams()
      qs.set('tab', 'profile')
      if (opts?.section) qs.set('section', opts.section)
      if (opts?.field) qs.set('field', opts.field)
      navigate(`/clients-v3/${id}?${qs.toString()}`)
      return
    }
    const next = new URLSearchParams(searchParams)
    next.set('tab', 'profile')
    next.delete('edit')
    if (opts?.section) next.set('section', opts.section)
    else next.delete('section')
    if (opts?.field) next.set('field', opts.field)
    else next.delete('field')
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
      navigate(clientV3IdentityFocusPath(id, gapId === 'nid' ? 'nid' : 'passport'))
      return
    }
    openProfile({
      section: target,
      field:
        gapId === 'email'
          ? 'email'
          : gapId === 'address'
            ? 'presentAddress'
            : undefined,
    })
  }

  const openDocumentsFromProfile = (focus?: 'passport' | 'nid') => {
    navigate(clientV3IdentityFocusPath(id, focus === 'nid' ? 'nid' : 'passport'))
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
    if (next.get('tab') !== 'payments') next.set('tab', 'payments')
    setSearchParams(next, { replace: true })
  }

  const openNewCase = () => {
    setNewCaseOpen(true)
    navigate(`/clients-v3/${id}?tab=services&newCase=1`, { replace: true })
  }

  const closeNewCase = () => {
    setNewCaseOpen(false)
    navigate(`/clients-v3/${id}?tab=services`, { replace: true })
  }

  const handleCreateCase = (input: CreateCaseInput) => {
    try {
      const created = createCase(input)
      closeNewCase()
      navigate(clientV3WorkDetailPath(created))
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
  const paymentsAlertCount = openCases.filter((item) => item.balance > 0).length

  const gapSource = {
    passport: profileDraft.passport,
    passportIssuedOn: profileDraft.passportIssuedOn,
    passportExpiry: profileDraft.passportExpiry,
    nid: profileDraft.nid,
    address: profileDraft.presentAddress,
    presentAddress: profileDraft.presentAddress,
    email: profileDraft.email,
  }
  const profileGaps = listClientInfoGaps(gapSource)
  const profileFormGaps = listProfileFormGaps(gapSource)
  const profileAlertCount = profileFormGaps.length

  const identityFocus =
    searchParams.get('focus') === 'nid'
      ? ('nid' as const)
      : searchParams.get('focus') === 'passport'
        ? ('passport' as const)
        : undefined
  const selectedDocId = searchParams.get('doc')
  return (
    <div
      className={cn(
        'pd-page pd-page--elevated',
        elevatedPageClass,
        'mx-auto w-full max-w-[80rem] gap-3',
      )}
      data-elevated-canvas
      aria-label={client.name}
    >
      <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-[minmax(min(19rem,100%),23rem)_minmax(0,1fr)] lg:gap-3">
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
          onEditProfile={() => openProfile()}
          onAddService={openNewCase}
          onOpenMessages={openMessages}
          onOpenDocuments={(focus) => openDocumentsFromProfile(focus)}
          onOpenPayments={() => openPayments(true)}
          contactChip={(props) => <ContactChip {...props} />}
        >
          {!newCaseOpen ? (
            <ClientNextAction
              gaps={profileGaps}
              cases={clientCases}
              dueBalance={dueBalance}
              onOpenGap={openMissingGap}
              onOpenPayments={() => openPayments(true)}
              onOpenService={(openId) => {
                const open = clientCases.find((item) => item.id === openId)
                if (open) navigate(clientV3WorkDetailPath(open))
              }}
              onAddService={openNewCase}
            />
          ) : null}
        </ClientProfileAside>

        <div className="flex min-w-0 flex-col gap-3">
          <DetailTabs
            value={
              newCaseOpen
                ? 'services'
                : MAIN_TABS.includes(activeTab as (typeof MAIN_TABS)[number])
                  ? activeTab
                  : 'services'
            }
            onValueChange={selectTab}
            items={[
              {
                id: 'services',
                label: <TabLabel icon={Folder}>Services</TabLabel>,
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
                    layout="focus"
                    onSelectService={(openId) => {
                      const open = clientCases.find((item) => item.id === openId)
                      if (open) navigate(clientV3WorkDetailPath(open))
                    }}
                    onClearService={() => navigate(clientV3Path(id))}
                  />
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
        className="pd-client-elevated-panel relative inline-flex h-10 max-w-full items-stretch self-start overflow-x-auto rounded-lg p-0.5"
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
                  ? 'bg-primary text-primary-foreground hover:!bg-primary hover:text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground',
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
