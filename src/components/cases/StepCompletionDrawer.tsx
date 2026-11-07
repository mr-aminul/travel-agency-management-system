import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { FileViewer } from '@/components/cases/FileViewer'
import {
  getStepDef,
  getStepDefsForCase,
  templateCountry,
} from '@/lib/caseChecklist'
import { floatingSheetClass } from '@/components/clients/shadcnChrome'
import { Input, Select, Textarea } from '@/components/clients/clientShadcnFields'
import { Button } from '@/components/shadcn/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/shadcn/dialog'
import { FileDropzone } from '@/components/shadcn/file-dropzone'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/shadcn/sheet'
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
import {
  clearCaseStepUpload,
  revertCaseToStep,
  updateCaseStep,
} from '@/lib/casesStore'
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

const STEP_COMPLETE_FORM_ID = 'step-complete-form'

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
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="text-xs font-semibold text-muted-foreground">{label}</dt>
      <dd className="m-0 text-sm">
        {isDate ? formatDisplayDate(value) : value || '-'}
      </dd>
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
      <div className="flex flex-col gap-3">
        <p className="m-0 text-sm font-medium">{title}</p>
        {uploads.map((upload) => {
          const draft = drafts[upload.key]
          const hasFile = Boolean(
            draft?.fileId || draft?.fileName?.trim(),
          )
          return (
            <div key={upload.key} className="flex flex-col gap-2">
              <p className="m-0 text-xs font-semibold text-muted-foreground">
                {upload.label}
              </p>
              {hasFile ? (
                <FileViewer
                  fileId={draft?.fileId}
                  fileName={draft?.fileName}
                  mimeType={draft?.mimeType}
                  compact
                  onDelete={
                    onClear ? () => onClear(upload.key) : undefined
                  }
                />
              ) : (
                <p className="m-0 text-sm text-muted-foreground">
                  No file attached.
                </p>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="m-0 text-sm font-medium">{title}</p>
      {uploads.map((upload) => {
        const errorKey = `upload:${upload.key}`
        const draft = drafts[upload.key]
        const hasFile = Boolean(draft?.fileId || draft?.fileName?.trim())
        return (
          <div key={upload.key} className="flex flex-col gap-2">
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-muted-foreground">
                {upload.label}
                {upload.required ? ' *' : ''}
              </span>
              {hasFile ? (
                <FileViewer
                  fileId={draft?.fileId}
                  fileName={draft?.fileName}
                  mimeType={draft?.mimeType}
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
                <span className="text-sm text-destructive" role="alert">
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
  const stepDef = activeStepId
    ? getStepDef(item.service, activeStepId, templateCountry(item))
    : undefined

  const [fields, setFields] = useState<Record<string, string>>({})
  const [uploads, setUploads] = useState<Record<string, UploadDraft>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [triedSubmit, setTriedSubmit] = useState(false)

  const requirement = activeStepId
    ? getCaseStepRequirement(item, activeStepId, fields)
    : undefined
  const { requiredDocs, attachments } = requirement
    ? splitStepUploads(requirement)
    : { requiredDocs: [], attachments: [] }

  useEffect(() => {
    if (!open || !activeStepId) return
    const baseRequirement = getCaseStepRequirement(item, activeStepId)
    const record = item.steps[activeStepId]
    setFields({ ...(record?.fields ?? {}) })
    const nextUploads: Record<string, UploadDraft> = {}
    for (const upload of baseRequirement.uploads) {
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
  }, [open, activeStepId, item.id, item.steps, item.documents, item.service, mode])

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

  const description = isView
    ? item.steps[activeStepId]?.detail || 'Saved step details'
    : requirement.help

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
      // Missing key = untouched (hydrate may refill). Empty fileName = removed.
      if (draft === undefined) continue
      if (!draft.fileName.trim()) {
        nextUploads.push({ key: upload.key, fileName: '' })
        continue
      }
      nextUploads.push({
        key: upload.key,
        fileName: draft.fileName.trim(),
        fileId: draft.fileId,
        mimeType: draft.mimeType,
      })
    }
    return { fields, uploads: nextUploads }
  }

  const clearUpload = (key: string) => {
    setUploads((current) => ({
      ...current,
      [key]: { fileName: '' },
    }))
    clearError(`upload:${key}`)
  }

  /** View mode: remove and save immediately so trash works without Edit → Save. */
  const removeUploadNow = (key: string) => {
    clearUpload(key)
    const result = clearCaseStepUpload(item.id, activeStepId, key)
    if (!result.ok) setErrors(result.errors)
  }

  const submitStep = () => {
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

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    submitStep()
  }

  const handleMoveBack = () => {
    const result = revertCaseToStep(item.id, activeStepId)
    if (!result.ok) {
      setErrors(result.errors)
      return
    }
    onModeChange?.('complete')
  }

  const canMoveBackHere =
    canEditCase && isView && activeStepId !== item.currentStepId
  const catalogSteps = getStepDefsForCase(item)
  const currentCatalogIndex = catalogSteps.findIndex(
    (step) => step.id === item.currentStepId,
  )
  const previousCatalogStep =
    isComplete && currentCatalogIndex > 0
      ? catalogSteps[currentCatalogIndex - 1]
      : undefined

  const handleBackOneStep = () => {
    if (!previousCatalogStep) return
    const result = revertCaseToStep(item.id, previousCatalogStep.id)
    if (!result.ok) {
      setErrors(result.errors)
      return
    }
    onClose()
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
        title="Documents"
        drafts={uploads}
        triedSubmit={triedSubmit}
        errors={errors}
        readOnly={readOnly}
        onPick={(key, draft) => {
          setUploads((current) => ({ ...current, [key]: draft }))
          clearError(`upload:${key}`)
        }}
        onClear={
          readOnly && canEditCase
            ? removeUploadNow
            : readOnly
              ? undefined
              : clearUpload
        }
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
        onClear={
          readOnly && canEditCase
            ? removeUploadNow
            : readOnly
              ? undefined
              : clearUpload
        }
      />
    </>
  )

  const needsDetails =
    requirement.fields.length > 0 || requirement.uploads.length > 0

  if (isComplete && !needsDetails) {
    return (
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) onClose()
        }}
      >
        <DialogContent className="border border-border bg-card shadow-[var(--shadow-deep)] ring-0 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          {profileBlockedMessage ? (
            <p className="m-0 text-sm text-destructive" role="alert">
              {profileBlockedMessage}
            </p>
          ) : null}
          {errors.form ? (
            <p className="m-0 text-sm text-destructive" role="alert">
              {errors.form}
            </p>
          ) : null}
          <DialogFooter className="border-0 bg-transparent">
            <Button
              type="button"
              variant="outline"
              className="h-9 rounded-lg"
              onClick={onClose}
            >
              Cancel
            </Button>
            {previousCatalogStep ? (
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-lg"
                onClick={handleBackOneStep}
              >
                Back to {previousCatalogStep.label}
              </Button>
            ) : null}
            <Button
              type="button"
              className="h-9 rounded-lg"
              onClick={submitStep}
            >
              Mark Complete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    >
      <SheetContent className={floatingSheetClass}>
        <SheetHeader className="border-b border-border px-5 py-4 pr-12">
          <SheetTitle className="text-base font-semibold">{title}</SheetTitle>
          {description ? (
            <SheetDescription className="text-left">{description}</SheetDescription>
          ) : null}
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {isView ? (
            <div className="flex flex-col gap-4">
              {item.steps[activeStepId]?.completedAt ? (
                <p className="m-0 text-sm text-muted-foreground">
                  Completed{' '}
                  {formatDisplayDateTime(item.steps[activeStepId].completedAt)}
                </p>
              ) : null}

              <dl className="m-0 grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                <p className="m-0 text-sm text-muted-foreground">
                  No details recorded.
                </p>
              ) : null}
            </div>
          ) : (
            <form
              id={STEP_COMPLETE_FORM_ID}
              className="flex flex-col gap-3"
              onSubmit={handleSubmit}
              noValidate
            >
              {profileBlockedMessage ? (
                <p className="m-0 text-sm text-destructive" role="alert">
                  {profileBlockedMessage}
                </p>
              ) : null}

              {errors.form ? (
                <p className="m-0 text-sm text-destructive" role="alert">
                  {errors.form}
                </p>
              ) : null}

              {requirement.fields.map((field) =>
                field.type === 'textarea' ? (
                  <Textarea
                    key={field.key}
                    className="w-full"
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
                ) : field.type === 'select' ? (
                  <Select
                    key={field.key}
                    label={field.label}
                    required={field.required}
                    value={fields[field.key] ?? ''}
                    placeholder="Choose…"
                    options={(field.options ?? []).map((option) => ({
                      value: option,
                      label: option,
                    }))}
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
        </div>

        <SheetFooter className="border-t border-border px-5 py-4 sm:flex-row sm:justify-end">
          {isView ? (
            <>
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-lg"
                onClick={onClose}
              >
                Close
              </Button>
              {canMoveBackHere ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 rounded-lg"
                  onClick={handleMoveBack}
                >
                  Move Back Here
                </Button>
              ) : null}
              {canEditCase ? (
                <Button
                  type="button"
                  className="h-9 rounded-lg"
                  onClick={() => onModeChange?.('edit')}
                >
                  Edit
                </Button>
              ) : null}
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-lg"
                onClick={() => {
                  if (mode === 'edit') onModeChange?.('view')
                  else onClose()
                }}
              >
                Cancel
              </Button>
              {previousCatalogStep ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 rounded-lg"
                  onClick={handleBackOneStep}
                >
                  Back to {previousCatalogStep.label}
                </Button>
              ) : null}
              <Button
                type="submit"
                form={STEP_COMPLETE_FORM_ID}
                className="h-9 rounded-lg"
              >
                {isComplete ? 'Mark Complete' : 'Save Changes'}
              </Button>
            </>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
