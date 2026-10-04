import { useState, type ReactNode } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Calendar,
  CircleDot,
  Eye,
  FileText,
  Folder,
  GitBranch,
  LayoutDashboard,
  MapPin,
  MessageSquare,
  NotebookPen,
  Plane,
  SquarePen,
  UserCheck,
  UserRound,
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
  Avatar,
  Badge,
  Button,
  EmptyState,
  Input,
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
} from '@/lib/casesStore'
import type { CaseDocument } from '@/types/case'
import { usePaymentsByCaseId } from '@/lib/paymentsStore'
import { formatBalance, getClientById } from '@/lib/clientsStore'
import type { CaseDocumentStatus, CaseStatus } from '@/types/case'
import { serviceToSlug } from '@/types/case'
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
  const { id = '' } = useParams()
  useCases()
  const item = getCaseById(id)
  const casePayments = usePaymentsByCaseId(id)
  const client = item ? getClientById(item.clientId) : undefined
  const [editing, setEditing] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [draft, setDraft] = useState({
    status: 'Pending' as CaseStatus,
    destination: '',
    assignedTo: '',
    departureDate: '',
    balance: '',
    description: '',
  })

  if (!item) {
    return <Navigate to="/cases" replace />
  }

  const listPath = `/cases/${serviceToSlug(item.service)}`
  const docs = getCaseComplianceDocuments(item)
  const missingDocs = countMissingDocuments(item)
  const currentLabel = getCurrentStepLabel(item)

  const startEditing = () => {
    setDraft({
      status: item.status,
      destination: item.destination ?? '',
      assignedTo: item.assignedTo ?? '',
      departureDate: item.departureDate ?? '',
      balance: item.balance ? String(item.balance) : '',
      description: item.description ?? '',
    })
    setEditing(true)
  }

  const finishEditing = () => {
    const parsedBalance = Number(draft.balance.replace(/,/g, ''))
    updateCase(item.id, {
      status: draft.status,
      destination: draft.destination,
      assignedTo: draft.assignedTo,
      departureDate: draft.departureDate || undefined,
      balance: Number.isFinite(parsedBalance) ? parsedBalance : 0,
      description: draft.description,
    })
    setEditing(false)
  }

  const displayStatus = editing ? draft.status : item.status

  return (
    <div className="pd-page pd-case-detail" aria-label={`${item.clientName} ${item.service} case`}>
      <Link to={listPath} className="pd-case-detail__back">
        <ArrowLeft size={14} strokeWidth={2.25} aria-hidden />
        {item.service} cases
      </Link>

      <header
        className={
          editing
            ? 'pd-case-detail__header is-editing'
            : 'pd-case-detail__header'
        }
      >
        <Avatar
          name={item.clientName}
          src={client?.avatarUrl}
          size="xl"
        />

        <div className="pd-case-detail__header-text">
          <div className="pd-case-detail__title-row">
            <h1 className="pd-case-detail__name">
              <Link
                to={`/clients/${item.clientId}`}
                className="pd-case-detail__name-link"
              >
                {item.clientName}
              </Link>
            </h1>
            <Badge variant="neutral">{item.service}</Badge>
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
              <Link
                to={`/cases/${item.id}/invoice`}
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
                        <FieldLabel icon={UserRound}>Client</FieldLabel>
                        <dd>
                          <Link
                            to={`/clients/${item.clientId}`}
                            className="pd-case-detail__link"
                          >
                            {item.clientName}
                          </Link>
                        </dd>
                      </div>
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
                            <Input
                              value={draft.assignedTo}
                              onChange={(event) =>
                                setDraft((current) => ({
                                  ...current,
                                  assignedTo: event.target.value,
                                }))
                              }
                            />
                          ) : (
                            item.assignedTo || (
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
                        <FieldLabel icon={Wallet}>Balance due</FieldLabel>
                        <dd>
                          {editing ? (
                            <Input
                              inputMode="numeric"
                              value={draft.balance}
                              onChange={(event) =>
                                setDraft((current) => ({
                                  ...current,
                                  balance: event.target.value,
                                }))
                              }
                            />
                          ) : (
                            <span className="pd-cases__balance">
                              {formatBalance(item.balance)}
                            </span>
                          )}
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
                  description="None for this case yet."
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
                description="Messages for this case will show up here."
              />
            ),
          },
        ]}
      />
    </div>
  )
}
