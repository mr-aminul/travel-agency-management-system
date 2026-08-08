import { useEffect, useState, type FormEvent } from 'react'
import { Button, Input, SideDrawer } from '@/components/ui'
import {
  documentExpiryFromFields,
  getDocumentForm,
  summarizeDocumentFields,
  validateDocumentFields,
} from '@/lib/caseDocumentForms'
import { recordCaseDocument } from '@/lib/casesStore'
import type { CaseDocument } from '@/types/case'

type DocumentUploadModalProps = {
  open: boolean
  caseId: string
  document: CaseDocument | null
  onClose: () => void
}

export function DocumentUploadModal({
  open,
  caseId,
  document,
  onClose,
}: DocumentUploadModalProps) {
  const form = document ? getDocumentForm(document.id) : null
  const [fields, setFields] = useState<Record<string, string>>({})
  const [fileName, setFileName] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [triedSubmit, setTriedSubmit] = useState(false)

  useEffect(() => {
    if (!open || !document) return
    const nextForm = getDocumentForm(document.id)
    const initial: Record<string, string> = { ...(document.fields ?? {}) }
    // Prefill expiry field from stored expiry when present.
    if (nextForm.fields.some((field) => field.key === 'expiry') && document.expiry) {
      initial.expiry = initial.expiry || document.expiry
    }
    setFields(initial)
    setFileName(document.fileName ?? '')
    setErrors({})
    setTriedSubmit(false)
  }, [open, document])

  if (!document || !form) return null

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    setTriedSubmit(true)
    const nextErrors = validateDocumentFields(form, fields)
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    recordCaseDocument(caseId, document.id, {
      fields,
      fileName: fileName.trim() || undefined,
      detail: summarizeDocumentFields(form, fields),
      expiry: documentExpiryFromFields(form, fields),
    })
    onClose()
  }

  return (
    <SideDrawer
      open={open}
      onClose={onClose}
      title={document.name}
      className="pd-doc-drawer"
      footer={
        <div className="pd-step-drawer__footer">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="pd-doc-upload-form">
            Save
          </Button>
        </div>
      }
    >
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
          <span className="pd-doc-modal__file-label">Scan (optional)</span>
          <span className="pd-doc-modal__file-btn">
            {fileName || 'Choose file'}
            <input
              type="file"
              onChange={(event) => {
                setFileName(event.target.files?.[0]?.name ?? '')
              }}
            />
          </span>
        </label>
      </form>
    </SideDrawer>
  )
}
