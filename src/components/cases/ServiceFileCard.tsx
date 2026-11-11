import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  CalendarClock,
  Check,
  ChevronDown,
  ClipboardList,
  Ellipsis,
  FileText,
  Flag,
  Link2,
  SquarePen,
  Trash2,
  UserRound,
} from 'lucide-react'
import { ServiceTaskWorkspace } from '@/components/cases/ServiceTaskWorkspace'
import { serviceDetailAriaLabel } from '@/lib/serviceDisplay'
import { getCaseServicePapers } from '@/lib/clientDocuments'
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
import { formatDisplayDate } from '@/lib/formatDate'
import {
  isWorkDueOverdue,
  servicePriority,
} from '@/lib/servicePriority'
import { flashAndReveal } from '@/lib/scrollWithin'
import {
  clientDeskBaseFromPath,
  deskClientPath,
  deskIdentityFocusPath,
  deskServicePaperPath,
  workInvoicePath,
} from '@/lib/workPaths'
import { clientTrackingUrl } from '@/lib/publicUrl'
import { cn } from '@/lib/utils'
import {
  SERVICE_PRIORITY_OPTIONS,
  type CaseStatus,
  type ServicePriority,
} from '@/types/case'

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

function priorityBadgeVariant(
  priority: ServicePriority,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (priority === 'Urgent') return 'destructive'
  if (priority === 'High') return 'default'
  if (priority === 'Low') return 'secondary'
  return 'outline'
}

const FOCUS_FLASH_MS = 2800

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
      className="flex min-w-[9rem] max-w-[12rem] items-center gap-1.5"
      aria-label={
        safeFee <= 0
          ? 'No service fee set'
          : settled
            ? `Paid in full, ${formatBalance(safeFee)}`
            : `${formatBalance(safePaid)} paid, ${formatBalance(safeDue)} due of ${formatBalance(safeFee)}`
      }
    >
      <span className="shrink-0 text-[0.6875rem] tabular-nums text-muted-foreground">
        {left}
      </span>
      <div
        className="h-[0.25rem] min-w-8 flex-1 overflow-hidden rounded-full bg-border"
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
          'shrink-0 text-[0.6875rem] tabular-nums',
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

export type ServiceFileActionsApi = {
  startEditing: () => void
  copyTrackingLink: () => void
  openRequestUpdate: () => void
  openDelete: () => void
  canCopyTracking: boolean
  invoicePath: string
}

