import { useEffect, useMemo, useState } from 'react'
import { floatingSheetClass } from '@/components/clients/shadcnChrome'
import { Select } from '@/components/clients/clientShadcnFields'
import { Button } from '@/components/shadcn/button'
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/shadcn/sheet'
import {
  fieldToken,
  listSelectFields,
  parseFieldToken,
} from '@/lib/serviceBranchFields'
import type { DocumentFormFieldDraft } from '@/types/documentFormField'
import type {
  ServiceDocumentConfig,
  ServiceStepBranchRule,
  ServiceStepConfig,
} from '@/types/serviceTemplate'

export type PendingBranch = {
  fromStepId: string
  toStepId: string
}

export function BranchConditionDialog({
  open,
  pending,
  steps,
  documents,
  fieldsByDocId,
  onClose,
  onConfirm,
}: {
  open: boolean
  pending: PendingBranch | null
  steps: ServiceStepConfig[]
  documents: ServiceDocumentConfig[]
  fieldsByDocId: Record<string, DocumentFormFieldDraft[]>
  onClose: () => void
  onConfirm: (rule: ServiceStepBranchRule) => void
}) {
  const fromStep = steps.find((step) => step.id === pending?.fromStepId)
  const toStep = steps.find((step) => step.id === pending?.toStepId)
  const preferDocumentIds = fromStep?.requiredDocumentIds

  const selectFields = useMemo(
    () =>
      listSelectFields(documents, fieldsByDocId, {
        preferDocumentIds,
      }),
    [documents, fieldsByDocId, preferDocumentIds],
  )

  const [fieldValue, setFieldValue] = useState('')
  const [equals, setEquals] = useState('')

  useEffect(() => {
    if (!open || !pending) return
    const first = selectFields[0]
    setFieldValue(first ? fieldToken(first.documentId, first.fieldKey) : '')
    setEquals(first?.options[0] ?? '')
  }, [open, pending?.fromStepId, pending?.toStepId, selectFields])

  const selectedField =
    selectFields.find((field) => {
      const token = fieldToken(field.documentId, field.fieldKey)
      return token === fieldValue
    }) ?? selectFields[0]

  const valueOptions = (selectedField?.options ?? []).map((option) => ({
    value: option,
    label: option,
  }))

  const canConfirm = Boolean(pending && selectedField)
  const title =
    fromStep && toStep
      ? `${fromStep.label || 'Untitled'} → ${toStep.label || 'Untitled'}`
      : 'Branch Condition'

  return (
    <Sheet
      open={open && pending != null}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    >
      <SheetContent className={floatingSheetClass}>
        <SheetHeader className="border-b border-border px-5 py-4 pr-12">
          <SheetTitle className="text-base font-semibold">{title}</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-4 p-5">
          {selectFields.length === 0 ? (
            <p className="m-0 text-sm text-muted-foreground">
              No dropdown fields yet. Open a document on the canvas, add a field,
              set its type to Dropdown, and list choices (one per line). Then connect
              the steps again.
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              <Select
                label="When Field"
                value={
                  selectFields.some(
                    (field) =>
                      fieldToken(field.documentId, field.fieldKey) === fieldValue,
                  )
                    ? fieldValue
                    : fieldToken(
                        selectedField?.documentId ?? '',
                        selectedField?.fieldKey ?? '',
                      )
                }
                options={selectFields.map((field) => ({
                  value: fieldToken(field.documentId, field.fieldKey),
                  label: `${field.documentName} · ${field.fieldLabel}`,
                }))}
                onChange={(event) => {
                  const next = parseFieldToken(event.target.value)
                  const match = selectFields.find(
                    (field) =>
                      field.documentId === next.documentId &&
                      field.fieldKey === next.fieldKey,
                  )
                  setFieldValue(event.target.value)
                  setEquals(match?.options[0] ?? '')
                }}
              />
              <Select
                label="Equals"
                value={
                  valueOptions.some((option) => option.value === equals)
                    ? equals
                    : (valueOptions[0]?.value ?? '')
                }
                options={valueOptions}
                onChange={(event) => setEquals(event.target.value)}
              />
            </div>
          )}
        </div>
        <SheetFooter className="border-t border-border px-5 py-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" className="h-9 rounded-lg" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            className="h-9 rounded-lg"
            disabled={!canConfirm}
            onClick={() => {
              if (!pending || !selectedField) return
              const { documentId, fieldKey } = parseFieldToken(
                fieldValue ||
                  fieldToken(selectedField.documentId, selectedField.fieldKey),
              )
              onConfirm({
                documentId,
                fieldKey,
                equals: equals || selectedField.options[0] || '',
                nextStepId: pending.toStepId,
              })
            }}
          >
            Add Branch
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
