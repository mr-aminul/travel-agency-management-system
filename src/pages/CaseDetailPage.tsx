import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowRight,
  Check,
  ClipboardList,
  Ellipsis,
  FileText,
  Link2,
  SquarePen,
  Trash2,
} from 'lucide-react'
import { CasePipeline } from '@/components/cases/CasePipeline'
import { getCurrentStepLabel } from '@/lib/caseChecklist'
import { formatDisplayDate } from '@/lib/formatDate'
import { serviceDetailAriaLabel } from '@/lib/serviceDisplay'
import { countMissingDocuments } from '@/lib/caseDocuments'
import { listCaseInfoGaps } from '@/lib/caseServiceRules'
import { Input, Select, Textarea } from '@/components/clients/clientShadcnFields'
import { Badge } from '@/components/shadcn/badge'
import { Button } from '@/components/shadcn/button'
import { Card, CardContent } from '@/components/shadcn/card'
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
  destinationCountryOptions,
  formatDestination,
  matchCountryFromDestination,
} from '@/lib/destinationCountries'
import { notifyIfPendingApproval } from '@/lib/notifyPendingApproval'
import { usePaymentsByCaseId } from '@/lib/paymentsStore'
import { formatBalance, getClientById } from '@/lib/clientsStore'
import { caseServiceFee, parseMoneyInput } from '@/lib/caseMoney'
import {
  toServiceBoardItem,
  type ServiceBoardFocus,
  type ServiceBoardState,
} from '@/lib/clientServiceBoard'
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
import { clientPath, workDetailPath, workInvoicePath } from '@/lib/workPaths'
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

const SERVICE_BOARD_RIBBON: Record<
  ServiceBoardState,
  { label: string; tone: 'ready' | 'blocked' | 'hold' }
> = {
  actionable: { label: 'Ready', tone: 'ready' },
  blocked: { label: 'Blocked', tone: 'blocked' },
  'on-hold': { label: 'On Hold', tone: 'hold' },
}

const RIBBON_TONE_CLASS: Record<'ready' | 'blocked' | 'hold', string> = {
  ready:
    'border-[color-mix(in_srgb,var(--color-status-completed)_28%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-status-completed)_12%,var(--color-surface))] text-foreground',
  blocked:
    'border-[color-mix(in_srgb,var(--color-danger)_32%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-danger)_10%,var(--color-surface))] text-destructive',
  hold:
    'border-[color-mix(in_srgb,var(--color-status-on-hold)_32%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-status-on-hold)_12%,var(--color-surface))] text-[var(--color-status-on-hold)]',
}

const FOCUS_FLASH_MS = 2800

function clientFocusPath(
  clientId: string,
  focus: Extract<ServiceBoardFocus, 'profile' | 'documents'>,
  caseId: string,
): string {
  const params = new URLSearchParams({
    tab: 'documents',
    focus: focus === 'profile' ? 'passport' : 'docs',
  })
  if (focus === 'documents') params.set('case', caseId)
  return `/clients/${clientId}?${params.toString()}`
}

