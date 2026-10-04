import { useState, type ReactNode } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import {
  Calendar,
  CircleDot,
  ClipboardList,
  Eye,
  FileText,
  Folder,
  GitBranch,
  LayoutDashboard,
  MapPin,
  MessageSquare,
  NotebookPen,
  Plane,
  Receipt,
  SquarePen,
  UserCheck,
  Upload,
  Wallet,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { CasePipeline } from '@/components/cases/CasePipeline'
import {
  DocumentUploadModal,
  type DocumentDrawerMode,
} from '@/components/cases/DocumentUploadModal'
import { PaymentsList } from '@/components/payments/PaymentsList'
import {
  Badge,
  Button,
  EmptyState,
  Input,
  Modal,
  Select,
  Tabs,
  Textarea,
  type BadgeVariant,
} from '@/components/ui'
import { getCurrentStepLabel } from '@/lib/caseChecklist'
import {
  countMissingDocuments,
  getCaseComplianceDocuments,
  type ComplianceDocument,
} from '@/lib/caseDocuments'
import {
  CASE_STATUS_OPTIONS,
  getCaseById,
  updateCase,
  useCases,
  useCasesByClientId,
} from '@/lib/casesStore'
import type { CaseDocument } from '@/types/case'
import { usePaymentsByCaseId } from '@/lib/paymentsStore'
import { formatBalance, getClientById } from '@/lib/clientsStore'
import { caseServiceFee, parseMoneyInput } from '@/lib/caseMoney'
import {
  employeeAssignmentOptions,
  getEmployeeDisplayName,
  useEmployees,
} from '@/lib/employeesStore'
import { submitStatusRequest } from '@/lib/requestsStore'
import { clientPath, workDetailPath, workInvoicePath } from '@/lib/workPaths'
import type { CaseDocumentStatus, CaseStatus } from '@/types/case'
import '@/styles/layout-cases.css'

function statusBadgeVariant(status: CaseStatus): BadgeVariant {
  if (status === 'Completed') return 'completed'
  if (status === 'Pending') return 'pending'
  if (status === 'In-Progress') return 'in-progress'
  if (status === 'On-Hold') return 'on-hold'
  return 'danger'
}

function formatDate(value?: string): string {
  if (!value) return '—'
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function DocIcon({
  icon: Icon,
  status,
}: {
  icon: LucideIcon
  status: CaseDocumentStatus
}) {
  const tone =
    status === 'approved' || status === 'under_review' ? 'done' : 'idle'
  return (
    <span className={`pd-doc-check__icon is-${tone}`} aria-hidden>
      <Icon size={16} strokeWidth={2} />
    </span>
  )
}

function DocumentsChecklist({
  caseId,
  docs,
}: {
  caseId: string
  docs: ComplianceDocument[]
}) {
  const [activeDoc, setActiveDoc] = useState<CaseDocument | null>(null)
  const [drawerMode, setDrawerMode] = useState<DocumentDrawerMode>('edit')

  const openDoc = (doc: CaseDocument, mode: DocumentDrawerMode) => {
    setActiveDoc(doc)
    setDrawerMode(mode)
  }

  return (
    <>
      <ul className="pd-doc-check" aria-label="Document checklist">
        {docs.map((doc) => {
          const hasRecord =
            doc.status === 'under_review' || doc.status === 'approved'
          const canUpload = !doc.locked && doc.status !== 'approved'
          const summary = hasRecord
            ? doc.fileName || doc.detail || doc.collectionHint
            : doc.locked
              ? 'Later'
              : null

          return (
            <li
              key={doc.id}
              className={
                doc.locked
                  ? 'pd-doc-check__item is-later'
                  : 'pd-doc-check__item'
              }
            >
              <span className="pd-doc-check__main">
                <DocIcon icon={doc.iconComponent} status={doc.status} />
                <span className="pd-doc-check__text">
                  <span className="pd-doc-check__name">{doc.name}</span>
                  {summary ? (
                    <span className="pd-doc-check__file">{summary}</span>
                  ) : null}
                </span>
              </span>
              <span className="pd-doc-check__side">
                {hasRecord ? (
                  <button
                    type="button"
                    className="pd-doc-check__upload"
                    onClick={() => openDoc(doc, 'view')}
                  >
                    <Eye size={14} strokeWidth={2.25} aria-hidden />
                    View
                  </button>
                ) : null}
                {canUpload ? (
                  <button
                    type="button"
                    className="pd-doc-check__upload"
                    onClick={() => openDoc(doc, 'edit')}
                  >
                    <Upload size={14} strokeWidth={2.25} aria-hidden />
                    {doc.status === 'under_review' ? 'Edit' : 'Add'}
                  </button>
                ) : null}
              </span>
            </li>
          )
        })}
      </ul>

      <DocumentUploadModal
        open={Boolean(activeDoc)}
        caseId={caseId}
        document={
          activeDoc
            ? (docs.find((doc) => doc.id === activeDoc.id) ?? activeDoc)
            : null
        }
        mode={drawerMode}
        onModeChange={setDrawerMode}
        canEdit={
          Boolean(
            activeDoc &&
            activeDoc.status !== 'approved' &&
            !docs.find((doc) => doc.id === activeDoc.id)?.locked,
          )
        }
        onClose={() => setActiveDoc(null)}
      />
    </>
  )
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
      <span className="pd-case-detail__field-icon" aria-hidden>
        <Icon size={13} strokeWidth={2.25} />
      </span>
      {children}
    </dt>
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
    <h2 className="pd-case-detail__section-title">
      <span className="pd-case-detail__section-icon" aria-hidden>
        <Icon size={15} strokeWidth={2.25} />
      </span>
      {children}
    </h2>
  )
}

function TabLabel({
  icon: Icon,
  children,
}: {
  icon: LucideIcon
  children: ReactNode
}) {
  return (
    <>
      <Icon size={15} strokeWidth={2.25} aria-hidden />
      {children}
    </>
  )
}

export default function CaseDetailPage() {
  const { id: clientId = '', caseId = '' } = useParams()
  useCases()
  const item = getCaseById(caseId)
  const siblingServices = useCasesByClientId(item?.clientId ?? clientId)
  const casePayments = usePaymentsByCaseId(caseId)
  const employees = useEmployees()
  const client = item ? getClientById(item.clientId) : undefined
  const [editing, setEditing] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
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

  if (!item) {
    return <Navigate to={clientPath(clientId, 'services')} replace />
  }

  if (item.clientId !== clientId) {
    return <Navigate to={workDetailPath(item)} replace />
  }

  const docs = getCaseComplianceDocuments(item)
  const missingDocs = countMissingDocuments(item)
  const currentLabel = getCurrentStepLabel(item)
  const paidTotal = casePayments.reduce((sum, payment) => sum + payment.amount, 0)
  const serviceFee = caseServiceFee(item, paidTotal)

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

  const displayStatus = editing ? draft.status : item.status

  return (
    <div className="pd-case-detail pd-case-detail--nested" aria-label={item.service}>
      {siblingServices.length > 1 ? (
        <nav className="pd-case-detail__siblings" aria-label="Services on this client">
          {siblingServices.map((service) => (
            <Link
              key={service.id}
              to={workDetailPath(service)}
              className={
                service.id === item.id
                  ? 'pd-case-detail__sibling is-active'
                  : 'pd-case-detail__sibling'
              }
            >
              {service.service}
            </Link>
          ))}
        </nav>
      ) : null}

      <header
        className={
          editing
            ? 'pd-case-detail__header is-editing'
            : 'pd-case-detail__header'
        }
      >
        <div className="pd-case-detail__header-text">
          <div className="pd-case-detail__title-row">
            <h2 className="pd-case-detail__name">{item.service}</h2>
            <Badge variant={statusBadgeVariant(displayStatus)}>
              {displayStatus}
            </Badge>
          </div>
          <p className="pd-case-detail__client-line">
            <span>{item.caseId}</span>
            {item.destination ? (
              <>
                <span className="pd-case-detail__meta-sep" aria-hidden>
                  ·
                </span>
                <span>{item.destination}</span>
              </>
            ) : null}
          </p>
          {editing ? null : (
            <div className="pd-case-detail__meta-row">
              <span className="pd-case-detail__step-chip">
                <CircleDot size={13} strokeWidth={2.25} aria-hidden />
                {currentLabel}
              </span>
            </div>
          )}
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
              <Button variant="secondary" size="sm" onClick={startEditing}>
                <SquarePen size={14} strokeWidth={2.25} aria-hidden />
                Edit
              </Button>
            </>
          )}
        </div>
      </header>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        items={[
          {
            id: 'overview',
            label: <TabLabel icon={LayoutDashboard}>Overview</TabLabel>,
            content: (
              <div className="pd-case-detail__overview">
                <div className="pd-case-detail__stats" aria-label="Summary">
                  <div className="pd-case-detail__stat is-static">
                    <span className="pd-case-detail__stat-icon" aria-hidden>
                      <CircleDot size={16} strokeWidth={2.25} />
                    </span>
                    <div className="pd-case-detail__stat-copy">
                      <span className="pd-case-detail__stat-label">
                        Current step
                      </span>
                      <span className="pd-case-detail__stat-value">
                        {currentLabel}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="pd-case-detail__stat"
                    onClick={() => setActiveTab('documents')}
                  >
                    <span className="pd-case-detail__stat-icon" aria-hidden>
                      <FileText size={16} strokeWidth={2.25} />
                    </span>
                    <div className="pd-case-detail__stat-copy">
                      <span className="pd-case-detail__stat-label">
                        Documents
                      </span>
                      <span className="pd-case-detail__stat-value">
                        {missingDocs > 0
                          ? `${missingDocs} needed`
                          : 'Complete'}
                      </span>
                    </div>
                  </button>
                  <button
                    type="button"
                    className="pd-case-detail__stat"
                    onClick={() => setActiveTab('payments')}
                  >
                    <span className="pd-case-detail__stat-icon" aria-hidden>
                      <Receipt size={16} strokeWidth={2.25} />
                    </span>
                    <div className="pd-case-detail__stat-copy">
                      <span className="pd-case-detail__stat-label">
                        Service fee
                      </span>
                      <span className="pd-case-detail__stat-value">
                        {formatBalance(serviceFee)}
                      </span>
                    </div>
                  </button>
                  <button
                    type="button"
                    className="pd-case-detail__stat"
                    onClick={() => setActiveTab('payments')}
                  >
                    <span className="pd-case-detail__stat-icon" aria-hidden>
                      <Wallet size={16} strokeWidth={2.25} />
                    </span>
                    <div className="pd-case-detail__stat-copy">
                      <span className="pd-case-detail__stat-label">
                        Balance due
                      </span>
                      <span className="pd-case-detail__stat-value">
                        {formatBalance(item.balance)}
                      </span>
                    </div>
                  </button>
                </div>

                <div className="pd-case-detail__grid">
                  <section className="pd-case-detail__section">
                    <SectionTitle icon={Folder}>Case</SectionTitle>
                    <dl className="pd-case-detail__fields">
                      <div className="pd-case-detail__field">
                        <FieldLabel icon={CircleDot}>Status</FieldLabel>
                        <dd>
                          {editing ? (
                            <Select
                              value={draft.status}
                              onChange={(event) =>
                                setDraft((current) => ({
                                  ...current,
                                  status: event.target.value as CaseStatus,
                                }))
                              }
                              options={CASE_STATUS_OPTIONS}
                            />
                          ) : (
                            <Badge variant={statusBadgeVariant(item.status)}>
                              {item.status}
                            </Badge>
                          )}
                        </dd>
                      </div>
                      <div className="pd-case-detail__field">
                        <FieldLabel icon={UserCheck}>Assigned to</FieldLabel>
                        <dd>
                          {editing ? (
                            <Select
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
                            getEmployeeDisplayName(item.assignedTo) || (
                              <span className="pd-case-detail__empty">—</span>
                            )
                          )}
                        </dd>
                      </div>
                      <div className="pd-case-detail__field">
                        <FieldLabel icon={Calendar}>Opened</FieldLabel>
                        <dd>{formatDate(item.createdAt)}</dd>
                      </div>
                      <div className="pd-case-detail__field">
                        <FieldLabel icon={Calendar}>Updated</FieldLabel>
                        <dd>{formatDate(item.updatedAt)}</dd>
                      </div>
                    </dl>
                  </section>

                  <section className="pd-case-detail__section">
                    <SectionTitle icon={Plane}>Travel</SectionTitle>
                    <dl className="pd-case-detail__fields">
                      <div className="pd-case-detail__field">
                        <FieldLabel icon={MapPin}>Destination</FieldLabel>
                        <dd>
                          {editing ? (
                            <Input
                              value={draft.destination}
                              onChange={(event) =>
                                setDraft((current) => ({
                                  ...current,
                                  destination: event.target.value,
                                }))
                              }
                            />
                          ) : (
                            item.destination || (
                              <span className="pd-case-detail__empty">—</span>
                            )
                          )}
                        </dd>
                      </div>
                      <div className="pd-case-detail__field">
                        <FieldLabel icon={Calendar}>Departure</FieldLabel>
                        <dd>
                          {editing ? (
                            <Input
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
                            formatDate(item.departureDate)
                          )}
                        </dd>
                      </div>
                      <div className="pd-case-detail__field">
                        <FieldLabel icon={Receipt}>Service fee</FieldLabel>
                        <dd>
                          {editing ? (
                            <Input
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
                            <span className="pd-cases__balance">
                              {formatBalance(serviceFee)}
                            </span>
                          )}
                        </dd>
                      </div>
                      <div className="pd-case-detail__field">
                        <FieldLabel icon={Wallet}>Balance due</FieldLabel>
                        <dd>
                          <span className="pd-cases__balance">
                            {formatBalance(item.balance)}
                          </span>
                        </dd>
                      </div>
                      <div className="pd-case-detail__field">
                        <FieldLabel icon={Wallet}>Payments</FieldLabel>
                        <dd>
                          {casePayments.length > 0
                            ? `${casePayments.length} recorded`
                            : 'None yet'}
                        </dd>
                      </div>
                    </dl>
                  </section>

                  <section className="pd-case-detail__section pd-case-detail__section--notes">
                    <SectionTitle icon={NotebookPen}>Notes</SectionTitle>
                    {editing ? (
                      <Textarea
                        rows={4}
                        value={draft.description}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            description: event.target.value,
                          }))
                        }
                      />
                    ) : item.description ? (
                      <p className="pd-case-detail__notes">
                        {item.description}
                      </p>
                    ) : (
                      <p className="pd-case-detail__notes is-empty">
                        No notes yet.
                      </p>
                    )}
                  </section>
                </div>
              </div>
            ),
          },
          {
            id: 'pipeline',
            label: <TabLabel icon={GitBranch}>Pipeline</TabLabel>,
            content: <CasePipeline item={item} />,
          },
          {
            id: 'documents',
            label: <TabLabel icon={FileText}>Documents</TabLabel>,
            content:
              docs.length > 0 ? (
                <DocumentsChecklist caseId={item.id} docs={docs} />
              ) : (
                <EmptyState
                  icon={FileText}
                  title="No documents"
                  description="None for this service yet."
                />
              ),
          },
          {
            id: 'payments',
            label: <TabLabel icon={Wallet}>Payments</TabLabel>,
            content: (
              <PaymentsList
                clientId={item.clientId}
                caseId={item.id}
                cases={[item]}
              />
            ),
          },
          {
            id: 'messages',
            label: <TabLabel icon={MessageSquare}>Messages</TabLabel>,
            content: (
              <EmptyState
                icon={MessageSquare}
                title="No messages yet"
                description="Messages for this service will show up here."
              />
            ),
          },
        ]}
      />
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
