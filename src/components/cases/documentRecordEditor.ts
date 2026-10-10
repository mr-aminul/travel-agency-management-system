import { useEffect, useState } from 'react'
import {
  documentExpiryFromFields,
  getDocumentForm,
  summarizeDocumentFields,
  validateDocumentFields,
} from '@/lib/caseDocumentForms'
import { recordCaseDocument, recordIdentityDocument } from '@/lib/casesStore'
import type { IdentityKind } from '@/lib/clientDocuments'
import { useDocumentFormFieldsVersion } from '@/lib/documentFormFieldsStore'
import { storeFile } from '@/lib/fileStore'
import type { CaseDocument } from '@/types/case'

export type DocumentDrawerMode = 'view' | 'edit'

export function useDocumentRecordEditor(document: CaseDocument | null) {
  // Re-read field schemas when Settings → Document fields changes.
  const formVersion = useDocumentFormFieldsVersion()
  const form = document ? getDocumentForm(document.id) : null
  const [fields, setFields] = useState<Record<string, string>>({})
  const [fileName, setFileName] = useState('')
  const [fileId, setFileId] = useState<string | undefined>()
  const [mimeType, setMimeType] = useState<string | undefined>()
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [triedSubmit, setTriedSubmit] = useState(false)
  const [baseline, setBaseline] = useState<{
    fields: Record<string, string>
    fileName: string
    fileId?: string
    mimeType?: string
  }>({ fields: {}, fileName: '' })

  const documentKey = document
    ? [
        document.id,
        document.status,
        document.fileId ?? '',
        document.detail,
        JSON.stringify(document.fields ?? {}),
        String(formVersion),
      ].join(':')
    : ''

  useEffect(() => {
    if (!document) return
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
    setBaseline({
      fields: initial,
      fileName: document.fileName ?? '',
      fileId: document.fileId,
      mimeType: document.mimeType,
    })
    // Reset from the stored record identity, not the new object each render.
  }, [documentKey])

  const attachFile = (file: File) => {
    const stored = storeFile(file)
    setFileName(stored.fileName)
    setFileId(stored.id)
    setMimeType(stored.mimeType)
  }

  const clearFile = () => {
    setFileName('')
    setFileId(undefined)
    setMimeType(undefined)
  }

  const updateField = (key: string, value: string) => {
    setFields((current) => ({ ...current, [key]: value }))
    if (errors[key]) {
      setErrors((current) => {
        const next = { ...current }
        delete next[key]
        return next
      })
    }
  }

  const save = ({
    caseId,
    clientId,
    identityKind,
  }: {
    caseId?: string
    clientId?: string
    identityKind?: IdentityKind
  }) => {
    if (!document || !form) return false
    setTriedSubmit(true)
    const nextErrors = validateDocumentFields(form, fields)
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return false
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
    return true
  }

  const discard = () => {
    setFields({ ...baseline.fields })
    setFileName(baseline.fileName)
    setFileId(baseline.fileId)
    setMimeType(baseline.mimeType)
    setErrors({})
    setTriedSubmit(false)
  }

  const fieldKeys = new Set([
    ...Object.keys(fields),
    ...Object.keys(baseline.fields),
  ])
  const fieldsDirty = [...fieldKeys].some(
    (key) => (fields[key] ?? '') !== (baseline.fields[key] ?? ''),
  )
  const isDirty =
    fieldsDirty ||
    fileName !== baseline.fileName ||
    fileId !== baseline.fileId

  return {
    form,
    fields,
    fileName,
    fileId,
    mimeType,
    errors,
    triedSubmit,
    hasFile: Boolean(fileName || fileId),
    isDirty,
    attachFile,
    clearFile,
    updateField,
    discard,
    save,
  }
}
