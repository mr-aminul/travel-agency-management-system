import type { FormEvent, ReactNode } from 'react'
import { FileViewer } from '@/components/cases/FileViewer'
import { formatDisplayDate } from '@/lib/formatDate'
import type { DocumentFormDef } from '@/lib/caseDocumentForms'
import type { CaseDocument } from '@/types/case'
import { FileDropzone, Input, Select } from '@/components/ui'

function ReadOnlyField({
  label,
  value,
  isDate,
}: {
  label: string
  value: string
  isDate?: boolean
}) {
  return (
    <div className="pd-step-view__field">
      <dt>{label}</dt>
      <dd>{isDate ? formatDisplayDate(value) : value || '—'}</dd>
    </div>
  )
}

export function DocumentRecordFields({
  document,
  form,
  mode,
  fields,
  fileName,
  fileId,
  mimeType,
  errors,
  triedSubmit,
  formId,
  onFieldChange,
  onAttachFile,
  onRemoveFile,
  onSubmit,
  fileFirst = false,
  embedded = false,
  hideFileMeta = false,
  highlightNeedsFile = false,
  afterFields,
}: {
  document: CaseDocument
  form: DocumentFormDef
  mode: 'view' | 'edit'
  fields: Record<string, string>
  fileName: string
  fileId?: string
  mimeType?: string
  errors: Record<string, string>
  triedSubmit: boolean
  formId: string
  onFieldChange: (key: string, value: string) => void
  onAttachFile: (file: File) => void
  onRemoveFile?: () => void
  onSubmit?: (event: FormEvent) => void
  fileFirst?: boolean
  embedded?: boolean
  hideFileMeta?: boolean
  /** Soft highlight on the dropzone when a scan is still required. */
  highlightNeedsFile?: boolean
  afterFields?: ReactNode
}) {
  const isView = mode === 'view'
  const hasFile = Boolean(fileName || fileId)

  const fieldValues = form.fields.flatMap((field) => {
    const value = (fields[field.key] ?? '').trim()
    if (!value) return []
    return field.type === 'date' ? [value, formatDisplayDate(value, value)] : [value]
  })
  const summary = document.detail?.trim()
  const showSummary = Boolean(
    summary &&
      summary !== fileName &&
      !fieldValues.some((value) => summary === value || summary.includes(value)),
  )

  const fieldBlock = isView ? (
    <dl className="pd-step-view__fields pd-doc-inspect__fields">
      {form.fields.map((field) => (
        <ReadOnlyField
          key={field.key}
          label={field.label}
          value={fields[field.key] ?? ''}
          isDate={field.type === 'date'}
        />
      ))}
      {showSummary ? <ReadOnlyField label="Summary" value={summary ?? ''} /> : null}
    </dl>
  ) : (
    <div className="pd-doc-inspect__form-fields">
      {form.fields.map((field) =>
        field.type === 'select' ? (
          <Select
            key={field.key}
            label={field.label}
            required={field.required}
            value={fields[field.key] ?? ''}
            placeholder={field.placeholder || 'Choose…'}
            options={(field.options ?? []).map((option) => ({
              value: option,
              label: option,
            }))}
            onChange={(event) => onFieldChange(field.key, event.target.value)}
            error={triedSubmit ? errors[field.key] : undefined}
          />
        ) : (
          <Input
            key={field.key}
            label={field.label}
            required={field.required}
            type={
              field.type === 'date'
                ? 'date'
                : field.type === 'number'
                  ? 'number'
                  : 'text'
            }
            inputMode={field.type === 'number' ? 'decimal' : undefined}
            value={fields[field.key] ?? ''}
            placeholder={field.placeholder}
            onChange={(event) => onFieldChange(field.key, event.target.value)}
            error={triedSubmit ? errors[field.key] : undefined}
          />
        ),
      )}
    </div>
  )

  const fileBlock = isView ? (
    hasFile ? (
      <FileViewer
        fileId={fileId}
        fileName={fileName || document.detail}
        mimeType={mimeType}
        hideMeta={hideFileMeta}
      />
    ) : (
      <p className="pd-step-view__empty">No file attached.</p>
    )
  ) : hasFile ? (
    <FileViewer
      fileId={fileId}
      fileName={fileName}
      mimeType={mimeType}
      hideMeta={hideFileMeta}
      onUpload={onAttachFile}
      onDelete={onRemoveFile}
    />
  ) : (
    <div
      className={
        highlightNeedsFile ? 'pd-doc-inspect__drop is-attention' : undefined
      }
    >
      <FileDropzone onFile={onAttachFile} />
    </div>
  )

  const fieldsWithActions = (
    <>
      {fieldBlock}
      {afterFields}
    </>
  )

  const labeledFile =
    isView && hasFile && !hideFileMeta ? (
      <div className="pd-step-view__files-block">
        <p className="pd-step-panel__uploads-title">File</p>
        {fileBlock}
      </div>
    ) : (
      fileBlock
    )

  const body = fileFirst ? (
    <>
      {fileBlock}
      {fieldsWithActions}
    </>
  ) : (
    <>
      {fieldsWithActions}
      {labeledFile}
    </>
  )

  if (isView || embedded) {
    return <>{body}</>
  }

  return (
    <form
      id={formId}
      className="pd-doc-modal__form"
      onSubmit={onSubmit}
      noValidate
    >
      {body}
    </form>
  )
}
