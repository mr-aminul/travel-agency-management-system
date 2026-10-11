import { useEffect, useMemo, useState } from 'react'
import { Button, Select, SideDrawer } from '@/components/ui'
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

  return (
    <SideDrawer
      open={open && pending != null}
      onClose={onClose}
      title="Branch condition"
      description={
        fromStep && toStep
          ? `When this matches, go from “${fromStep.label || 'Untitled'}” to “${toStep.label || 'Untitled'}”.`
          : 'Choose the document dropdown that picks this path.'
      }
      className="pd-service-flow-branch-drawer"
      footer={
        <div className="pd-service-flow-branch-dialog__actions">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
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
            Add branch
          </Button>
        </div>
      }
    >
      {selectFields.length === 0 ? (
        <p className="pd-service-flow-branch-dialog__empty">
          No dropdown fields yet. Open a document on the canvas, add a field,
          set its type to Dropdown, and list choices (one per line). Then connect
          the steps again.
        </p>
      ) : (
        <div className="pd-service-flow-branch-dialog__fields">
          <Select
            label="When field"
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
    </SideDrawer>
  )
}
