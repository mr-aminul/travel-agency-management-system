import { useEffect, useRef, useState } from 'react'
import { CalendarClock, Folder, Flag, Plus, UserRound } from 'lucide-react'
import {
  ServiceFileActionsMenu,
  ServiceFileCard,
  type ServiceFileActionsApi,
} from '@/components/cases/ServiceFileCard'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/shadcn/accordion'
import { Badge } from '@/components/shadcn/badge'
import { Button } from '@/components/shadcn/button'
import { Card, CardContent } from '@/components/shadcn/card'
import {
  Empty,
  EmptyContent,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/shadcn/empty'
import { caseServiceFee } from '@/lib/caseMoney'
import { formatBalance } from '@/lib/clientsStore'
import {
  countryFlagEmoji,
  destinationCountryOptions,
  matchCountryFromDestination,
} from '@/lib/destinationCountries'
import { getEmployeeDisplayName, useEmployees } from '@/lib/employeesStore'
import { usePaymentsByClientId } from '@/lib/paymentsStore'
import { formatDisplayDate } from '@/lib/formatDate'
import { flashAndReveal } from '@/lib/scrollWithin'
import {
  isWorkDueOverdue,
  servicePriority,
} from '@/lib/servicePriority'
import { useServiceIconOverrides } from '@/lib/serviceIconOverridesStore'
import { iconForService } from '@/lib/serviceIcons'
import { workInvoicePath } from '@/lib/workPaths'
import { cn } from '@/lib/utils'
import type { Case, CaseStatus, ServicePriority } from '@/types/case'
import type { Client } from '@/types/client'

export type ClientServicesWorkspaceProps = {
  client: Client
  cases: Case[]
  /** Deep-linked service file id (from the route). */
  selectedId?: string
  /** Open paper under the selected service (`?doc=`). */
  selectedDocId?: string | null
  onAddService: () => void
  /**
   * `stack` = every card (Clients v1).
   * `focus` = accordion list like Profile (Clients v3).
   */
  layout?: 'stack' | 'focus'
  onSelectService?: (caseId: string) => void
  onClearService?: () => void
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
  const percent = safeFee > 0 ? Math.round((safePaid / safeFee) * 100) : 0
  const settled = safeDue <= 0 && safeFee > 0
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
        {formatBalance(safeFee <= 0 ? 0 : safePaid)}
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
        {formatBalance(safeFee <= 0 ? 0 : safeDue)}
      </span>
    </div>
  )
}

function serviceCountryLabel(item: Case) {
  return (
    item.serviceCountry?.trim() ||
    matchCountryFromDestination(
      item.destination,
      destinationCountryOptions().map((option) => option.value),
    ) ||
    ''
  )
}

