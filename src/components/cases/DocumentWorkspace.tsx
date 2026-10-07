import { useId, type FormEvent } from 'react'
import { Check } from 'lucide-react'
import { DocumentRecordFields } from '@/components/cases/DocumentRecordFields'
import { useDocumentRecordEditor } from '@/components/cases/documentRecordEditor'
import { Badge, Button } from '@/components/ui'
import { documentIcon } from '@/lib/caseDocuments'
import type { IdentityKind } from '@/lib/clientDocuments'
import type { CaseDocument } from '@/types/case'
import '@/styles/layout-cases.css'

function statusCopy(document: CaseDocument, locked: boolean): {
  label: string
  variant: 'completed' | 'pending' | 'in-progress' | 'on-hold'
} {
  if (locked) return { label: 'Later', variant: 'on-hold' }
  if (document.status === 'approved') return { label: 'Uploaded', variant: 'completed' }
  if (document.status === 'under_review') {
    return { label: 'In review', variant: 'in-progress' }
  }
  return { label: 'Missing', variant: 'pending' }
}

export function DocumentWorkspace({
  document,
  caseId,
  clientId,
  identityKind,
  canEdit = true,
  locked = false,
  hint,
}: {
  document: CaseDocument
  caseId?: string
  clientId?: string
  identityKind?: IdentityKind
  canEdit?: boolean
  locked?: boolean
  hint?: string
}) {
  const formId = useId()
  const editor = useDocumentRecordEditor(document)
  const Icon = documentIcon(document.icon)
  const status = statusCopy(document, locked)
  const allowEdit = canEdit && !locked
  const mode = allowEdit ? 'edit' : 'view'

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    editor.save({ caseId, clientId, identityKind })
  }

  if (!editor.form) return null

  return (
    <article className="pd-doc-inspect" aria-label={document.name}>
      <header className="pd-doc-inspect__head">
        <span className="pd-doc-inspect__icon" aria-hidden>
          <Icon size={16} strokeWidth={2.25} />
        </span>
        <h2 className="pd-doc-inspect__title">{document.name}</h2>
        <Badge variant={status.variant}>{status.label}</Badge>
      </header>
      {hint ? <p className="pd-doc-inspect__hint">{hint}</p> : null}

      <form
        id={formId}
        className="pd-doc-inspect__record"
        onSubmit={handleSubmit}
        noValidate
      >
        <DocumentRecordFields
          document={document}
          form={editor.form}
          mode={mode}
          fields={editor.fields}
          fileName={editor.fileName}
          fileId={editor.fileId}
          mimeType={editor.mimeType}
          errors={editor.errors}
          triedSubmit={editor.triedSubmit}
          formId={`${formId}-fields`}
          onFieldChange={editor.updateField}
          onAttachFile={editor.attachFile}
          onRemoveFile={editor.clearFile}
          hideFileMeta
          embedded
          afterFields={
            allowEdit && editor.isDirty ? (
              <div className="pd-doc-inspect__actions">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={editor.discard}
                >
                  Discard changes
                </Button>
                <Button type="submit">
                  <Check size={16} strokeWidth={2.25} aria-hidden />
                  Save
                </Button>
              </div>
            ) : null
          }
        />
      </form>
    </article>
  )
}
