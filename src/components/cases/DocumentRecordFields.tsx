import type { FormEvent, ReactNode } from 'react'
import { FileViewer } from '@/components/cases/FileViewer'
import { formatDisplayDate } from '@/lib/formatDate'
import type { DocumentFormDef } from '@/lib/caseDocumentForms'
import type { CaseDocument } from '@/types/case'
import { FileDropzone } from '@/components/shadcn/file-dropzone'
import { Input, Select } from '@/components/clients/clientShadcnFields'
import { cn } from '@/lib/utils'

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
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-[0.6875rem] font-medium text-muted-foreground">
        {label}
      </dt>
      <dd className="m-0 text-sm">
        {isDate ? formatDisplayDate(value) : value || '-'}
      </dd>
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
  compact = false,
  fillPreview = false,
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
  compact?: boolean
  /** Preview grows into leftover sheet height; fields stay visible. */
  fillPreview?: boolean
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

  const fieldGridClass = cn(
    'm-0 grid sm:grid-cols-2',
    compact ? 'gap-x-4 gap-y-2' : 'gap-3',
  )

  const fieldBlock = isView ? (
    <dl className={fieldGridClass}>
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
    <div className={fieldGridClass}>
      {form.fields.map((field) =>
        field.type === 'select' ? (
          <Select
            key={field.key}
            label={field.label}
            required={field.required}
            compact={compact}
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
            compact={compact}
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

  /** Same bordered preview stage passport / NID use in the right sheet. */
  const documentStageClass = cn(
    'relative flex overflow-hidden rounded-xl border border-border/90 bg-[color-mix(in_srgb,var(--muted)_55%,var(--background))] shadow-[inset_0_1px_0_color-mix(in_srgb,var(--foreground)_4%,transparent),inset_0_0_0_1px_color-mix(in_srgb,var(--foreground)_5%,transparent)]',
    fillPreview
      ? 'min-h-64 flex-1'
      : compact
        ? 'min-h-64'
        : 'min-h-[28rem]',
    highlightNeedsFile &&
      'border-[color-mix(in_srgb,var(--color-danger)_45%,var(--color-border))]',
  )

  const fileBlock = isView ? (
    hasFile ? (
      <FileViewer
        fileId={fileId}
        fileName={fileName || document.detail}
        mimeType={mimeType}
        hideMeta={hideFileMeta}
        compact={compact}
        fill={fillPreview}
      />
    ) : hideFileMeta ? (
      <div className={cn(documentStageClass, 'items-center justify-center p-4')}>
        <p className="m-0 text-sm text-muted-foreground">No file attached.</p>
      </div>
    ) : (
      <p className="m-0 text-sm text-muted-foreground">No file attached.</p>
    )
  ) : hasFile ? (
    <FileViewer
      fileId={fileId}
      fileName={fileName}
      mimeType={mimeType}
      hideMeta={hideFileMeta}
      compact={compact}
      fill={fillPreview}
      onUpload={onAttachFile}
      onDelete={onRemoveFile}
    />
  ) : hideFileMeta ? (
    <div className={cn(documentStageClass, 'items-center justify-center p-3')}>
      <div className="w-full max-w-sm">
        <FileDropzone onFile={onAttachFile} />
      </div>
    </div>
  ) : (
    <div
      className={cn(
        highlightNeedsFile &&
          'rounded-xl border border-[color-mix(in_srgb,var(--color-danger)_45%,var(--color-border))]',
      )}
    >
      <FileDropzone onFile={onAttachFile} />
    </div>
  )

  const fieldsWithActions = (
    <div className={cn('shrink-0', fillPreview && 'pt-0.5')}>
      {fieldBlock}
      {afterFields}
    </div>
  )

  const labeledFile =
    isView && hasFile && !hideFileMeta ? (
      <div
        className={cn(
          'flex flex-col gap-2',
          fillPreview && 'min-h-0 flex-1',
        )}
      >
        <p className="m-0 shrink-0 text-xs font-semibold text-muted-foreground">
          File
        </p>
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

  const stackClass = cn(
    'flex flex-col',
    compact ? 'gap-2.5' : 'gap-3',
    fillPreview && 'min-h-full flex-1',
  )

  if (isView || embedded) {
    // Parent form/article owns spacing; keep preview + fields as flex siblings.
    return <>{body}</>
  }

  return (
    <form id={formId} className={stackClass} onSubmit={onSubmit} noValidate>
      {body}
    </form>
  )
}
