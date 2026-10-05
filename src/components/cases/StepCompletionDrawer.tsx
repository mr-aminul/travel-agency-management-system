import { useEffect, useState, type FormEvent } from 'react'
import { FileViewer } from '@/components/cases/FileViewer'
import { Button, Input, SideDrawer, Textarea } from '@/components/ui'
import { getStepDef, templateCountry } from '@/lib/caseChecklist'
import { getStepRequirement, type StepCompletionInput, type StepUploadValue } from '@/lib/caseStepRequirements'
import { formatDisplayDate } from '@/lib/formatDate'
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
    ? getStepRequirement(item.service, activeStepId)
    : undefined
  const stepDef = activeStepId
    ? getStepDef(item.service, activeStepId, templateCountry(item))
    : undefined

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
      nextUploads[upload.key] = {
        fileName: existing?.fileName ?? '',
        fileId: existing?.fileId,
        mimeType: existing?.mimeType,
      }
    }
    setUploads(nextUploads)
    setErrors({})
    setTriedSubmit(false)
  }, [open, activeStepId, item.steps, requirement, mode])

  if (!requirement || !stepDef || !activeStepId) return null

  const isView = mode === 'view'
  const isComplete = mode === 'complete'
  const canEditCase =
    item.status !== 'Completed' && item.status !== 'Cancelled'

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
              Completed {formatDisplayDate(item.steps[activeStepId].completedAt)}
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

          {requirement.uploads.length > 0 ? (
            <div className="pd-step-view__files-block">
              <p className="pd-step-panel__uploads-title">Attachments</p>
              {requirement.uploads.map((upload) => {
                const draft = uploads[upload.key]
                return (
                  <div key={upload.key} className="pd-step-view__attachment">
                    <p className="pd-step-view__attachment-label">
                      {upload.label}
                    </p>
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
          ) : null}

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

          {requirement.uploads.length > 0 ? (
            <div className="pd-step-panel__uploads">
              <p className="pd-step-panel__uploads-title">Attachments</p>
              {requirement.uploads.map((upload) => {
                const errorKey = `upload:${upload.key}`
                const draft = uploads[upload.key]
                return (
                  <div key={upload.key} className="pd-step-panel__upload-block">
                    <label className="pd-step-panel__upload">
                      <span className="pd-step-panel__upload-label">
                        {upload.label}
                        {upload.required ? ' *' : ''}
                      </span>
                      <span className="pd-doc-modal__file-btn">
                        {draft?.fileName || 'Choose file'}
                        <input
                          type="file"
                          accept="image/*,.pdf,application/pdf,text/*,.doc,.docx,.xls,.xlsx"
                          onChange={(event) => {
                            const file = event.target.files?.[0]
                            if (!file) return
                            const stored = storeFile(file)
                            setUploads((current) => ({
                              ...current,
                              [upload.key]: {
                                fileName: stored.fileName,
                                fileId: stored.id,
                                mimeType: stored.mimeType,
                              },
                            }))
                            clearError(errorKey)
                          }}
                        />
                      </span>
                      {triedSubmit && errors[errorKey] ? (
                        <span className="pd-field__error" role="alert">
                          {errors[errorKey]}
                        </span>
                      ) : null}
                    </label>
                    {draft?.fileId ? (
                      <FileViewer
                        fileId={draft.fileId}
                        fileName={draft.fileName}
                        mimeType={draft.mimeType}
                        compact
                      />
                    ) : null}
                  </div>
                )
              })}
            </div>
          ) : null}
        </form>
      )}
    </SideDrawer>
  )
}
