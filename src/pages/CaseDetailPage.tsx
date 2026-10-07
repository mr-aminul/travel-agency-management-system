import { useEffect, useState, type ReactNode } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { Check, ClipboardList, FileText, Link2, SquarePen } from 'lucide-react'
import { CasePipeline } from '@/components/cases/CasePipeline'
import {
  Badge,
  Button,
  EmptyState,
  Input,
  Modal,
  Select,
  Textarea,
  type BadgeVariant,
} from '@/components/ui'
import { getCurrentStepLabel } from '@/lib/caseChecklist'
import { formatDisplayDate } from '@/lib/formatDate'
import { serviceDetailAriaLabel } from '@/lib/serviceDisplay'
import { countMissingDocuments } from '@/lib/caseDocuments'
import {
  CASE_STATUS_OPTIONS,
  getCaseById,
  updateCase,
  useCases,
} from '@/lib/casesStore'
import { usePaymentsByCaseId } from '@/lib/paymentsStore'
import { formatBalance, getClientById } from '@/lib/clientsStore'
import { caseServiceFee, parseMoneyInput } from '@/lib/caseMoney'
import {
  employeeAssignmentOptions,
  getEmployeeDisplayName,
  useEmployees,
} from '@/lib/employeesStore'
import { submitStatusRequest } from '@/lib/requestsStore'
import { useServiceIconOverrides } from '@/lib/serviceIconOverridesStore'
import { iconForService } from '@/lib/serviceIcons'
import { clientPath, workDetailPath, workInvoicePath } from '@/lib/workPaths'
import { clientTrackingUrl } from '@/lib/publicUrl'
import type { CaseStatus } from '@/types/case'
import '@/styles/layout-cases.css'

function statusBadgeVariant(status: CaseStatus): BadgeVariant {
  if (status === 'Completed') return 'completed'
  if (status === 'Pending') return 'pending'
  if (status === 'In-Progress') return 'in-progress'
  if (status === 'On-Hold') return 'on-hold'
  return 'danger'
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
}: {
  label: string
  value: ReactNode
}) {
  return (
    <div className="pd-case-detail__fact">
      <span className="pd-case-detail__fact-label">{label}</span>
      <span className="pd-case-detail__fact-value">{value}</span>
    </div>
  )
}

