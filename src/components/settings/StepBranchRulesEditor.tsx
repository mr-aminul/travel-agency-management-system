import { Plus, Trash2 } from 'lucide-react'
import { Button, Select } from '@/components/ui'
import type { DocumentFormFieldDraft } from '@/types/documentFormField'
import type {
  ServiceDocumentConfig,
  ServiceStepBranchRule,
  ServiceStepConfig,
} from '@/types/serviceTemplate'

type SelectFieldRef = {
  documentId: string
  documentName: string
  fieldKey: string
  fieldLabel: string
  options: string[]
}

function listSelectFields(
  documents: ServiceDocumentConfig[],
  fieldsByDocId: Record<string, DocumentFormFieldDraft[]>,
): SelectFieldRef[] {
  const refs: SelectFieldRef[] = []
  for (const doc of documents) {
    for (const field of fieldsByDocId[doc.id] ?? []) {
      if (field.type !== 'select') continue
      const options = (field.options ?? []).map((item) => item.trim()).filter(Boolean)
      if (options.length === 0) continue
      refs.push({
        documentId: doc.id,
        documentName: doc.name || 'Untitled',
        fieldKey: field.key,
        fieldLabel: field.label || field.key,
        options,
      })
    }
  }
  return refs
}

function fieldToken(documentId: string, fieldKey: string) {
  return `${documentId}::${fieldKey}`
}

export function StepBranchRulesEditor({
  step,
  steps,
  documents,
  fieldsByDocId,
  onChange,
}: {
  step: ServiceStepConfig
  steps: ServiceStepConfig[]
  documents: ServiceDocumentConfig[]
  fieldsByDocId: Record<string, DocumentFormFieldDraft[]>
  onChange: (rules: ServiceStepBranchRule[]) => void
}) {
  const selectFields = listSelectFields(documents, fieldsByDocId)
  const rules = step.branchRules ?? []
  const nextStepOptions = steps
    .filter((item) => item.id !== step.id)
    .map((item) => ({
      value: item.id,
      label: item.label || item.id,
    }))
  const defaultNext =
    steps[steps.findIndex((item) => item.id === step.id) + 1]?.label ??
    'Complete file'

  const updateRule = (
    index: number,
    patch: Partial<ServiceStepBranchRule>,
  ) => {
    onChange(
      rules.map((rule, i) => (i === index ? { ...rule, ...patch } : rule)),
    )
  }

  const addRule = () => {
    const first = selectFields[0]
    const next =
      nextStepOptions[0]?.value ??
      steps.find((item) => item.id !== step.id)?.id ??
      ''
    onChange([
      ...rules,
      {
        documentId: first?.documentId ?? '',
        fieldKey: first?.fieldKey ?? '',
        equals: first?.options[0] ?? '',
        nextStepId: next,
      },
    ])
  }

  return (
    <div className="pd-settings-template__branches">
      <div className="pd-settings-template__branches-head">
        <div className="pd-settings-template__branches-label">
          <span className="pd-settings-template__needs-label">Next step</span>
          <span className="pd-settings-template__next-chip">{defaultNext}</span>
        </div>
        {selectFields.length > 0 ? (
          <Button type="button" variant="ghost" size="sm" onClick={addRule}>
            <Plus size={12} />
            Branch
          </Button>
        ) : null}
      </div>
      {selectFields.length > 0 && rules.length ? (
        <ul className="pd-settings-template__branch-list">
          {rules.map((rule, index) => {
            const fieldOptions = selectFields.map((field) => ({
              value: fieldToken(field.documentId, field.fieldKey),
              label: `${field.documentName} · ${field.fieldLabel}`,
            }))
            const selectedField =
              selectFields.find(
                (field) =>
                  field.documentId === rule.documentId &&
                  field.fieldKey === rule.fieldKey,
              ) ?? selectFields[0]
            const valueOptions = (selectedField?.options ?? []).map(
              (option) => ({
                value: option,
                label: option,
              }),
            )
            return (
              <li key={`${rule.documentId}-${rule.fieldKey}-${index}`}>
                <div className="pd-settings-template__branch-row">
                  <span className="pd-settings-template__branch-when">When</span>
                  <Select
                    aria-label={`Branch field ${index + 1}`}
                    value={fieldToken(
                      selectedField?.documentId ?? '',
                      selectedField?.fieldKey ?? '',
                    )}
                    options={fieldOptions}
                    onChange={(event) => {
                      const [documentId, fieldKey] = event.target.value.split('::')
                      const nextField = selectFields.find(
                        (field) =>
                          field.documentId === documentId &&
                          field.fieldKey === fieldKey,
                      )
                      updateRule(index, {
                        documentId: documentId ?? '',
                        fieldKey: fieldKey ?? '',
                        equals: nextField?.options[0] ?? '',
                      })
                    }}
                  />
                  <span className="pd-settings-template__branch-when">is</span>
                  <Select
                    aria-label={`Branch value ${index + 1}`}
                    value={
                      valueOptions.some((option) => option.value === rule.equals)
                        ? rule.equals
                        : (valueOptions[0]?.value ?? '')
                    }
                    options={valueOptions}
                    onChange={(event) =>
                      updateRule(index, { equals: event.target.value })
                    }
                  />
                  <span className="pd-settings-template__branch-when">go to</span>
                  <Select
                    aria-label={`Branch next step ${index + 1}`}
                    value={
                      nextStepOptions.some(
                        (option) => option.value === rule.nextStepId,
                      )
                        ? rule.nextStepId
                        : (nextStepOptions[0]?.value ?? '')
                    }
                    options={nextStepOptions}
                    onChange={(event) =>
                      updateRule(index, { nextStepId: event.target.value })
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={`Remove branch ${index + 1}`}
                    onClick={() =>
                      onChange(rules.filter((_, i) => i !== index))
                    }
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
