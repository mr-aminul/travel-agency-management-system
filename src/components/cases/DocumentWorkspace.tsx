import { useId, type FormEvent } from 'react'
import { Check } from 'lucide-react'
import { DocumentRecordFields } from '@/components/cases/DocumentRecordFields'
import { useDocumentRecordEditor } from '@/components/cases/documentRecordEditor'
import { documentIcon } from '@/lib/caseDocuments'
import type { IdentityKind } from '@/lib/clientDocuments'
import type { CaseDocument } from '@/types/case'
import '@/styles/layout-cases.css'
import { Badge, Button, type BadgeVariant } from '@/components/ui'
import { documentHasFile } from '@/lib/clientDocuments'

function statusCopy(
  document: CaseDocument,
  locked: boolean,
  hasFile: boolean,
): {
  label: string
  variant: BadgeVariant
} {
  if (locked) return { label: 'Later', variant: 'on-hold' }
  // Number-only / under_review without a scan still needs a file.
  if (!hasFile) return { label: 'Needed', variant: 'danger' }
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
  const hasFile = documentHasFile({
    fileId: editor.fileId ?? document.fileId,
    fileName: editor.fileName || document.fileName,
  })
  const status = statusCopy(document, locked, hasFile)
  const allowEdit = canEdit && !locked
  const mode = allowEdit ? 'edit' : 'view'
  const needsFile = allowEdit && !hasFile

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    editor.save({ caseId, clientId, identityKind })
  }

  if (!editor.form) return null

  return (
    <article
      className={['pd-doc-inspect', needsFile ? 'is-attention' : '']
        .filter(Boolean)
        .join(' ')}
      aria-label={document.name}
    >
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
          highlightNeedsFile={needsFile}
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
