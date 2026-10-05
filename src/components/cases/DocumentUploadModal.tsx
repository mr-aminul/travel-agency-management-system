import { useEffect, useState, type FormEvent } from 'react'
import { FileViewer } from '@/components/cases/FileViewer'
import { Button, Input, SideDrawer } from '@/components/ui'
import {
  documentExpiryFromFields,
  getDocumentForm,
  summarizeDocumentFields,
  validateDocumentFields,
} from '@/lib/caseDocumentForms'
import { recordCaseDocument, recordIdentityDocument } from '@/lib/casesStore'
import type { IdentityKind } from '@/lib/clientDocuments'
import { formatDisplayDate } from '@/lib/formatDate'
import { storeFile } from '@/lib/fileStore'
import type { CaseDocument } from '@/types/case'

export type DocumentDrawerMode = 'view' | 'edit'

type DocumentUploadModalProps = {
  open: boolean
  caseId?: string
  clientId?: string
  identityKind?: IdentityKind
  document: CaseDocument | null
  mode?: DocumentDrawerMode
  onModeChange?: (mode: DocumentDrawerMode) => void
  onClose: () => void
  canEdit?: boolean
}

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

export function DocumentUploadModal({
  open,
  caseId,
  clientId,
  identityKind,
  document,
  mode = 'edit',
  onModeChange,
  onClose,
  canEdit = true,
}: DocumentUploadModalProps) {
  const form = document ? getDocumentForm(document.id) : null
  const [fields, setFields] = useState<Record<string, string>>({})
  const [fileName, setFileName] = useState('')
  const [fileId, setFileId] = useState<string | undefined>()
  const [mimeType, setMimeType] = useState<string | undefined>()
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [triedSubmit, setTriedSubmit] = useState(false)

  useEffect(() => {
    if (!open || !document) return
    const nextForm = getDocumentForm(document.id)
    const initial: Record<string, string> = { ...(document.fields ?? {}) }
    if (
      nextForm.fields.some((field) => field.key === 'expiry') &&
      document.expiry
    ) {
      initial.expiry = initial.expiry || document.expiry
    }
    setFields(initial)
    setFileName(document.fileName ?? '')
    setFileId(document.fileId)
    setMimeType(document.mimeType)
    setErrors({})
    setTriedSubmit(false)
  }, [open, document, mode])

  if (!document || !form) return null

  const isView = mode === 'view'
  const hasFile = Boolean(fileName || fileId)

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    setTriedSubmit(true)
    const nextErrors = validateDocumentFields(form, fields)
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    if (identityKind && clientId) {
      recordIdentityDocument(clientId, identityKind, {
        fields,
        fileName: fileName.trim() || undefined,
        fileId,
        mimeType,
        detail: summarizeDocumentFields(form, fields),
        expiry: documentExpiryFromFields(form, fields),
      })
    } else if (caseId) {
      recordCaseDocument(caseId, document.id, {
        fields,
        fileName: fileName.trim() || undefined,
        fileId,
        mimeType,
        detail: summarizeDocumentFields(form, fields),
        expiry: documentExpiryFromFields(form, fields),
      })
    }
    if (onModeChange) onModeChange('view')
    else onClose()
  }

  return (
    <SideDrawer
      open={open}
      onClose={onClose}
      title={document.name}
      description={isView ? 'Document details' : 'Enter document details'}
      className="pd-doc-drawer"
      footer={
        <div className="pd-step-drawer__footer">
          {isView ? (
            <>
              <Button type="button" variant="secondary" onClick={onClose}>
                Close
              </Button>
              {canEdit ? (
                <Button type="button" onClick={() => onModeChange?.('edit')}>
                  Edit
                </Button>
              ) : null}
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  if (onModeChange && document.status !== 'missing') {
                    onModeChange('view')
                  } else {
                    onClose()
                  }
                }}
              >
                Cancel
              </Button>
              <Button type="submit" form="pd-doc-upload-form">
                Save
              </Button>
            </>
          )}
        </div>
      }
    >
      {isView ? (
        <div className="pd-step-view">
          <dl className="pd-step-view__fields">
            {form.fields.map((field) => (
              <ReadOnlyField
                key={field.key}
                label={field.label}
                value={fields[field.key] ?? ''}
                isDate={field.type === 'date'}
              />
            ))}
            {document.detail && document.detail !== fileName ? (
              <ReadOnlyField label="Summary" value={document.detail} />
            ) : null}
          </dl>

          {hasFile ? (
            <div className="pd-step-view__files-block">
              <p className="pd-step-panel__uploads-title">File</p>
              <FileViewer
                fileId={fileId}
                fileName={fileName || document.detail}
                mimeType={mimeType}
              />
            </div>
          ) : (
            <p className="pd-step-view__empty">No file attached.</p>
          )}
        </div>
      ) : (
        <form
          id="pd-doc-upload-form"
          className="pd-doc-modal__form"
          onSubmit={handleSubmit}
          noValidate
        >
          {form.fields.map((field) => (
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
              onChange={(event) => {
                setFields((current) => ({
                  ...current,
                  [field.key]: event.target.value,
                }))
                if (errors[field.key]) {
                  setErrors((current) => {
                    const next = { ...current }
                    delete next[field.key]
                    return next
                  })
                }
              }}
              error={triedSubmit ? errors[field.key] : undefined}
            />
          ))}

          <label className="pd-doc-modal__file">
            <span className="pd-doc-modal__file-label">Scan / file</span>
            <span className="pd-doc-modal__file-btn">
              {fileName || 'Choose file'}
              <input
                type="file"
                accept="image/*,.pdf,application/pdf,text/*,.doc,.docx,.xls,.xlsx"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (!file) return
                  const stored = storeFile(file)
                  setFileName(stored.fileName)
                  setFileId(stored.id)
                  setMimeType(stored.mimeType)
                }}
              />
            </span>
          </label>

          {fileId ? (
            <FileViewer
              fileId={fileId}
              fileName={fileName}
              mimeType={mimeType}
              compact
            />
          ) : null}
        </form>
      )}
    </SideDrawer>
  )
}