export default function CaseDetailPage() {
  const { id: clientId = '', caseId = '' } = useParams()
  useCases()
  useServiceIconOverrides()
  const item = getCaseById(caseId)
  const casePayments = usePaymentsByCaseId(caseId)
  const employees = useEmployees()
  const client = item ? getClientById(item.clientId) : undefined
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({
    status: 'Pending' as CaseStatus,
    destination: '',
    assignedTo: '',
    departureDate: '',
    serviceFee: '',
    description: '',
  })
  const [requestOpen, setRequestOpen] = useState(false)
  const [requestTo, setRequestTo] = useState<CaseStatus>('In-Progress')
  const [requestRemarks, setRequestRemarks] = useState('')
  const [trackingCopied, setTrackingCopied] = useState(false)

  useEffect(() => {
    setEditing(false)
    setRequestOpen(false)
    setTrackingCopied(false)
  }, [caseId])

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
  const paidTotal = casePayments.reduce((sum, payment) => sum + payment.amount, 0)
  const serviceFee = caseServiceFee(item, paidTotal)
  const assignedName = getEmployeeDisplayName(item.assignedTo)
  const currentLabel = getCurrentStepLabel(item)
  const displayStatus = editing ? draft.status : item.status
  const ServiceIcon = iconForService(item.service)

  const startEditing = () => {
    setDraft({
      status: item.status,
      destination: item.destination ?? '',
      assignedTo: item.assignedTo ?? '',
      departureDate: item.departureDate ?? '',
      serviceFee: serviceFee ? String(serviceFee) : '',
      description: item.description ?? '',
    })
    setEditing(true)
  }

  const finishEditing = () => {
    const nextFee = parseMoneyInput(draft.serviceFee)
    updateCase(item.id, {
      status: draft.status,
      destination: draft.destination,
      assignedTo: draft.assignedTo,
      departureDate: draft.departureDate || undefined,
      serviceFee: nextFee,
      balance: Math.max(0, nextFee - paidTotal),
      description: draft.description,
    })
    setEditing(false)
  }

  const serviceHeader = (
    <header
      className={
        editing
          ? 'pd-case-detail__header is-editing'
          : 'pd-case-detail__header'
      }
    >
      <span className="pd-case-detail__header-icon" aria-hidden>
        <ServiceIcon size={18} strokeWidth={2.25} />
      </span>
      <div className="pd-case-detail__header-text">
        <div className="pd-case-detail__title-row">
          <h2 className="pd-case-detail__name">{item.service}</h2>
          <Badge variant={statusBadgeVariant(displayStatus)}>
            {displayStatus}
          </Badge>
        </div>
        <p className="pd-case-detail__client-line">
          <span>{item.caseId}</span>
        </p>
      </div>

      <div className="pd-case-detail__header-actions">
        {editing ? (
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setEditing(false)}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={finishEditing}>
              Save
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="secondary"
              size="sm"
              className="pd-btn--icon"
              aria-label={
                trackingCopied
                  ? 'Tracking link copied'
                  : client?.passport.trim()
                    ? 'Copy tracking link'
                    : 'Add a passport number to share tracking'
              }
              title={
                trackingCopied
                  ? 'Copied'
                  : client?.passport.trim()
                    ? 'Copy tracking link'
                    : 'Add a passport number to share tracking'
              }
              disabled={!client?.passport.trim()}
              onClick={() => {
                const passport = client?.passport.trim()
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
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setRequestTo(
                  item.status === 'Pending' ? 'In-Progress' : 'Completed',
                )
                setRequestRemarks('')
                setRequestOpen(true)
              }}
            >
              <ClipboardList size={14} strokeWidth={2.25} aria-hidden />
              Request update
            </Button>
            <Link
              to={workInvoicePath(item)}
              className="pd-btn pd-btn--secondary pd-btn--sm"
            >
              <FileText size={14} strokeWidth={2.25} aria-hidden />
              Invoice
            </Link>
            <Button
              variant="secondary"
              size="sm"
              onClick={startEditing}
            >
              <SquarePen size={14} strokeWidth={2.25} aria-hidden />
              Edit
            </Button>
          </>
        )}
      </div>
    </header>
  )

  return (
    <div
      className="pd-case-detail pd-case-detail--workspace"
      aria-label={serviceDetailAriaLabel(item)}
    >
      {serviceHeader}
      <div className="pd-case-detail__overview">
        <section
          className="pd-case-detail__sheet"
          aria-label="Service details"
        >
          {editing ? (
            <div className="pd-cases-form__grid">
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
              <Input
                label="Destination"
                value={draft.destination}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    destination: event.target.value,
                  }))
                }
              />
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
              <Textarea
                className="pd-cases-form__full"
                label="Notes"
                rows={3}
                value={draft.description}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
              />
            </div>
          ) : (
            <>
              <div className="pd-case-detail__facts">
                <Fact
                  label="Destination"
                  value={item.destination || '—'}
                />
                <Fact
                  label="Departure"
                  value={formatDate(item.departureDate)}
                />
                <Fact label="Current step" value={currentLabel} />
                <Fact label="Assigned to" value={assignedName || '—'} />
                <Fact
                  label="Service fee"
                  value={formatBalance(serviceFee)}
                />
                <Fact
                  label="Balance due"
                  value={formatBalance(item.balance)}
                />
                <Fact label="Opened" value={formatDate(item.createdAt)} />
                <Fact label="Updated" value={formatDate(item.updatedAt)} />
                <Fact
                  label="Documents"
                  value={
                    missingDocs > 0
                      ? `${missingDocs} needed`
                      : 'Complete'
                  }
                />
              </div>
              {item.description ? (
                <p className="pd-case-detail__notes">{item.description}</p>
              ) : null}
            </>
          )}
        </section>
        <CasePipeline item={item} />
      </div>
      <Modal
        open={requestOpen}
        onClose={() => setRequestOpen(false)}
        title="Request status update"
        description="Staff or a sub agent can ask to move this service to a new status."
        actions={
          <>
            <Button variant="secondary" onClick={() => setRequestOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!client?.partnerId) return
                submitStatusRequest({
                  partnerId: client.partnerId,
                  clientId: item.clientId,
                  caseId: item.id,
                  fromStatus: item.status,
                  toStatus: requestTo,
                  remarks: requestRemarks.trim() || undefined,
                })
                setRequestOpen(false)
              }}
              disabled={!client?.partnerId || requestTo === item.status}
            >
              Submit request
            </Button>
          </>
        }
      >
        {client?.partnerId ? (
          <>
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
          </>
        ) : (
          <EmptyState
            title="No sub agent on this client"
            description="Link a sub agent on the client profile before requesting a status change."
          />
        )}
      </Modal>
    </div>
  )
}
