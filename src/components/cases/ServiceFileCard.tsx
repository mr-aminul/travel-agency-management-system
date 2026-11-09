import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Check,
  ChevronDown,
  ClipboardList,
  Ellipsis,
  FileText,
  Link2,
  SquarePen,
  Trash2,
  UserRound,
} from 'lucide-react'
import { CasePipeline } from '@/components/cases/CasePipeline'
import { DocumentWorkspace } from '@/components/cases/DocumentWorkspace'
import { serviceDetailAriaLabel } from '@/lib/serviceDisplay'
import {
  documentHasFile,
  getCaseServicePapers,
} from '@/lib/clientDocuments'
import { listCaseInfoGaps } from '@/lib/caseServiceRules'
import { Input, Select, Textarea } from '@/components/clients/clientShadcnFields'
import { Badge } from '@/components/shadcn/badge'
import { Button } from '@/components/shadcn/button'
import { ConfirmDialog } from '@/components/shadcn/confirm-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/shadcn/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/shadcn/dialog'
import {
  CASE_STATUS_OPTIONS,
  deleteCase,
  getCaseById,
  updateCase,
  useCases,
} from '@/lib/casesStore'
import {
  countryFlagEmoji,
  destinationCountryOptions,
  formatDestination,
  matchCountryFromDestination,
} from '@/lib/destinationCountries'
import { notifyIfPendingApproval } from '@/lib/notifyPendingApproval'
import { usePaymentsByCaseId } from '@/lib/paymentsStore'
import { formatBalance, getClientById } from '@/lib/clientsStore'
import { caseServiceFee, parseMoneyInput } from '@/lib/caseMoney'
import { toServiceBoardItem } from '@/lib/clientServiceBoard'
import {
  employeeAssignmentOptions,
  getEmployeeDisplayName,
  useEmployees,
} from '@/lib/employeesStore'
import { submitStatusRequest } from '@/lib/requestsStore'
import { useServiceIconOverrides } from '@/lib/serviceIconOverridesStore'
import { iconForService } from '@/lib/serviceIcons'
import {
  listServiceCountries,
  useServiceTemplates,
} from '@/lib/serviceTemplatesStore'
import { flashAndReveal } from '@/lib/scrollWithin'
import {
  clientIdentityFocusPath,
  clientPath,
  workDetailPath,
  workInvoicePath,
} from '@/lib/workPaths'
import { clientTrackingUrl } from '@/lib/publicUrl'
import { cn } from '@/lib/utils'
import type { CaseStatus } from '@/types/case'

const FOCUS_FLASH_CLASS =
  'rounded-xl outline outline-2 outline-[color-mix(in_srgb,var(--color-theme)_55%,transparent)] outline-offset-[3px]'

function cityFromDestination(destination: string, country: string): string {
  const place = destination.trim()
  const dest = country.trim()
  if (!place) return ''
  if (!dest) return place
  if (place.toLowerCase() === dest.toLowerCase()) return ''
  const suffix = `, ${dest}`
  if (place.toLowerCase().endsWith(suffix.toLowerCase())) {
    return place.slice(0, place.length - suffix.length).trim()
  }
  return place
}

function caseStatusShadcnVariant(
  status: CaseStatus,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'Completed') return 'default'
  if (status === 'Cancelled') return 'destructive'
  if (status === 'On-Hold') return 'outline'
  return 'secondary'
}

const FOCUS_FLASH_MS = 2800


function clientServicePaperPath(caseId: string, clientId: string, docId: string): string {
  return `/clients/${clientId}/services/${caseId}?doc=${encodeURIComponent(docId)}`
}

async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value)
  } catch {
    const field = document.createElement('textarea')
    field.value = value
    field.setAttribute('readonly', '')
    field.style.position = 'fixed'
    field.style.opacity = '0'
    document.body.appendChild(field)
    field.select()
    document.execCommand('copy')
    field.remove()
  }
}

function Fact({
  label,
  value,
  attention = false,
  className,
  id,
  children,
}: {
  label?: string
  value?: string
  attention?: boolean
  className?: string
  id?: string
  children?: ReactNode
}) {
  return (
    <div
      id={id}
      className={cn(
        'min-w-0',
        attention &&
        '[&_[data-slot=field-label]]:text-destructive [&_input]:border-destructive/55 [&_input]:bg-[color-mix(in_srgb,var(--color-danger)_5%,var(--color-surface))]',
        className,
      )}
    >
      {children ?? (
        <Input label={label ?? ''} value={value} readOnly tabIndex={-1} />
      )}
    </div>
  )
}