export function ServiceFileActionsMenu({
  canCopyTracking,
  onEdit,
  onCopyTracking,
  onRequestUpdate,
  invoicePath,
  onDelete,
  className,
}: {
  canCopyTracking: boolean
  onEdit?: () => void
  onCopyTracking: () => void
  onRequestUpdate: () => void
  invoicePath: string
  onDelete: () => void
  className?: string
}) {
  const [trackingCopied, setTrackingCopied] = useState(false)

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (!open) setTrackingCopied(false)
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon-sm"
          className={cn('size-8 shrink-0 rounded-lg', className)}
          aria-label="More service actions"
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <Ellipsis size={14} strokeWidth={2.25} aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-auto min-w-max"
        onClick={(event) => event.stopPropagation()}
      >
        {onEdit ? (
          <DropdownMenuItem
            className="whitespace-nowrap"
            onSelect={onEdit}
          >
            <SquarePen size={14} strokeWidth={2.25} aria-hidden />
            Edit
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem
          disabled={!canCopyTracking}
          className="whitespace-nowrap"
          onSelect={() => {
            onCopyTracking()
            setTrackingCopied(true)
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
          className="whitespace-nowrap"
          onSelect={onRequestUpdate}
        >
          <ClipboardList size={14} strokeWidth={2.25} aria-hidden />
          Request Update
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to={invoicePath}>
            <FileText size={14} strokeWidth={2.25} aria-hidden />
            Invoice
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={onDelete}>
          <Trash2 size={14} strokeWidth={2.25} aria-hidden />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export type ServiceFileCardProps = {
  caseId: string
  /** Open paper id for this file only. */
  selectedDocId?: string | null
  /** Flush into a parent accordion / card — no outer chrome. */
  embedded?: boolean
  /** Accordion header hosts the menu; card still owns edit/dialogs. */
  onProvideActions?: (api: ServiceFileActionsApi | null) => void
}

export function ServiceFileCard({
  caseId,
  selectedDocId = null,
  embedded = false,
  onProvideActions,
}: ServiceFileCardProps) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const deskBase = clientDeskBaseFromPath(pathname)
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
    priority: 'Normal' as ServicePriority,
    dueDate: '',
    departureDate: '',
    serviceFee: '',
    description: '',
  })
  const [requestOpen, setRequestOpen] = useState(false)
  const [requestTo, setRequestTo] = useState<CaseStatus>('In-Progress')
  const [requestRemarks, setRequestRemarks] = useState('')
  const [deleteOpen, setDeleteOpen] = useState(false)
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

  const actionsApiRef = useRef<ServiceFileActionsApi | null>(null)
  const onProvideActionsRef = useRef(onProvideActions)
  onProvideActionsRef.current = onProvideActions

  useEffect(() => {
    const provide = onProvideActionsRef.current
    if (!provide) return
    provide({
      startEditing: () => actionsApiRef.current?.startEditing(),
      copyTrackingLink: () => actionsApiRef.current?.copyTrackingLink(),
      openRequestUpdate: () => actionsApiRef.current?.openRequestUpdate(),
      openDelete: () => actionsApiRef.current?.openDelete(),
      get canCopyTracking() {
        return actionsApiRef.current?.canCopyTracking ?? false
      },
      get invoicePath() {
        return actionsApiRef.current?.invoicePath ?? ''
      },
    })
    return () => onProvideActionsRef.current?.(null)
  }, [caseId])

  if (!item) return null

  const setupGaps = listCaseInfoGaps(item)
  const paidTotal = casePayments.reduce((sum, payment) => sum + payment.amount, 0)
  const serviceFee = caseServiceFee(item, paidTotal)
  const assignedName = getEmployeeDisplayName(item.assignedTo)
  const displayPriority = editing
    ? draft.priority
    : servicePriority(item)
  const displayDueDate = editing ? draft.dueDate : (item.dueDate ?? '')
  const workDueOverdue =
    !editing && isWorkDueOverdue(item)
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
  const showDueDate = editing || Boolean(item.dueDate?.trim())
  const showNotes =
    editing || Boolean(item.description?.trim())
  const servicePapers = getCaseServicePapers(item)
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
      priority: servicePriority(item),
      dueDate: item.dueDate ?? '',
      departureDate: item.departureDate ?? '',
      serviceFee: serviceFee ? String(serviceFee) : '',
      description: item.description ?? '',
    })
    setEditing(true)
  }

  const copyTrackingLink = () => {
    const passport = client?.passport?.trim()
    if (!passport) return
    void copyText(clientTrackingUrl(passport))
  }

  const openRequestUpdate = () => {
    setRequestTo(item.status === 'Pending' ? 'In-Progress' : 'Completed')
    setRequestRemarks('')
    setRequestOpen(true)
  }

  actionsApiRef.current = {
    startEditing,
    copyTrackingLink,
    openRequestUpdate,
    openDelete: () => setDeleteOpen(true),
    canCopyTracking: Boolean(client?.passport?.trim()),
    invoicePath: workInvoicePath(item),
  }

  const finishEditing = () => {
    const nextFee = parseMoneyInput(draft.serviceFee)
    const country = draft.country.trim()
    updateCase(item.id, {
      status: draft.status,
      serviceCountry: country || undefined,
      destination: formatDestination(draft.destination, country),
      assignedTo: draft.assignedTo,
      priority: draft.priority,
      dueDate: draft.dueDate || undefined,
      departureDate: draft.departureDate || undefined,
      serviceFee: nextFee,
      balance: Math.max(0, nextFee - paidTotal),
      description: draft.description,
    })
    setEditing(false)
  }

  const confirmDelete = () => {
    const clientServicesPath = deskClientPath(deskBase, item.clientId, 'services')
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
    if (boardItem.focus === 'profile') {
      navigate(deskIdentityFocusPath(deskBase, item.clientId))
      return
    }
    if (boardItem.focus === 'documents') {
      const missing = servicePapers.find(
        (doc) =>
          !doc.locked && doc.required && doc.status === 'missing',
      )
      const target = missing ?? servicePapers[0]
      if (target) {
        navigate(
          deskServicePaperPath(deskBase, item.id, item.clientId, target.id),
        )
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

  const showEmbeddedToolbar = editing || Boolean(pipelineAttention)

  const serviceHeader =
    embedded && !showEmbeddedToolbar ? null : (
    <header className="flex flex-col">
      <div className="flex flex-wrap items-center gap-2.5 px-4 py-2.5">
        {embedded ? null : (
          <>
            <span
              className="inline-flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-foreground"
              aria-hidden
            >
              <ServiceIcon size={14} strokeWidth={2.25} />
            </span>
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1.5">
              <h2 className="m-0 text-sm font-semibold tracking-tight text-foreground">
                {item.service}
              </h2>
              <Badge
                variant={caseStatusShadcnVariant(displayStatus)}
                className="h-5 px-1.5 text-[0.625rem]"
              >
                {displayStatus}
              </Badge>
              <span
                className={cn(
                  'inline-flex h-5 max-w-full items-center gap-1 rounded-full px-1.5 text-[0.625rem] font-medium leading-none',
                  missingCountry
                    ? 'bg-destructive/10 text-destructive'
                    : 'bg-muted text-foreground',
                )}
              >
                {displayCountry && countryFlagEmoji(displayCountry) ? (
                  <span className="text-xs leading-none" aria-hidden>
                    {countryFlagEmoji(displayCountry)}
                  </span>
                ) : null}
                <span className="min-w-0 truncate">
                  {displayCountry || 'Country'}
                </span>
              </span>
              <Badge
                variant={priorityBadgeVariant(displayPriority)}
                className="h-5 gap-1 px-1.5 text-[0.625rem]"
              >
                <Flag size={10} strokeWidth={2.25} aria-hidden />
                {displayPriority}
              </Badge>
              {displayDueDate ? (
                <span
                  className={cn(
                    'inline-flex h-5 max-w-full items-center gap-1 rounded-full px-1.5 text-[0.625rem] font-medium leading-none',
                    workDueOverdue
                      ? 'bg-destructive/10 text-destructive'
                      : 'bg-muted text-foreground',
                  )}
                >
                  <CalendarClock
                    size={10}
                    strokeWidth={2.25}
                    className="shrink-0"
                    aria-hidden
                  />
                  <span className="min-w-0 truncate">
                    {formatDisplayDate(displayDueDate)}
                  </span>
                </span>
              ) : null}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      'inline-flex h-5 max-w-full items-center gap-1 rounded-full border px-1.5 text-[0.625rem] font-medium leading-none transition-colors',
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
                      size={10}
                      strokeWidth={2.25}
                      className="shrink-0"
                      aria-hidden
                    />
                    <span className="min-w-0 truncate">
                      {assignedName || 'Assign'}
                    </span>
                    <ChevronDown
                      size={10}
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
          </>
        )}
        <div
          className={cn(
            'flex flex-wrap items-center gap-2.5',
            embedded ? 'ms-auto w-full justify-end' : 'ms-auto max-md:ms-0',
          )}
        >
          {editing || embedded ? null : (
            <PaymentMeter
              fee={serviceFee}
              paid={paidTotal}
              due={displayBalance}
            />
          )}
          {editing ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-lg"
                onClick={() => setEditing(false)}
              >
                Cancel
              </Button>
              <Button size="sm" className="h-8 rounded-lg" onClick={finishEditing}>
                Save
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-1.5">
              {pipelineAttention ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={cn(
                    'h-8 max-w-[12rem] rounded-lg',
                    pipelineAttention.state === 'blocked' &&
                      'border-destructive/40 text-destructive hover:bg-destructive/5 hover:text-destructive',
                    pipelineAttention.state === 'on-hold' &&
                      'border-[color-mix(in_srgb,var(--color-status-on-hold)_40%,var(--color-border))] text-[var(--color-status-on-hold)] hover:bg-[color-mix(in_srgb,var(--color-status-on-hold)_8%,var(--color-surface))]',
                  )}
                  title={pipelineAttention.action}
                  onClick={pipelineAttention.onResolve}
                >
                  <span className="truncate">
                    {pipelineAttention.state === 'blocked'
                      ? 'Blocked'
                      : 'On Hold'}
                  </span>
                </Button>
              ) : null}
              {embedded ? null : (
                <ServiceFileActionsMenu
                  canCopyTracking={Boolean(client?.passport?.trim())}
                  onEdit={startEditing}
                  onCopyTracking={copyTrackingLink}
                  onRequestUpdate={openRequestUpdate}
                  invoicePath={workInvoicePath(item)}
                  onDelete={() => setDeleteOpen(true)}
                />
              )}
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
          <Fact>
            <Select
              label="Priority"
              value={draft.priority}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  priority: event.target.value as ServicePriority,
                }))
              }
              options={SERVICE_PRIORITY_OPTIONS}
            />
          </Fact>
          {showDueDate ? (
            <Fact>
              <Input
                label="Due date"
                type="date"
                value={draft.dueDate}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    dueDate: event.target.value,
                  }))
                }
              />
            </Fact>
          ) : null}
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
        className={cn(
          'overflow-hidden bg-[var(--color-surface-raised,var(--card))]',
          embedded
            ? 'border-t border-border/70'
            : 'rounded-xl border border-border shadow-[var(--shadow-card)]',
        )}
        aria-label={serviceDetailAriaLabel(item)}
      >
        {serviceHeader}
        <div
          id={`case-pipeline-${item.id}`}
          className={cn(flashTarget === 'pipeline' && FOCUS_FLASH_CLASS)}
        >
          <ServiceTaskWorkspace
            item={item}
            selectedDocId={selectedDocId}
          />
        </div>
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
