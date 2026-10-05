import { useState } from 'react'
import { FileText } from 'lucide-react'
import { DocumentListRow } from '@/components/cases/DocumentListRow'
import { DocumentsChecklist } from '@/components/cases/DocumentsChecklist'
import {
  DocumentUploadModal,
  type DocumentDrawerMode,
} from '@/components/cases/DocumentUploadModal'
import { Accordion, Button, Card, EmptyState } from '@/components/ui'
import {
  buildIdentityCaseDocument,
  getClientIdentityRows,
  getClientServiceDocumentGroups,
  type IdentityKind,
} from '@/lib/clientDocuments'
import type { Case } from '@/types/case'
import type { Client } from '@/types/client'
import '@/styles/layout-cases.css'

function documentCountLabel(count: number): string {
  return `${count} ${count === 1 ? 'document' : 'documents'}`
}

export function ClientDocumentsPanel({
  client,
  cases,
  onAddService,
}: {
  client: Client
  cases: Case[]
  onAddService: () => void
}) {
  const identity = getClientIdentityRows(client, cases)
  const groups = getClientServiceDocumentGroups(cases).filter(
    (group) => group.papers.length > 0,
  )
  const [activeKind, setActiveKind] = useState<IdentityKind | null>(null)
  const [drawerMode, setDrawerMode] = useState<DocumentDrawerMode>('edit')

  const activeDocument = activeKind
    ? buildIdentityCaseDocument(client, cases, activeKind)
    : null

  const openIdentity = (kind: IdentityKind, mode: DocumentDrawerMode) => {
    setActiveKind(kind)
    setDrawerMode(mode)
  }

  const defaultOpenIds = groups.some((group) => group.needed > 0)
    ? groups.filter((group) => group.needed > 0).map((group) => group.caseId)
    : groups.slice(0, 1).map((group) => group.caseId)

  return (
    <div className="pd-client-docs">
      <Card
        title="Identity"
        actions={
          <span className="pd-client-docs__count">
            {documentCountLabel(identity.length)}
          </span>
        }
      >
        <ul className="pd-doc-check" aria-label="Identity">
          {identity.map((row) => {
            const hasRecord = Boolean(row.value || row.hasFile)
            return (
              <DocumentListRow
                key={row.kind}
                name={row.label}
                detail={row.value ?? row.meta}
                status={hasRecord ? 'Uploaded' : 'Missing'}
                tone={hasRecord ? 'done' : 'need'}
                onView={hasRecord ? () => openIdentity(row.kind, 'view') : undefined}
                onUpload={
                  hasRecord ? undefined : () => openIdentity(row.kind, 'edit')
                }
              />
            )
          })}
        </ul>
      </Card>

      {cases.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No services"
          action={
            <Button size="sm" onClick={onAddService}>
              Add service
            </Button>
          }
        />
      ) : groups.length === 0 ? null : (
        <Accordion
          multiple
          className="pd-accordion--cards"
          defaultOpenIds={defaultOpenIds}
          items={groups.map((group) => ({
            id: group.caseId,
            title: group.service,
            meta: documentCountLabel(group.papers.length),
            content: (
              <DocumentsChecklist
                caseId={group.caseId}
                docs={group.papers}
                label={`${group.service} papers`}
              />
            ),
          }))}
        />
      )}

      <DocumentUploadModal
        open={Boolean(activeDocument)}
        clientId={client.id}
        identityKind={activeKind ?? undefined}
        document={activeDocument}
        mode={drawerMode}
        onModeChange={setDrawerMode}
        canEdit
        onClose={() => setActiveKind(null)}
      />
    </div>
  )
}
