import { useId, type FormEvent } from 'react'
import { Check } from 'lucide-react'
import { DocumentRecordFields } from '@/components/cases/DocumentRecordFields'
import { useDocumentRecordEditor } from '@/components/cases/documentRecordEditor'
import { documentIcon } from '@/lib/caseDocuments'
import { documentHasFile, type IdentityKind } from '@/lib/clientDocuments'
import type { CaseDocument } from '@/types/case'
import { Badge } from '@/components/shadcn/badge'
import { cn } from '@/lib/utils'
import { Button } from '@/components/shadcn/button'

function statusCopy(
  document: CaseDocument,
  locked: boolean,
  hasFile: boolean,
): {
  label: string
  variant: 'default' | 'secondary' | 'destructive'
} {
  if (locked) return { label: 'Later', variant: 'secondary' }
  if (!hasFile) {
    return document.required
      ? { label: 'Needed', variant: 'destructive' }
      : { label: 'Optional', variant: 'secondary' }
  }
  if (document.status === 'approved') return { label: 'Uploaded', variant: 'default' }
  if (document.status === 'under_review') {
    return { label: 'In Review', variant: 'secondary' }
  }
  return { label: 'Missing', variant: 'secondary' }
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
  const needsFile = allowEdit && !hasFile && document.required === true

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    editor.save({ caseId, clientId, identityKind })
  }

  if (!editor.form) return null

  return (
    <article
      className={cn(
        'flex flex-col gap-3 rounded-xl border border-border bg-background p-4',
        needsFile &&
          'border-[color-mix(in_srgb,var(--color-danger)_45%,var(--color-border))]',
      )}
      aria-label={document.name}
    >
      <header className="flex items-center gap-2">
        <span
          className={cn(
            'inline-flex size-8 items-center justify-center rounded-lg bg-muted',
            needsFile && 'bg-destructive/10 text-destructive',
          )}
          aria-hidden
        >
          <Icon size={16} strokeWidth={2.25} />
        </span>
        <h2 className="m-0 min-w-0 flex-1 text-base font-semibold">
          {document.name}
        </h2>
        <Badge variant={status.variant}>{status.label}</Badge>
      </header>
      {hint ? (
        <p className="m-0 text-sm text-muted-foreground">{hint}</p>
      ) : null}

      <form
        id={formId}
        className="flex flex-col gap-3"
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
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 rounded-lg"
                  onClick={editor.discard}
                >
                  Discard Changes
                </Button>
                <Button type="submit" className="h-9 rounded-lg">
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