function formatDate(value?: string): string {
  return formatDisplayDate(value)
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

export default function CaseDetailPage() {
  const { id: clientId = '', caseId = '' } = useParams()
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
  const [flashTarget, setFlashTarget] = useState<'status' | 'pipeline' | null>(
    null,
  )

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
    if (!flashTarget) return
    const id =
      flashTarget === 'status' ? 'case-status-field' : 'case-pipeline'
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

  if (!item) {
    return <Navigate to={clientPath(clientId, 'services')} replace />
  }

  if (item.clientId !== clientId) {
    return <Navigate to={workDetailPath(item)} replace />
  }

  const missingDocs = countMissingDocuments(item)
  const setupGaps = listCaseInfoGaps(item)
  const paidTotal = casePayments.reduce((sum, payment) => sum + payment.amount, 0)
  const serviceFee = caseServiceFee(item, paidTotal)
  const assignedName = getEmployeeDisplayName(item.assignedTo)
  const currentLabel = getCurrentStepLabel(item)
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
  const showDocuments = editing || missingDocs > 0
  const showNotes =
    editing || Boolean(item.description?.trim())
  const ServiceIcon = iconForService(item.service)
  const boardItem = toServiceBoardItem(item)
  const ribbon = boardItem ? SERVICE_BOARD_RIBBON[boardItem.state] : null

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

  const openServiceBoardTarget = () => {
    if (!boardItem) return
    if (boardItem.focus === 'profile' || boardItem.focus === 'documents') {
      navigate(clientFocusPath(item.clientId, boardItem.focus, item.id))
      return
    }
    if (boardItem.focus === 'status') {
      if (!editing) startEditing()
      setFlashTarget('status')
      return
    }
    setFlashTarget('pipeline')
  }

  const serviceHeader = (
    <header className="flex flex-wrap items-center gap-3">
      <span
        className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground"
        aria-hidden
      >
        <ServiceIcon size={16} strokeWidth={2.25} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 [flex-basis:12rem]">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="m-0 text-base font-semibold tracking-tight text-foreground">
            {item.service}
          </h2>
          <Badge variant={caseStatusShadcnVariant(displayStatus)}>
            {displayStatus}
          </Badge>
        </div>
        <p className="m-0 text-xs text-muted-foreground">{item.caseId}</p>
      </div>
      <div className="ms-auto flex flex-wrap items-center gap-2 max-md:ms-0">
        {editing ? (
          <>
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
          </>
        ) : (
          <>
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
          </>
        )}
      </div>
    </header>
  )

  return (
    <div
      className="flex flex-col gap-3"
      aria-label={serviceDetailAriaLabel(item)}
    >
      {ribbon && boardItem ? (
        <button
          type="button"
          className={cn(
            'flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left font-[inherit] transition-[filter] hover:brightness-[0.98]',
            RIBBON_TONE_CLASS[ribbon.tone],
          )}
          onClick={openServiceBoardTarget}
        >
          <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-1">
            <strong className="text-sm font-semibold">{ribbon.label}</strong>
            <span className="text-sm">{boardItem.action}</span>
          </span>
          <ArrowRight size={16} strokeWidth={2.25} aria-hidden />
        </button>
      ) : null}
      {serviceHeader}
      <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-2">
        <Card
          className="min-w-0 gap-0 border border-border bg-card py-4 shadow-sm ring-0"
          aria-label="Service details"
        >
          <CardContent className="px-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Fact attention={missingCountry}>
                {editing ? (
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
                ) : (
                  <Input
                    label="Country"
                    value={displayCountry || '-'}
                    readOnly
                    tabIndex={-1}
                  />
                )}
              </Fact>
              {showDestination ? (
                <Fact>
                  {editing ? (
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
                  ) : (
                    <Input
                      label="Destination"
                      value={displayDestination || '-'}
                      readOnly
                      tabIndex={-1}
                    />
                  )}
                </Fact>
              ) : null}
              {showDeparture ? (
                <Fact>
                  {editing ? (
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
                  ) : (
                    <Input
                      label="Departure"
                      value={formatDate(item.departureDate)}
                      readOnly
                      tabIndex={-1}
                    />
                  )}
                </Fact>
              ) : null}
              <Fact label="Current step" value={currentLabel} />
              <Fact attention={missingAssignee}>
                {editing ? (
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
                    options={employeeAssignmentOptions(
                      employees,
                      draft.assignedTo,
                    )}
                  />
                ) : (
                  <Input
                    label="Assigned to"
                    value={assignedName || '-'}
                    readOnly
                    tabIndex={-1}
                  />
                )}
              </Fact>
              <Fact>
                {editing ? (
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
                ) : (
                  <Input
                    label="Service fee"
                    value={formatBalance(serviceFee)}
                    readOnly
                    tabIndex={-1}
                  />
                )}
              </Fact>
              <Fact
                label="Balance due"
                value={formatBalance(displayBalance)}
              />
              {showDocuments ? (
                <Fact
                  label="Documents"
                  value={
                    missingDocs > 0 ? `${missingDocs} needed` : 'Complete'
                  }
                  attention={missingDocs > 0}
                />
              ) : null}
              {editing ? (
                <Fact
                  id="case-status-field"
                  className={cn(
                    flashTarget === 'status' && FOCUS_FLASH_CLASS,
                  )}
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
              ) : null}
              {showNotes ? (
                <Fact className="sm:col-span-2">
                  {editing ? (
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
                  ) : (
                    <Input
                      label="Notes"
                      value={item.description?.trim() || '-'}
                      readOnly
                      tabIndex={-1}
                    />
                  )}
                </Fact>
              ) : null}
            </div>
          </CardContent>
        </Card>
        <div
          id="case-pipeline"
          className={cn(
            'min-w-0 lg:sticky lg:top-0 lg:self-start',
            flashTarget === 'pipeline' && FOCUS_FLASH_CLASS,
          )}
        >
          <CasePipeline item={item} />
        </div>
      </div>
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
    </div>
  )
}
