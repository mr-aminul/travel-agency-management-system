import { useEffect, useState } from 'react'
import { Check, ChevronDown, Circle, IdCard, Plus } from 'lucide-react'
import { DocumentWorkspace } from '@/components/cases/DocumentWorkspace'
import { cx } from '@/lib/cx'
import { Button, EmptyState } from '@/components/ui'
import {
  buildIdentityCaseDocument,
  documentHasFile,
  getClientIdentityRows,
  getClientServiceDocumentGroups,
  type IdentityKind,
} from '@/lib/clientDocuments'
import { useServiceIconOverrides } from '@/lib/serviceIconOverridesStore'
import { iconForService } from '@/lib/serviceIcons'
import type { Case } from '@/types/case'
import type { Client } from '@/types/client'
import type { ComplianceDocument } from '@/lib/caseDocuments'
import '@/styles/layout-cases.css'

const IDENTITY_GROUP_ID = 'identity'

type SelectedDoc = {
  groupId: string
  docId: string
}

function childTone(locked: boolean, hasFile: boolean): 'done' | 'need' | 'idle' {
  if (locked) return 'idle'
  return hasFile ? 'done' : 'need'
}

export function ClientDocumentsPanel({
  client,
  cases,
  onAddService,
  focusCaseId = null,
  highlight = false,
}: {
  client: Client
  cases: Case[]
  onAddService: () => void
  focusCaseId?: string | null
  highlight?: boolean
}) {
  useServiceIconOverrides()

  const identityRows = getClientIdentityRows(client, cases)
  const identityDocs = identityRows.map((row) =>
    buildIdentityCaseDocument(client, cases, row.kind),
  )
  const groups = getClientServiceDocumentGroups(cases).filter(
    (group) => group.papers.length > 0,
  )

  const [collapsedGroupIds, setCollapsedGroupIds] = useState<string[]>([])
  const [selected, setSelected] = useState<SelectedDoc>({
    groupId: IDENTITY_GROUP_ID,
    docId: identityDocs[0]?.id ?? 'passport',
  })

  const isGroupOpen = (groupId: string) => !collapsedGroupIds.includes(groupId)

  const toggleGroup = (groupId: string) => {
    setCollapsedGroupIds((current) =>
      current.includes(groupId)
        ? current.filter((id) => id !== groupId)
        : [...current, groupId],
    )
  }

  const expandGroup = (groupId: string) => {
    setCollapsedGroupIds((current) => current.filter((id) => id !== groupId))
  }

  const selectIdentityDoc = (kind: IdentityKind) => {
    setSelected({ groupId: IDENTITY_GROUP_ID, docId: kind })
    expandGroup(IDENTITY_GROUP_ID)
  }

  const selectServiceDoc = (caseId: string, docId: string) => {
    setSelected({ groupId: caseId, docId })
    expandGroup(caseId)
  }

  useEffect(() => {
    if (!focusCaseId) return
    const group = getClientServiceDocumentGroups(cases).find(
      (item) => item.caseId === focusCaseId && item.papers.length > 0,
    )
    if (!group) return
    const missing = group.papers.find(
      (doc) => doc.required && doc.status === 'missing',
    )
    setSelected({
      groupId: focusCaseId,
      docId: missing?.id ?? group.papers[0].id,
    })
    setCollapsedGroupIds((current) =>
      current.filter((id) => id !== focusCaseId),
    )
  }, [focusCaseId, cases])

  const identityOpen = isGroupOpen(IDENTITY_GROUP_ID)
  const selectedIdentity =
    selected.groupId === IDENTITY_GROUP_ID
      ? identityDocs.find((doc) => doc.id === selected.docId) ?? identityDocs[0]
      : null
  const selectedIdentityKind = selectedIdentity?.id as IdentityKind | undefined
  const selectedGroup =
    selected.groupId === IDENTITY_GROUP_ID
      ? null
      : groups.find((group) => group.caseId === selected.groupId)
  const selectedPaper =
    selectedGroup?.papers.find((doc) => doc.id === selected.docId) ??
    selectedGroup?.papers[0] ??
    null

  return (
    <section
      id="client-documents"
      className={cx(
        'pd-service-workspace pd-service-workspace--docs pd-client-docs',
        highlight && 'pd-focus-flash',
      )}
      aria-label={`${client.name} documents`}
    >
      <aside className="pd-service-rail">
        <div className="pd-service-rail__head">
          <p className="pd-service-rail__title">Documents</p>
          <Button
            size="sm"
            variant="ghost"
            onClick={onAddService}
            aria-label="Add service"
          >
            <Plus size={14} strokeWidth={2.25} aria-hidden />
            Add
          </Button>
        </div>
        <nav className="pd-doc-tree" aria-label="Document groups">
          <div className="pd-doc-tree__group">
            <div className="pd-service-rail__item pd-doc-tree__parent">
              <button
                type="button"
                className="pd-doc-tree__parent-hit"
                onClick={() =>
                  selectIdentityDoc(
                    (identityDocs[0]?.id as IdentityKind) ?? 'passport',
                  )
                }
              >
                <span className="pd-service-rail__icon" aria-hidden>
                  <IdCard size={14} strokeWidth={2.25} />
                </span>
                <span className="pd-service-rail__copy">
                  <span className="pd-service-rail__name">Identity</span>
                </span>
              </button>
              <span className="pd-doc-tree__count" aria-hidden>
                {identityDocs.length}
              </span>
              <button
                type="button"
                className="pd-doc-tree__toggle"
                aria-expanded={identityOpen}
                aria-label={identityOpen ? 'Collapse Identity' : 'Expand Identity'}
                onClick={() => toggleGroup(IDENTITY_GROUP_ID)}
              >
                <ChevronDown
                  className={cx(
                    'pd-doc-tree__chevron',
                    identityOpen && 'is-open',
                  )}
                  size={14}
                  strokeWidth={2.25}
                  aria-hidden
                />
              </button>
            </div>
            {identityOpen ? (
              <div className="pd-doc-tree__docs" role="group" aria-label="Identity">
                {identityDocs.map((doc) => {
                  const active =
                    selected.groupId === IDENTITY_GROUP_ID &&
                    selected.docId === doc.id
                  const tone = childTone(false, documentHasFile(doc))
                  return (
                    <button
                      key={doc.id}
                      type="button"
                      className={cx(
                        'pd-doc-tree__doc',
                        active && 'is-selected',
                        tone === 'need' && 'is-attention',
                      )}
                      aria-current={active ? 'page' : undefined}
                      onClick={() => selectIdentityDoc(doc.id as IdentityKind)}
                    >
                      <span
                        className={cx('pd-doc-check__mark', `is-${tone}`)}
                        aria-hidden
                      >
                        {tone === 'done' ? (
                          <Check size={12} strokeWidth={2.5} />
                        ) : (
                          <Circle size={8} strokeWidth={2.25} />
                        )}
                      </span>
                      <span className="pd-doc-tree__doc-name">{doc.name}</span>
                    </button>
                  )
                })}
              </div>
            ) : null}
          </div>

          {groups.map((group) => {
            const open = isGroupOpen(group.caseId)
            const Icon = iconForService(group.service)
            return (
              <div key={group.caseId} className="pd-doc-tree__group">
                <div
                  className={cx(
                    'pd-service-rail__item pd-doc-tree__parent',
                    highlight && group.caseId === focusCaseId && 'pd-focus-flash',
                  )}
                >
                  <button
                    type="button"
                    className="pd-doc-tree__parent-hit"
                    onClick={() => {
                      const first = group.papers[0]
                      if (first) selectServiceDoc(group.caseId, first.id)
                      else expandGroup(group.caseId)
                    }}
                  >
                    <span className="pd-service-rail__icon" aria-hidden>
                      <Icon size={14} strokeWidth={2.25} />
                    </span>
                    <span className="pd-service-rail__copy">
                      <span className="pd-service-rail__name">{group.service}</span>
                    </span>
                  </button>
                  <span className="pd-doc-tree__count" aria-hidden>
                    {group.papers.length}
                  </span>
                  <button
                    type="button"
                    className="pd-doc-tree__toggle"
                    aria-expanded={open}
                    aria-label={
                      open ? `Collapse ${group.service}` : `Expand ${group.service}`
                    }
                    onClick={() => toggleGroup(group.caseId)}
                  >
                    <ChevronDown
                      className={cx('pd-doc-tree__chevron', open && 'is-open')}
                      size={14}
                      strokeWidth={2.25}
                      aria-hidden
                    />
                  </button>
                </div>
                {open ? (
                  <div
                    className="pd-doc-tree__docs"
                    role="group"
                    aria-label={group.service}
                  >
                    {group.papers.map((doc: ComplianceDocument) => {
                      const active =
                        selected.groupId === group.caseId &&
                        selected.docId === doc.id
                      const tone = childTone(doc.locked, documentHasFile(doc))
                      return (
                        <button
                          key={doc.id}
                          type="button"
                          className={cx(
                            'pd-doc-tree__doc',
                            doc.locked && 'is-later',
                            active && 'is-selected',
                            tone === 'need' && 'is-attention',
                          )}
                          aria-current={active ? 'page' : undefined}
                          onClick={() => selectServiceDoc(group.caseId, doc.id)}
                        >
                          <span
                            className={cx(
                              'pd-doc-check__mark',
                              tone !== 'idle' && `is-${tone}`,
                            )}
                            aria-hidden
                          >
                            {tone === 'done' ? (
                              <Check size={12} strokeWidth={2.5} />
                            ) : (
                              <Circle size={8} strokeWidth={2.25} />
                            )}
                          </span>
                          <span className="pd-doc-tree__doc-name">{doc.name}</span>
                        </button>
                      )
                    })}
                  </div>
                ) : null}
              </div>
            )
          })}
        </nav>
      </aside>

      <div className="pd-service-workspace__main">
        {selectedIdentity ? (
          <DocumentWorkspace
            key={`identity:${selectedIdentity.id}`}
            document={selectedIdentity}
            clientId={client.id}
            identityKind={selectedIdentityKind}
            canEdit
          />
        ) : selectedPaper && selectedGroup ? (
          <DocumentWorkspace
            key={`${selectedGroup.caseId}:${selectedPaper.id}`}
            document={selectedPaper}
            caseId={selectedGroup.caseId}
            canEdit={!selectedPaper.locked && selectedPaper.status !== 'approved'}
            locked={selectedPaper.locked}
            hint={selectedPaper.collectionHint}
          />
        ) : (
          <EmptyState
            icon={IdCard}
            title="Choose a document"
            description="Pick a paper from the list to view or record it."
          />
        )}
      </div>
    </section>
  )
}
