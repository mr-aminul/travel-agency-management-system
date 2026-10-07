import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { FileViewer } from '@/components/cases/FileViewer'
import { getStepDef, templateCountry } from '@/lib/caseChecklist'
import { Button, FileDropzone, Input, SideDrawer, Textarea } from '@/components/ui'
import {
  getCaseStepRequirement,
  splitStepUploads,
} from '@/lib/caseStepRequirementResolve'
import type {
  StepCompletionInput,
  StepUploadDef,
  StepUploadValue,
} from '@/lib/caseStepRequirements'
import {
  clientProgressBlockers,
  progressBlockedMessage,
} from '@/lib/clientMissingInfo'
import { getClientById } from '@/lib/clientsStore'
import { formatDisplayDate, formatDisplayDateTime } from '@/lib/formatDate'
import { updateCaseStep } from '@/lib/casesStore'
import { completeCaseStepWithSync } from '@/lib/caseWorkflow'
import { storeFile } from '@/lib/fileStore'
import type { Case } from '@/types/case'

export type StepDrawerMode = 'complete' | 'view' | 'edit'

export type StepCompletionDrawerProps = {
  open: boolean
  item: Case
  stepId: string | null
  mode: StepDrawerMode
  onModeChange?: (mode: StepDrawerMode) => void
  onClose: () => void
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

type UploadDraft = {
  fileName: string
  fileId?: string
  mimeType?: string
}

function draftFromCaseDoc(
  item: Case,
  upload: StepUploadDef,
): UploadDraft | undefined {
  if (!upload.documentId) return undefined
  const doc = item.documents.find((entry) => entry.id === upload.documentId)
  if (!doc) return undefined
  const onFile =
    Boolean(doc.fileName?.trim()) ||
    doc.status === 'approved' ||
    doc.status === 'under_review'
  if (!onFile) return undefined
  return {
    fileName: doc.fileName?.trim() || doc.detail || doc.name,
    fileId: doc.fileId,
    mimeType: doc.mimeType,
  }
}

function UploadBlocks({
  uploads,
  title,
  drafts,
  triedSubmit,
  errors,
  readOnly,
  onPick,
  onClear,
}: {
  uploads: StepUploadDef[]
  title: string
  drafts: Record<string, UploadDraft>
  triedSubmit: boolean
  errors: Record<string, string>
  readOnly?: boolean
  onPick?: (key: string, draft: UploadDraft) => void
  onClear?: (key: string) => void
}) {
  if (uploads.length === 0) return null

  if (readOnly) {
    return (
      <div className="pd-step-view__files-block">
        <p className="pd-step-panel__uploads-title">{title}</p>
        {uploads.map((upload) => {
          const draft = drafts[upload.key]
          return (
            <div key={upload.key} className="pd-step-view__attachment">
              <p className="pd-step-view__attachment-label">{upload.label}</p>
              <FileViewer
                fileId={draft?.fileId}
                fileName={draft?.fileName}
                mimeType={draft?.mimeType}
                compact
              />
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="pd-step-panel__uploads">
      <p className="pd-step-panel__uploads-title">{title}</p>
      {uploads.map((upload) => {
        const errorKey = `upload:${upload.key}`
        const draft = drafts[upload.key]
        return (
          <div key={upload.key} className="pd-step-panel__upload-block">
            <div className="pd-step-panel__upload">
              <span className="pd-step-panel__upload-label">
                {upload.label}
                {upload.required ? ' *' : ''}
              </span>
              {draft?.fileId ? (
                <FileViewer
                  fileId={draft.fileId}
                  fileName={draft.fileName}
                  mimeType={draft.mimeType}
                  compact
                  onUpload={
                    onPick
                      ? (file) => {
                          const stored = storeFile(file)
                          onPick(upload.key, {
                            fileName: stored.fileName,
                            fileId: stored.id,
                            mimeType: stored.mimeType,
                          })
                        }
                      : undefined
                  }
                  onDelete={
                    onClear ? () => onClear(upload.key) : undefined
                  }
                />
              ) : (
                <FileDropzone
                  label={upload.label}
                  onFile={(file) => {
                    if (!onPick) return
                    const stored = storeFile(file)
                    onPick(upload.key, {
                      fileName: stored.fileName,
                      fileId: stored.id,
                      mimeType: stored.mimeType,
                    })
                  }}
                />
              )}
              {triedSubmit && errors[errorKey] ? (
                <span className="pd-field__error" role="alert">
                  {errors[errorKey]}
                </span>
              ) : null}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function StepCompletionDrawer({
  open,
  item,
  stepId,
  mode,
  onModeChange,
  onClose,
}: StepCompletionDrawerProps) {
  const activeStepId = stepId
  const requirement = activeStepId
    ? getCaseStepRequirement(item, activeStepId)
    : undefined
  const stepDef = activeStepId
    ? getStepDef(item.service, activeStepId, templateCountry(item))
    : undefined
  const { requiredDocs, attachments } = requirement
    ? splitStepUploads(requirement)
    : { requiredDocs: [], attachments: [] }

  const [fields, setFields] = useState<Record<string, string>>({})
  const [uploads, setUploads] = useState<Record<string, UploadDraft>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [triedSubmit, setTriedSubmit] = useState(false)

  useEffect(() => {
    if (!open || !requirement || !activeStepId) return
    const record = item.steps[activeStepId]
    setFields({ ...(record?.fields ?? {}) })
    const nextUploads: Record<string, UploadDraft> = {}
    for (const upload of requirement.uploads) {
      const existing = record?.uploads?.find(
        (itemUpload) => itemUpload.key === upload.key,
      )
      const fromCase = draftFromCaseDoc(item, upload)
      nextUploads[upload.key] = {
        fileName: existing?.fileName || fromCase?.fileName || '',
        fileId: existing?.fileId || fromCase?.fileId,
        mimeType: existing?.mimeType || fromCase?.mimeType,
      }
    }
    setUploads(nextUploads)
    setErrors({})
    setTriedSubmit(false)
  }, [open, activeStepId, item.steps, item.documents, requirement, mode])

  if (!requirement || !stepDef || !activeStepId) return null

  const isView = mode === 'view'
  const isComplete = mode === 'complete'
  const canEditCase =
    item.status !== 'Completed' && item.status !== 'Cancelled'
  const client = getClientById(item.clientId)
  const profileBlockers = client ? clientProgressBlockers(client) : []
  const profileBlockedMessage =
    isComplete && profileBlockers.length > 0
      ? progressBlockedMessage(profileBlockers)
      : ''

  const clearError = (key: string) => {
    setErrors((current) => {
      if (!current[key]) return current
      const next = { ...current }
      delete next[key]
      return next
    })
  }

  const buildInput = (): StepCompletionInput => {
    const nextUploads: StepUploadValue[] = []
    for (const upload of requirement.uploads) {
      const draft = uploads[upload.key]
      if (!draft?.fileName.trim()) continue
      nextUploads.push({
        key: upload.key,
        fileName: draft.fileName.trim(),
        fileId: draft.fileId,
        mimeType: draft.mimeType,
      })
    }
    return { fields, uploads: nextUploads }
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    setTriedSubmit(true)
    const input = buildInput()

    const result = isComplete
      ? completeCaseStepWithSync(item.id, input)
      : updateCaseStep(item.id, activeStepId, input)

    if (!result.ok) {
      setErrors(result.errors)
      return
    }

    if (isComplete) onClose()
    else onModeChange?.('view')
  }

  const title = isView
    ? stepDef.label
    : isComplete
      ? `Complete: ${stepDef.label}`
      : `Edit: ${stepDef.label}`

  const uploadSection = (readOnly: boolean): ReactNode => (
    <>
      <UploadBlocks
        uploads={requiredDocs}
        title="Required docs"
        drafts={uploads}
        triedSubmit={triedSubmit}
        errors={errors}
        readOnly={readOnly}
        onPick={(key, draft) => {
          setUploads((current) => ({ ...current, [key]: draft }))
          clearError(`upload:${key}`)
        }}
        onClear={(key) => {
          setUploads((current) => {
            const next = { ...current }
            delete next[key]
            return next
          })
        }}
      />
      <UploadBlocks
        uploads={attachments}
        title="Attachments"
        drafts={uploads}
        triedSubmit={triedSubmit}
        errors={errors}
        readOnly={readOnly}
        onPick={(key, draft) => {
          setUploads((current) => ({ ...current, [key]: draft }))
          clearError(`upload:${key}`)
        }}
        onClear={(key) => {
          setUploads((current) => {
            const next = { ...current }
            delete next[key]
            return next
          })
        }}
      />
    </>
  )

  return (
    <SideDrawer
      open={open}
      onClose={onClose}
      title={title}
      description={
        isView
          ? item.steps[activeStepId]?.detail || 'Saved step details'
          : requirement.help
      }
      className="pd-step-drawer"
      footer={
        <div className="pd-step-drawer__footer">
          {isView ? (
            <>
              <Button type="button" variant="secondary" onClick={onClose}>
                Close
              </Button>
              {canEditCase ? (
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
                  if (mode === 'edit') onModeChange?.('view')
                  else onClose()
                }}
              >
                Cancel
              </Button>
              <Button type="submit" form="pd-step-complete-form">
                {isComplete ? 'Mark complete' : 'Save changes'}
              </Button>
            </>
          )}
        </div>
      }
    >
      {isView ? (
        <div className="pd-step-view">
          {item.steps[activeStepId]?.completedAt ? (
            <p className="pd-step-view__meta">
              Completed {formatDisplayDateTime(item.steps[activeStepId].completedAt)}
            </p>
          ) : null}

          <dl className="pd-step-view__fields">
            {requirement.fields.map((field) => (
              <ReadOnlyField
                key={field.key}
                label={field.label}
                value={fields[field.key] ?? ''}
                isDate={field.type === 'date'}
              />
            ))}
          </dl>

          {uploadSection(true)}

          {!requirement.fields.length && !requirement.uploads.length ? (
            <p className="pd-step-view__empty">No details recorded.</p>
          ) : null}
        </div>
      ) : (
        <form
          id="pd-step-complete-form"
          className="pd-step-panel__form"
          onSubmit={handleSubmit}
          noValidate
        >
          {profileBlockedMessage ? (
            <p className="pd-field__error" role="alert">
              {profileBlockedMessage}
            </p>
          ) : null}

          {errors.form ? (
            <p className="pd-field__error" role="alert">
              {errors.form}
            </p>
          ) : null}

          {requirement.fields.map((field) =>
            field.type === 'textarea' ? (
              <Textarea
                key={field.key}
                className="pd-step-panel__full"
                label={field.label}
                required={field.required}
                rows={3}
                value={fields[field.key] ?? ''}
                placeholder={field.placeholder}
                onChange={(event) => {
                  setFields((current) => ({
                    ...current,
                    [field.key]: event.target.value,
                  }))
                  clearError(field.key)
                }}
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
                onChange={(event) => {
                  setFields((current) => ({
                    ...current,
                    [field.key]: event.target.value,
                  }))
                  clearError(field.key)
                }}
                error={triedSubmit ? errors[field.key] : undefined}
              />
            ),
          )}

          {uploadSection(false)}
        </form>
      )}
    </SideDrawer>
  )
}
