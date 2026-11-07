import { useEffect, useState } from 'react'
import { Check, ChevronDown, Circle, IdCard, Plus } from 'lucide-react'
import { DocumentWorkspace } from '@/components/cases/DocumentWorkspace'
import { cn } from '@/lib/utils'
import { Button } from '@/components/shadcn/button'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/shadcn/empty'
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
const IDENTITY_GROUP_ID = 'identity'

const markToneClass = (tone: 'done' | 'need' | 'idle') =>
  cn(
    'inline-flex size-4 shrink-0 items-center justify-center rounded-full',
    tone === 'done' && 'bg-emerald-500/15 text-emerald-700',
    tone === 'need' && 'bg-destructive/15 text-destructive',
    tone === 'idle' && 'bg-muted text-muted-foreground',
  )

type SelectedDoc = {
  groupId: string
  docId: string
}

function childTone(
  locked: boolean,
  hasFile: boolean,
  required = true,
): 'done' | 'need' | 'idle' {
  if (locked) return 'idle'
  if (hasFile) return 'done'
  // Red attention only when catalog marks the paper Required.
  return required ? 'need' : 'idle'
}

export function ClientDocumentsPanel({
  client,
  cases,
  onAddService,
  focusCaseId = null,
  focusIdentityKind = null,
  highlight = false,
}: {
  client: Client
  cases: Case[]
  onAddService: () => void
  focusCaseId?: string | null
  focusIdentityKind?: IdentityKind | null
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
    if (focusIdentityKind) {
      selectIdentityDoc(focusIdentityKind)
      return
    }
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
  }, [focusCaseId, focusIdentityKind, cases])

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
      className={cn(
        'grid min-h-[22rem] grid-cols-1 gap-3 md:grid-cols-[minmax(14rem,18rem)_minmax(0,1fr)]',
        highlight && 'animate-pulse ring-2 ring-primary/40',
      )}
      aria-label={`${client.name} documents`}
    >
      <aside className="flex min-w-0 flex-col gap-2 rounded-xl border border-border bg-card p-3 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <p className="m-0 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Documents
          </p>
          <Button
            variant="ghost"
            className="h-9"
            onClick={onAddService}
            aria-label="Add service"
          >
            <Plus size={14} strokeWidth={2.25} aria-hidden />
            Add
          </Button>
        </div>
        <nav className="flex flex-col gap-2" aria-label="Document groups">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1 rounded-lg">
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-muted"
                onClick={() =>
                  selectIdentityDoc(
                    (identityDocs[0]?.id as IdentityKind) ?? 'passport',
                  )
                }
              >
                <span
                  className="inline-flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"
                  aria-hidden
                >
                  <IdCard size={14} strokeWidth={2.25} />
                </span>
                <span className="min-w-0 truncate font-medium">Identity</span>
              </button>
              <span className="text-xs text-muted-foreground tabular-nums" aria-hidden>
                {identityDocs.length}
              </span>
              <button
                type="button"
                className="inline-flex size-7 items-center justify-center rounded-md hover:bg-muted"
                aria-expanded={identityOpen}
                aria-label={identityOpen ? 'Collapse Identity' : 'Expand Identity'}
                onClick={() => toggleGroup(IDENTITY_GROUP_ID)}
              >
                <ChevronDown
                  className={cn(
                    'transition-transform',
                    identityOpen && 'rotate-180',
                  )}
                  size={14}
                  strokeWidth={2.25}
                  aria-hidden
                />
              </button>
            </div>
            {identityOpen ? (
              <div
                className="ms-3 flex flex-col gap-0.5 border-l border-border ps-2"
                role="group"
                aria-label="Identity"
              >
                {identityDocs.map((doc) => {
                  const active =
                    selected.groupId === IDENTITY_GROUP_ID &&
                    selected.docId === doc.id
                  const tone = childTone(false, documentHasFile(doc))
                  return (
                    <button
                      key={doc.id}
                      type="button"
                      className={cn(
                        'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted',
                        active && 'bg-muted font-medium',
                        tone === 'need' && 'text-destructive',
                      )}
                      aria-current={active ? 'page' : undefined}
                      onClick={() => selectIdentityDoc(doc.id as IdentityKind)}
                    >
                      <span className={markToneClass(tone)} aria-hidden>
                        {tone === 'done' ? (
                          <Check size={12} strokeWidth={2.5} />
                        ) : (
                          <Circle size={8} strokeWidth={2.25} />
                        )}
                      </span>
                      <span className="min-w-0 truncate">{doc.name}</span>
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
              <div key={group.caseId} className="flex flex-col gap-1">
                <div
                  className={cn(
                    'flex items-center gap-1 rounded-lg',
                    highlight &&
                      group.caseId === focusCaseId &&
                      'ring-2 ring-primary/40',
                  )}
                >
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-muted"
                    onClick={() => {
                      const first = group.papers[0]
                      if (first) selectServiceDoc(group.caseId, first.id)
                      else expandGroup(group.caseId)
                    }}
                  >
                    <span
                      className="inline-flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"
                      aria-hidden
                    >
                      <Icon size={14} strokeWidth={2.25} />
                    </span>
                    <span className="min-w-0 truncate font-medium">
                      {group.service}
                    </span>
                  </button>
                  <span className="text-xs text-muted-foreground tabular-nums" aria-hidden>
                    {group.papers.length}
                  </span>
                  <button
                    type="button"
                    className="inline-flex size-7 items-center justify-center rounded-md hover:bg-muted"
                    aria-expanded={open}
                    aria-label={
                      open ? `Collapse ${group.service}` : `Expand ${group.service}`
                    }
                    onClick={() => toggleGroup(group.caseId)}
                  >
                    <ChevronDown
                      className={cn(
                        'transition-transform',
                        open && 'rotate-180',
                      )}
                      size={14}
                      strokeWidth={2.25}
                      aria-hidden
                    />
                  </button>
                </div>
                {open ? (
                  <div
                    className="ms-3 flex flex-col gap-0.5 border-l border-border ps-2"
                    role="group"
                    aria-label={group.service}
                  >
                    {group.papers.map((doc: ComplianceDocument) => {
                      const active =
                        selected.groupId === group.caseId &&
                        selected.docId === doc.id
                      const tone = childTone(
                        doc.locked,
                        documentHasFile(doc),
                        doc.required === true,
                      )
                      return (
                        <button
                          key={doc.id}
                          type="button"
                          className={cn(
                            'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted',
                            doc.locked && 'opacity-60',
                            active && 'bg-muted font-medium',
                            tone === 'need' && 'text-destructive',
                          )}
                          aria-current={active ? 'page' : undefined}
                          onClick={() => selectServiceDoc(group.caseId, doc.id)}
                        >
                          <span className={markToneClass(tone)} aria-hidden>
                            {tone === 'done' ? (
                              <Check size={12} strokeWidth={2.5} />
                            ) : (
                              <Circle size={8} strokeWidth={2.25} />
                            )}
                          </span>
                          <span className="min-w-0 truncate">{doc.name}</span>
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

      <div className="min-w-0 rounded-xl border border-border bg-card p-3 shadow-sm">
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
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <IdCard />
              </EmptyMedia>
              <EmptyTitle>Choose A Document</EmptyTitle>
            </EmptyHeader>
          </Empty>
        )}
      </div>
    </section>
  )
}