function paperTone(locked: boolean, hasFile: boolean, required = true) {
  if (locked || !required) return 'idle' as const
  return hasFile ? ('done' as const) : ('need' as const)
}

function paperStatus(tone: 'done' | 'need' | 'idle') {
  if (tone === 'done') return 'On file'
  if (tone === 'need') return 'Needed'
  return 'Later'
}

/**
 * Goals-style teal bar: paid on the left, payable (due) on the right.
 */
function PaymentMeter({
  fee,
  paid,
  due,
}: {
  fee: number
  paid: number
  due: number
}) {
  const safeFee = Math.max(0, fee)
  const safeDue = Math.max(0, due)
  const safePaid = Math.min(Math.max(0, paid), safeFee)
  const percent =
    safeFee > 0 ? Math.round((safePaid / safeFee) * 100) : 0
  const settled = safeDue <= 0 && safeFee > 0

  const left = formatBalance(safeFee <= 0 ? 0 : safePaid)
  const right = formatBalance(safeFee <= 0 ? 0 : safeDue)
  const fill = safeFee <= 0 ? 0 : percent

  return (
    <div
      className="flex min-w-[11rem] max-w-[14rem] items-center gap-2.5"
      aria-label={
        safeFee <= 0
          ? 'No service fee set'
          : settled
            ? `Paid in full, ${formatBalance(safeFee)}`
            : `${formatBalance(safePaid)} paid, ${formatBalance(safeDue)} due of ${formatBalance(safeFee)}`
      }
    >
      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
        {left}
      </span>
      <div
        className="h-[0.32rem] min-w-10 flex-1 overflow-hidden rounded-full bg-border"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={fill}
        aria-hidden
      >
        <div
          className="h-full rounded-full bg-[#1ac097] transition-[width] duration-200 ease-out"
          style={{ width: `${fill}%` }}
        />
      </div>
      <span
        className={cn(
          'shrink-0 text-xs tabular-nums',
          settled || safeFee <= 0
            ? 'text-muted-foreground'
            : 'font-medium text-foreground',
        )}
      >
        {right}
      </span>
    </div>
  )
}

export type ServiceFileCardProps = {
  caseId: string
  /** Open paper id for this file only. */
  selectedDocId?: string | null
}