function ServiceAccordionTrigger({
  item,
  paidTotal,
}: {
  item: Case
  paidTotal: number
}) {
  const ServiceIcon = iconForService(item.service)
  const serviceFee = caseServiceFee(item, paidTotal)
  const due = Math.max(0, item.balance)
  const assignedName = getEmployeeDisplayName(item.assignedTo)
  const displayCountry = serviceCountryLabel(item)
  const priority = servicePriority(item)
  const dueOverdue = isWorkDueOverdue(item)

  return (
    <span className="flex min-w-0 flex-1 flex-wrap items-center gap-2.5">
      <span
        className="inline-flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground transition-colors group-hover/accordion-trigger:text-foreground"
        aria-hidden
      >
        <ServiceIcon size={14} strokeWidth={2.25} />
      </span>
      <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1.5">
        <span className="truncate text-sm font-semibold tracking-tight text-foreground">
          {item.service}
        </span>
        <Badge
          variant={caseStatusShadcnVariant(item.status)}
          className="h-5 px-1.5 text-[0.625rem]"
        >
          {item.status}
        </Badge>
        <Badge
          variant={priorityBadgeVariant(priority)}
          className="h-5 gap-1 px-1.5 text-[0.625rem]"
        >
          <Flag size={10} strokeWidth={2.25} aria-hidden />
          {priority}
        </Badge>
        {item.dueDate?.trim() ? (
          <span
            className={cn(
              'inline-flex h-5 max-w-full items-center gap-1 rounded-full px-1.5 text-[0.625rem] font-medium leading-none',
              dueOverdue
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
              {formatDisplayDate(item.dueDate)}
            </span>
          </span>
        ) : null}
        {displayCountry ? (
          <span className="inline-flex h-5 max-w-full items-center gap-1 rounded-full bg-muted px-1.5 text-[0.625rem] font-medium leading-none text-foreground">
            {countryFlagEmoji(displayCountry) ? (
              <span className="text-xs leading-none" aria-hidden>
                {countryFlagEmoji(displayCountry)}
              </span>
            ) : null}
            <span className="min-w-0 truncate">{displayCountry}</span>
          </span>
        ) : null}
        {assignedName ? (
          <span className="inline-flex h-5 max-w-full items-center gap-1 rounded-full border border-border bg-card px-1.5 text-[0.625rem] font-medium leading-none text-foreground shadow-xs">
            <UserRound
              size={10}
              strokeWidth={2.25}
              className="shrink-0"
              aria-hidden
            />
            <span className="min-w-0 truncate">{assignedName}</span>
          </span>
        ) : null}
      </span>
      <span className="ms-auto max-md:ms-0">
        <PaymentMeter fee={serviceFee} paid={paidTotal} due={due} />
      </span>
    </span>
  )
}

export function ClientServicesWorkspace({
  client,
  cases,
  selectedId,
  selectedDocId = null,
  onAddService,
  layout = 'stack',
  onSelectService,
}: ClientServicesWorkspaceProps) {
  useServiceIconOverrides()
  useEmployees()
  const clientPayments = usePaymentsByClientId(client.id)
  type CaseAction = keyof Pick<
    ServiceFileActionsApi,
    'startEditing' | 'copyTrackingLink' | 'openRequestUpdate' | 'openDelete'
  >

  const actionsByCaseRef = useRef(new Map<string, ServiceFileActionsApi>())
  const pendingActionRef = useRef(new Map<string, CaseAction>())
  const [openSections, setOpenSections] = useState<string[]>(() =>
    selectedId ? [selectedId] : cases.map((item) => item.id),
  )
  const previousSelectedIdRef = useRef(selectedId)

  const ensureCaseOpen = (caseId: string) => {
    setOpenSections((current) =>
      current.includes(caseId) ? current : [...current, caseId],
    )
  }

  const runCaseAction = (caseId: string, action: CaseAction) => {
    ensureCaseOpen(caseId)
    const api = actionsByCaseRef.current.get(caseId)
    if (api) {
      api[action]()
      return
    }
    pendingActionRef.current.set(caseId, action)
  }

  const provideCaseActions = (
    caseId: string,
    api: ServiceFileActionsApi | null,
  ) => {
    if (api) {
      actionsByCaseRef.current.set(caseId, api)
      const pending = pendingActionRef.current.get(caseId)
      if (pending) {
        pendingActionRef.current.delete(caseId)
        api[pending]()
      }
      return
    }
    actionsByCaseRef.current.delete(caseId)
  }

  const openCaseForEdit = (caseId: string) => {
    onSelectService?.(caseId)
    runCaseAction(caseId, 'startEditing')
  }

  useEffect(() => {
    // Deep-link / external select: open that section once. Do not re-open after
    // the user collapses it while the same id stays selected.
    const previousSelectedId = previousSelectedIdRef.current
    previousSelectedIdRef.current = selectedId
    if (!selectedId || selectedId === previousSelectedId) return
    setOpenSections((current) =>
      current.includes(selectedId) ? current : [...current, selectedId],
    )
  }, [selectedId])

  useEffect(() => {
    if (!selectedId) return
    const frame = window.requestAnimationFrame(() => {
      flashAndReveal(`service-file-${selectedId}`)
    })
    return () => window.cancelAnimationFrame(frame)
  }, [selectedId, selectedDocId])

  const handleOpenChange = (next: string[]) => {
    const previous = openSections
    setOpenSections(next)

    const opened = next.find((id) => !previous.includes(id))
    if (opened) onSelectService?.(opened)
  }

  return (
    <section
      id="client-services"
      className="flex min-w-0 flex-col gap-3"
      aria-label={`${client.name} services`}
    >
      {cases.length === 0 ? (
        <div className="pd-client-elevated-panel overflow-hidden rounded-xl">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Folder />
              </EmptyMedia>
              <EmptyTitle>No Services Yet</EmptyTitle>
            </EmptyHeader>
            <EmptyContent>
              <Button
                type="button"
                className="h-9 rounded-lg"
                onClick={onAddService}
              >
                <Plus data-icon="inline-start" />
                Add Service
              </Button>
            </EmptyContent>
          </Empty>
        </div>
      ) : layout === 'focus' ? (
        <>
          <Card
            size="sm"
            className="pd-client-elevated-panel gap-0 overflow-hidden border-border py-0 shadow-[var(--shadow-card)] ring-0"
          >
            <CardContent className="p-0">
              <Accordion
                type="multiple"
                value={openSections}
                onValueChange={handleOpenChange}
              >
                {cases.map((item) => {
                  const paidTotal = clientPayments
                    .filter((payment) => payment.caseId === item.id)
                    .reduce((sum, payment) => sum + payment.amount, 0)
                  return (
                    <AccordionItem
                      key={item.id}
                      value={item.id}
                      className="border-border"
                    >
                      <AccordionTrigger
                        className="rounded-none bg-card py-2.5 ps-3.5 pe-2 text-sm font-semibold tracking-tight transition-colors hover:bg-muted/40 hover:no-underline"
                        actions={
                          <ServiceFileActionsMenu
                            canCopyTracking={Boolean(client.passport?.trim())}
                            onEdit={() => openCaseForEdit(item.id)}
                            onCopyTracking={() =>
                              runCaseAction(item.id, 'copyTrackingLink')
                            }
                            onRequestUpdate={() =>
                              runCaseAction(item.id, 'openRequestUpdate')
                            }
                            invoicePath={workInvoicePath(item)}
                            onDelete={() =>
                              runCaseAction(item.id, 'openDelete')
                            }
                          />
                        }
                      >
                        <ServiceAccordionTrigger
                          item={item}
                          paidTotal={paidTotal}
                        />
                      </AccordionTrigger>
                      <AccordionContent className="pb-0 [&_a]:no-underline">
                        <ServiceFileCard
                          caseId={item.id}
                          selectedDocId={
                            selectedId === item.id ? selectedDocId : null
                          }
                          embedded
                          onProvideActions={(api) =>
                            provideCaseActions(item.id, api)
                          }
                        />
                      </AccordionContent>
                    </AccordionItem>
                  )
                })}
              </Accordion>
            </CardContent>
          </Card>
          <Button
            type="button"
            variant="outline"
            className="h-9 w-full justify-center rounded-xl border-dashed shadow-none"
            onClick={onAddService}
          >
            <Plus data-icon="inline-start" />
            Add Service
          </Button>
        </>
      ) : (
        <>
          {cases.map((item) => (
            <ServiceFileCard
              key={item.id}
              caseId={item.id}
              selectedDocId={selectedId === item.id ? selectedDocId : null}
            />
          ))}
          <Button
            type="button"
            variant="outline"
            className="h-9 w-full justify-center rounded-xl border-dashed shadow-none"
            onClick={onAddService}
          >
            <Plus data-icon="inline-start" />
            Add Service
          </Button>
        </>
      )}
    </section>
  )
}
