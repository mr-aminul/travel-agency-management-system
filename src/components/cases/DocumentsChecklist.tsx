import { useState } from 'react'
import { DocumentListRow, type DocumentRowTone } from '@/components/cases/DocumentListRow'
import {
  DocumentUploadModal,
  type DocumentDrawerMode,
} from '@/components/cases/DocumentUploadModal'
import type { ComplianceDocument } from '@/lib/caseDocuments'
import type { CaseDocument, CaseDocumentStatus } from '@/types/case'
import '@/styles/layout-cases.css'

function statusCopy(
  status: CaseDocumentStatus,
  locked: boolean,
): { label: string; tone: DocumentRowTone } {
  if (locked) return { label: 'Later', tone: 'idle' }
  if (status === 'approved') return { label: 'Uploaded', tone: 'done' }
  if (status === 'under_review') return { label: 'In review', tone: 'wait' }
  return { label: 'Missing', tone: 'need' }
}

export function DocumentsChecklist({
  caseId,
  docs,
  label = 'Document checklist',
}: {
  caseId: string
  docs: ComplianceDocument[]
  label?: string
  quiet?: boolean
}) {
  const [activeDoc, setActiveDoc] = useState<CaseDocument | null>(null)
  const [drawerMode, setDrawerMode] = useState<DocumentDrawerMode>('edit')

  const openDoc = (doc: CaseDocument, mode: DocumentDrawerMode) => {
    setActiveDoc(doc)
    setDrawerMode(mode)
  }

  return (
    <>
      <ul className="pd-doc-check" aria-label={label}>
        {docs.map((doc) => {
          const hasRecord =
            doc.status === 'under_review' || doc.status === 'approved'
          const canUpload = !doc.locked && doc.status !== 'approved'
          const { label: status, tone } = statusCopy(doc.status, doc.locked)
          const detail =
            (hasRecord
              ? doc.fileName || doc.detail || doc.collectionHint
              : doc.detail || doc.collectionHint) || undefined

          return (
            <DocumentListRow
              key={doc.id}
              name={doc.name}
              detail={detail}
              status={status}
              tone={tone}
              locked={doc.locked}
              onView={hasRecord ? () => openDoc(doc, 'view') : undefined}
              onUpload={
                canUpload && !hasRecord ? () => openDoc(doc, 'edit') : undefined
              }
            />
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