export function ServiceFileCard({
  caseId,
  selectedDocId = null,
}: ServiceFileCardProps) {
  const navigate = useNavigate()
  useCases()
  useServiceTemplates()
  useServiceIconOverrides()
  const item = getCaseById(caseId)
  const casePayments = usePaymentsByCaseId(caseId)
  const employees = useEmployees()
  const client = item ? getClientById(item.clientId) : undefined
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({
    status: 'Pending' as CaseStatus,
    country: '',
    destination: '',
    assignedTo: '',
    departureDate: '',
    serviceFee: '',
    description: '',
  })
  const [requestOpen, setRequestOpen] = useState(false)
  const [requestTo, setRequestTo] = useState<CaseStatus>('In-Progress')
  const [requestRemarks, setRequestRemarks] = useState('')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [trackingCopied, setTrackingCopied] = useState(false)
  const [flashTarget, setFlashTarget] = useState<
    'status' | 'pipeline' | 'documents' | null
  >(null)

  const catalogCountries = useMemo(
    () => (item ? listServiceCountries(item.service) : []),
    [item],
  )
  const countryOptions = useMemo(() => {
    if (catalogCountries.length) {
      return [
        { value: '', label: 'Select country' },
        ...catalogCountries.map((name) => ({ value: name, label: name })),
      ]
    }
    return [
      { value: '', label: 'Select country' },
      ...destinationCountryOptions(),
    ]
  }, [catalogCountries])

  useEffect(() => {
    setEditing(false)
    setRequestOpen(false)
    setDeleteOpen(false)
    setTrackingCopied(false)
    setFlashTarget(null)
  }, [caseId])

  useEffect(() => {
    if (!flashTarget || flashTarget === 'documents') return
    const id =
      flashTarget === 'status'
        ? `case-status-field-${caseId}`
        : `case-pipeline-${caseId}`
    const frame = window.requestAnimationFrame(() => {
      flashAndReveal(id)
    })
    const timer = window.setTimeout(() => setFlashTarget(null), FOCUS_FLASH_MS)
    return () => {
      window.cancelAnimationFrame(frame)
      window.clearTimeout(timer)
    }
  }, [flashTarget, editing])

  useEffect(() => {
    if (!trackingCopied) return
    const timer = window.setTimeout(() => setTrackingCopied(false), 1500)
    return () => window.clearTimeout(timer)
  }, [trackingCopied])

  if (!item) return null

  const setupGaps = listCaseInfoGaps(item)
  const paidTotal = casePayments.reduce((sum, payment) => sum + payment.amount, 0)
  const serviceFee = caseServiceFee(item, paidTotal)
  const assignedName = getEmployeeDisplayName(item.assignedTo)
  const displayStatus = editing ? draft.status : item.status
  const countryLookup = catalogCountries.length
    ? catalogCountries
    : destinationCountryOptions().map((option) => option.value)
  const displayCountry = editing
    ? draft.country
    : item.serviceCountry?.trim() ||
    matchCountryFromDestination(item.destination, countryLookup) ||
    ''
  const displayDestination = editing
    ? formatDestination(draft.destination, draft.country)
    : (item.destination ?? '')
  const showDestination =
    editing ||
    Boolean(
      displayDestination.trim() &&
      displayDestination.trim().toLowerCase() !==
      displayCountry.trim().toLowerCase(),
    )
  const displayAssignedTo = editing ? draft.assignedTo : (item.assignedTo ?? '')
  const missingCountry = editing
    ? !draft.country.trim() && !draft.destination.trim()
    : setupGaps.some((gap) => gap.id === 'country')
  const missingAssignee = editing
    ? !displayAssignedTo
    : setupGaps.some((gap) => gap.id === 'assignee')
  const displayFee = editing ? parseMoneyInput(draft.serviceFee) : serviceFee
  const displayBalance = editing
    ? Math.max(0, displayFee - paidTotal)
    : item.balance
  const showDeparture =
    editing || Boolean(item.departureDate?.trim())
  const showNotes =
    editing || Boolean(item.description?.trim())
  const servicePapers = getCaseServicePapers(item)
  const selectedPaper = selectedDocId
    ? servicePapers.find((doc) => doc.id === selectedDocId) ?? null
    : null
  const ServiceIcon = iconForService(item.service)
  const boardItem = toServiceBoardItem(item)

  const startEditing = () => {
    const country =
      item.serviceCountry?.trim() ||
      matchCountryFromDestination(item.destination, [
        ...catalogCountries,
        ...(item.destination ? [item.destination] : []),
      ]) ||
      ''
    setDraft({
      status: item.status,
      country,
      destination: cityFromDestination(item.destination ?? '', country),
      assignedTo: item.assignedTo ?? '',
      departureDate: item.departureDate ?? '',
      serviceFee: serviceFee ? String(serviceFee) : '',
      description: item.description ?? '',
    })
    setEditing(true)
  }

  const finishEditing = () => {
    const nextFee = parseMoneyInput(draft.serviceFee)
    const country = draft.country.trim()
    updateCase(item.id, {
      status: draft.status,
      serviceCountry: country || undefined,
      destination: formatDestination(draft.destination, country),
      assignedTo: draft.assignedTo,
      departureDate: draft.departureDate || undefined,
      serviceFee: nextFee,
      balance: Math.max(0, nextFee - paidTotal),
      description: draft.description,
    })
    setEditing(false)
  }

  const confirmDelete = () => {
    const clientServicesPath = clientPath(item.clientId, 'services')
    try {
      const removed = deleteCase(item.id)
      setDeleteOpen(false)
      if (removed) navigate(clientServicesPath, { replace: true })
    } catch (error) {
      if (notifyIfPendingApproval(error)) {
        setDeleteOpen(false)
        navigate(clientServicesPath, { replace: true })
        return
      }
      throw error
    }
  }

  const openPaper = (docId: string) => {
    navigate(`${workDetailPath(item)}?doc=${encodeURIComponent(docId)}`)
  }

  const openServiceBoardTarget = () => {
    if (!boardItem) return
    if (boardItem.focus === 'profile') {
      navigate(clientIdentityFocusPath(item.clientId))
      return
    }
    if (boardItem.focus === 'documents') {
      const missing = servicePapers.find(
        (doc) =>
          !doc.locked && doc.required && doc.status === 'missing',
      )
      const target = missing ?? servicePapers[0]
      if (target) {
        navigate(clientServicePaperPath(item.id, item.clientId, target.id))
        return
      }
      setFlashTarget('pipeline')
      return
    }
    if (boardItem.focus === 'status') {
      if (!editing) startEditing()
      setFlashTarget('status')
      return
    }
    setFlashTarget('pipeline')
  }

  const pipelineAttention =
    boardItem &&
    (boardItem.state === 'blocked' || boardItem.state === 'on-hold')
      ? {
          state: boardItem.state,
          action: boardItem.action,
          onResolve: openServiceBoardTarget,
        }
      : null

  const serviceHeader = (
    <header className="flex flex-col">
      <div className="flex flex-wrap items-start gap-4 px-5 pt-5 pb-4">
        <span
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground"
          aria-hidden
        >
          <ServiceIcon size={16} strokeWidth={2.25} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-2.5 [flex-basis:12rem]">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="m-0 text-base font-semibold tracking-tight text-foreground">
              {item.service}
            </h2>
            <Badge variant={caseStatusShadcnVariant(displayStatus)}>
              {displayStatus}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'inline-flex h-6 max-w-full items-center gap-1 rounded-full px-2 text-[0.6875rem] font-medium leading-none',
                missingCountry
                  ? 'bg-destructive/10 text-destructive'
                  : 'bg-muted text-foreground',
              )}
            >
              {displayCountry && countryFlagEmoji(displayCountry) ? (
                <span className="text-sm leading-none" aria-hidden>
                  {countryFlagEmoji(displayCountry)}
                </span>
              ) : null}
              <span className="min-w-0 truncate">
                {displayCountry || 'Country'}
              </span>
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    'inline-flex h-6 max-w-full items-center gap-1 rounded-full border px-2 text-[0.6875rem] font-medium leading-none transition-colors',
                    'hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35',
                    missingAssignee
                      ? 'border-dashed border-destructive/45 bg-destructive/5 text-destructive'
                      : 'border-border bg-card text-foreground shadow-xs',
                  )}
                  aria-label={
                    assignedName
                      ? `Change assignee, ${assignedName}`
                      : 'Assign someone'
                  }
                >
                  <UserRound
                    size={11}
                    strokeWidth={2.25}
                    className="shrink-0"
                    aria-hidden
                  />
                  <span className="min-w-0 truncate">
                    {assignedName || 'Assign'}
                  </span>
                  <ChevronDown
                    size={11}
                    strokeWidth={2.25}
                    className="shrink-0 opacity-60"
                    aria-hidden
                  />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-48 p-1">
                <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                  Assign to
                </p>
                {employeeAssignmentOptions(employees, item.assignedTo).map(
                  (option) => {
                    const selected = item.assignedTo === option.value
                    return (
                      <DropdownMenuItem
                        key={option.value}
                        className="gap-2"
                        onSelect={() => {
                          updateCase(item.id, { assignedTo: option.value })
                        }}
                      >
                        <UserRound
                          size={14}
                          strokeWidth={2.25}
                          className="shrink-0 text-muted-foreground"
                          aria-hidden
                        />
                        <span className="min-w-0 flex-1 truncate">
                          {option.label}
                        </span>
                        {selected ? (
                          <Check
                            size={14}
                            strokeWidth={2.5}
                            className="shrink-0 text-primary"
                            aria-hidden
                          />
                        ) : null}
                      </DropdownMenuItem>
                    )
                  },
                )}
                {item.assignedTo ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onSelect={() => {
                        updateCase(item.id, { assignedTo: '' })
                      }}
                    >
                      Clear
                    </DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className="ms-auto flex flex-wrap items-center gap-4 max-md:ms-0">
          {editing ? null : (
            <PaymentMeter
              fee={serviceFee}
              paid={paidTotal}
              due={displayBalance}
            />
          )}
          {editing ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-9 rounded-lg"
                onClick={() => setEditing(false)}
              >
                Cancel
              </Button>
              <Button size="sm" className="h-9 rounded-lg" onClick={finishEditing}>
                Save
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-9 rounded-lg"
                onClick={startEditing}
              >
                <SquarePen data-icon="inline-start" />
                Edit
              </Button>
              <DropdownMenu
                onOpenChange={(open) => {
                  if (!open) setTrackingCopied(false)
                }}
              >
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    className="rounded-lg"
                    aria-label="More service actions"
                  >
                    <Ellipsis size={14} strokeWidth={2.25} aria-hidden />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    disabled={!client?.passport?.trim()}
                    onSelect={() => {
                      const passport = client?.passport?.trim()
                      if (!passport) return
                      void copyText(clientTrackingUrl(passport)).then(() => {
                        setTrackingCopied(true)
                      })
                    }}
                  >
                    {trackingCopied ? (
                      <Check size={14} strokeWidth={2.25} aria-hidden />
                    ) : (
                      <Link2 size={14} strokeWidth={2.25} aria-hidden />
                    )}
                    {trackingCopied ? 'Tracking Link Copied' : 'Copy Tracking Link'}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => {
                      setRequestTo(
                        item.status === 'Pending' ? 'In-Progress' : 'Completed',
                      )
                      setRequestRemarks('')
                      setRequestOpen(true)
                    }}
                  >
                    <ClipboardList size={14} strokeWidth={2.25} aria-hidden />
                    Request Update
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to={workInvoicePath(item)}>
                      <FileText size={14} strokeWidth={2.25} aria-hidden />
                      Invoice
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={() => setDeleteOpen(true)}
                  >
                  <Trash2 size={14} strokeWidth={2.25} aria-hidden />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            </div>
          )}
        </div>
      </div>
      {editing ? (
        <div
          aria-label="Service details"
          className="grid grid-cols-1 gap-3 px-5 py-4 sm:grid-cols-2"
        >
          <Fact attention={missingCountry}>
            <Select
              label="Country"
              searchable
              searchPlaceholder="Search countries…"
              value={draft.country}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  country: event.target.value,
                }))
              }
              options={countryOptions}
            />
          </Fact>
          {showDestination ? (
            <Fact>
              <Input
                label="City / destination"
                value={draft.destination}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    destination: event.target.value,
                  }))
                }
                placeholder="City or area"
              />
            </Fact>
          ) : null}
          <Fact attention={missingAssignee}>
            <Select
              label="Assigned to"
              searchable
              searchPlaceholder="Search employees…"
              placeholder="Select employee"
              value={draft.assignedTo}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  assignedTo: event.target.value,
                }))
              }
              options={employeeAssignmentOptions(employees, draft.assignedTo)}
            />
          </Fact>
          {showDeparture ? (
            <Fact>
              <Input
                label="Departure"
                type="date"
                value={draft.departureDate}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    departureDate: event.target.value,
                  }))
                }
              />
            </Fact>
          ) : null}
          <Fact>
            <Input
              label="Service fee"
              inputMode="numeric"
              value={draft.serviceFee}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  serviceFee: event.target.value,
                }))
              }
            />
          </Fact>
          <Fact label="Balance due" value={formatBalance(displayBalance)} />
          <Fact
            id={`case-status-field-${item.id}`}
            className={cn(flashTarget === 'status' && FOCUS_FLASH_CLASS)}
          >
            <Select
              label="Status"
              value={draft.status}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  status: event.target.value as CaseStatus,
                }))
              }
              options={CASE_STATUS_OPTIONS}
            />
          </Fact>
          {showNotes ? (
            <Fact className="sm:col-span-2">
              <Input
                label="Notes"
                value={draft.description}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
              />
            </Fact>
          ) : null}
        </div>
      ) : null}
    </header>
  )

  return (
    <>
      <article
        id={`service-file-${item.id}`}
        className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
        aria-label={serviceDetailAriaLabel(item)}
      >
        {serviceHeader}
        <div
          id={`case-pipeline-${item.id}`}
          className={cn(
            'border-t border-border px-5 py-3',
            flashTarget === 'pipeline' && FOCUS_FLASH_CLASS,
          )}
        >
          <CasePipeline
            item={item}
            embedded
            compact
            attention={pipelineAttention}
          />
        </div>
        {servicePapers.length > 0 ? (
          <div
            className={cn(
              'grid border-t border-border',
              selectedPaper && 'lg:grid-cols-[16.5rem_minmax(0,1fr)]',
            )}
          >
            <section aria-label="Papers">
              <h3 className="m-0 border-b border-border px-5 py-2.5 text-sm font-semibold">
                Papers
              </h3>
              <ul className="m-0 flex list-none flex-col p-0">
                {servicePapers.map((doc) => {
                  const active = selectedPaper?.id === doc.id
                  const tone = paperTone(
                    doc.locked,
                    documentHasFile(doc),
                    doc.required === true,
                  )
                  return (
                    <li
                      key={doc.id}
                      className="border-b border-border last:border-b-0"
                    >
                      <button
                        type="button"
                        className={cn(
                          'flex w-full items-center gap-3 px-5 py-2.5 text-left text-sm hover:bg-muted/70',
                          doc.locked && 'opacity-60',
                          active && 'bg-primary/10 font-medium',
                        )}
                        aria-current={active ? 'page' : undefined}
                        onClick={() =>
                          active
                            ? navigate(workDetailPath(item))
                            : openPaper(doc.id)
                        }
                      >
                        <span
                          className={cn(
                            'inline-flex size-4 shrink-0 items-center justify-center rounded-full',
                            tone === 'done' &&
                              'bg-emerald-500/15 text-emerald-700',
                            tone === 'need' &&
                              'bg-destructive/15 text-destructive',
                            tone === 'idle' &&
                              'bg-muted text-muted-foreground',
                          )}
                          aria-hidden
                        >
                          {tone === 'done' ? (
                            <Check size={12} strokeWidth={2.5} />
                          ) : (
                            <span className="size-1.5 rounded-full bg-current" />
                          )}
                        </span>
                        <span className="min-w-0 flex-1 truncate">{doc.name}</span>
                        <span
                          className={cn(
                            'shrink-0 text-xs text-muted-foreground',
                            tone === 'need' && 'text-destructive',
                          )}
                          aria-hidden
                        >
                          {paperStatus(tone)}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
            {selectedPaper ? (
              <div className="border-t border-border p-5 lg:border-t-0 lg:border-l">
                <DocumentWorkspace
                  key={`${item.id}:${selectedPaper.id}`}
                  document={selectedPaper}
                  caseId={item.id}
                  canEdit={
                    !selectedPaper.locked &&
                    selectedPaper.status !== 'approved'
                  }
                  locked={selectedPaper.locked}
                  hint={selectedPaper.collectionHint}
                  embedded
                />
              </div>
            ) : null}
          </div>
        ) : null}
      </article>
      <Dialog
        open={requestOpen}
        onOpenChange={(next) => {
          if (!next) setRequestOpen(false)
        }}
      >
        <DialogContent className="border border-border bg-card shadow-[var(--shadow-deep)] ring-0">
          <DialogHeader>
            <DialogTitle>Request Status Update</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <Select
              label="Move to"
              value={requestTo}
              onChange={(event) =>
                setRequestTo(event.target.value as CaseStatus)
              }
              options={CASE_STATUS_OPTIONS}
            />
            <Textarea
              label="Remarks"
              rows={3}
              value={requestRemarks}
              onChange={(event) => setRequestRemarks(event.target.value)}
            />
          </div>
          <DialogFooter className="border-0 bg-transparent">
            <Button
              type="button"
              variant="outline"
              className="h-9 rounded-lg"
              onClick={() => setRequestOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="h-9 rounded-lg"
              onClick={() => {
                submitStatusRequest({
                  subAgentId: client?.subAgentId,
                  clientId: item.clientId,
                  caseId: item.id,
                  fromStatus: item.status,
                  toStatus: requestTo,
                  remarks: requestRemarks.trim() || undefined,
                })
                setRequestOpen(false)
              }}
              disabled={requestTo === item.status}
            >
              Submit request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={confirmDelete}
        title={
          casePayments.length > 0
            ? `Delete ${item.service} and its ${casePayments.length} payment${casePayments.length === 1 ? '' : 's'}? This cannot be undone.`
            : `Delete ${item.service}? This cannot be undone.`
        }
        confirmLabel="Delete"
        confirmVariant="danger"
      />
    </>
  )
}
