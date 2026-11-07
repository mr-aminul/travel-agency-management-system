import { useId, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { keyFromLabel } from '@/components/settings/DocumentFieldsEditor'
import { Button } from '@/components/shadcn/button'
import { Checkbox } from '@/components/shadcn/checkbox'
import { Field, FieldLabel } from '@/components/shadcn/field'
import { Input } from '@/components/shadcn/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shadcn/select'
import { Textarea } from '@/components/shadcn/textarea'
import type {
  ServiceStepConfig,
  ServiceStepDecision,
  ServiceStepField,
} from '@/types/serviceTemplate'

const TYPE_OPTIONS: { value: ServiceStepField['type']; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'date', label: 'Date' },
  { value: 'number', label: 'Number' },
  { value: 'textarea', label: 'Long Text' },
  { value: 'select', label: 'Dropdown' },
]

type FieldOptionDraft = {
  value: string
  nextStepId?: string
  skipDocuments?: boolean
}

/** One editable row: plain field or dropdown with optional If/require routing. */
type FieldRow = {
  /** Stable React key — never derived from the label while typing. */
  rowId: string
  key: string
  label: string
  type: ServiceStepField['type']
  required?: boolean
  placeholder?: string
  options: FieldOptionDraft[]
}

let rowSeq = 0
function nextRowId(): string {
  rowSeq += 1
  return `step-field-${rowSeq}`
}

function optionsFromField(
  field: ServiceStepField,
  decision?: ServiceStepDecision,
): FieldOptionDraft[] {
  if (field.type !== 'select') return []
  const values =
    field.options?.length
      ? field.options
      : decision?.options.map((option) => option.value) ?? ['Yes', 'No']
  return values.map((value) => {
    const routed = decision?.options.find(
      (option) => option.value.toLowerCase() === value.toLowerCase(),
    )
    return {
      value,
      ...(routed?.nextStepId ? { nextStepId: routed.nextStepId } : {}),
      ...(routed?.skipDocuments ? { skipDocuments: true } : {}),
    }
  })
}

function rowsFromStep(step: ServiceStepConfig): FieldRow[] {
  const fields = step.fields ?? []
  const decisions = step.decisions ?? []
  const usedDecisionKeys = new Set<string>()
  const rows: FieldRow[] = []

  for (const field of fields) {
    const decision = decisions.find((item) => item.key === field.key)
    if (decision) usedDecisionKeys.add(decision.key)
    rows.push({
      rowId: nextRowId(),
      key: field.key,
      label: field.label,
      type: field.type,
      required: field.required,
      placeholder: field.placeholder,
      options: optionsFromField(field, decision),
    })
  }

  for (const decision of decisions) {
    if (usedDecisionKeys.has(decision.key)) continue
    rows.push({
      rowId: nextRowId(),
      key: decision.key,
      label: decision.label,
      type: 'select',
      required: true,
      options: decision.options.map((option) => ({
        value: option.value,
        ...(option.nextStepId ? { nextStepId: option.nextStepId } : {}),
        ...(option.skipDocuments ? { skipDocuments: true } : {}),
      })),
    })
  }

  return rows
}

function hasRouting(options: FieldOptionDraft[]): boolean {
  return options.some(
    (option) => Boolean(option.nextStepId) || option.skipDocuments === true,
  )
}

function emitFromRows(rows: FieldRow[]): {
  fields: ServiceStepField[] | undefined
  decisions: ServiceStepDecision[] | undefined
} {
  const fields: ServiceStepField[] = []
  const decisions: ServiceStepDecision[] = []

  for (const row of rows) {
    const label = row.label.trim() || 'Field'
    const key = row.key.trim() || keyFromLabel(label, new Set())
    if (row.type === 'select') {
      const options = row.options
        .map((option) => ({
          value: option.value.trim(),
          ...(option.nextStepId?.trim()
            ? { nextStepId: option.nextStepId.trim() }
            : {}),
          ...(option.skipDocuments ? { skipDocuments: true as const } : {}),
        }))
        .filter((option) => option.value.length > 0)
      const choices = options.length >= 2 ? options : [
        { value: 'Yes' },
        { value: 'No' },
      ]
      if (hasRouting(choices)) {
        decisions.push({ key, label, options: choices })
      } else {
        fields.push({
          key,
          label,
          type: 'select',
          ...(row.required ? { required: true } : {}),
          options: choices.map((option) => option.value),
        })
      }
      continue
    }

    fields.push({
      key,
      label,
      type: row.type,
      ...(row.required ? { required: true } : {}),
      ...(row.placeholder?.trim()
        ? { placeholder: row.placeholder.trim() }
        : {}),
    })
  }

  return {
    fields: fields.length ? fields : undefined,
    decisions: decisions.length ? decisions : undefined,
  }
}

function optionsText(options: FieldOptionDraft[]): string {
  return options.map((option) => option.value).join('\n')
}

export function StepFieldsEditor({
  step,
  steps,
  onChange,
}: {
  step: ServiceStepConfig
  steps: ServiceStepConfig[]
  onChange: (next: {
    fields: ServiceStepField[] | undefined
    decisions: ServiceStepDecision[] | undefined
  }) => void
}) {
  // Remount via parent `key` when country/step changes — keeps typing stable.
  const [rows, setRows] = useState(() => rowsFromStep(step))
  const baseId = useId()

  const commit = (nextRows: FieldRow[]) => {
    setRows(nextRows)
    onChange(emitFromRows(nextRows))
  }

  const updateRow = (rowId: string, patch: Partial<FieldRow>) => {
    commit(
      rows.map((row) => {
        if (row.rowId !== rowId) return row
        const next = { ...row, ...patch }
        if (patch.type === 'select' && next.options.length < 2) {
          next.options = [
            { value: 'Yes' },
            { value: 'No', skipDocuments: true },
          ]
        }
        if (patch.type && patch.type !== 'select') {
          next.options = []
          delete next.placeholder
        }
        return next
      }),
    )
  }

  const updateOption = (
    rowId: string,
    optionValue: string,
    patch: Partial<FieldOptionDraft>,
  ) => {
    commit(
      rows.map((row) => {
        if (row.rowId !== rowId) return row
        return {
          ...row,
          options: row.options.map((option) =>
            option.value === optionValue ? { ...option, ...patch } : option,
          ),
        }
      }),
    )
  }

  const addField = () => {
    const used = new Set(rows.map((row) => row.key))
    const key = keyFromLabel('New field', used)
    commit([
      ...rows,
      {
        rowId: nextRowId(),
        key,
        label: '',
        type: 'text',
        required: false,
        options: [],
      },
    ])
  }

  const removeRow = (rowId: string) => {
    commit(rows.filter((row) => row.rowId !== rowId))
  }

  const nextStepOptions = [
    { value: '', label: 'Default Next Step' },
    ...steps
      .filter((item) => item.id !== step.id)
      .map((item) => ({
        value: item.id,
        label: item.label || item.id,
      })),
  ]

  return (
    <section className="pd-settings-template__exceptions">
      <div className="pd-settings-template__panel-label-row">
        <span className="pd-settings-template__panel-label">Fields</span>
        <Button type="button" variant="ghost" size="sm" onClick={addField}>
          <Plus size={14} aria-hidden />
          Add Field
        </Button>
      </div>
      <p className="pd-service-flow__inspector-copy">
        Add fields for Complete. Use Dropdown to set If/require — next status
        and skip documents — on each choice.
      </p>

      {rows.length === 0 ? (
        <p className="pd-service-flow__inspector-copy">
          No fields yet. Add text, date, or a dropdown with routing.
        </p>
      ) : (
        <ul className="pd-settings-template__step-fields">
          {rows.map((row) => {
            const requiredId = `${baseId}-${row.rowId}-required`
            return (
              <li key={row.rowId} className="pd-settings-template__step-field">
                <div className="pd-settings-template__step-field-head">
                  <Input
                    aria-label="Field label"
                    value={row.label}
                    placeholder="Type a label…"
                    onChange={(event) =>
                      updateRow(row.rowId, { label: event.target.value })
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={`Remove ${row.label || 'field'}`}
                    onClick={() => removeRow(row.rowId)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
                <div className="pd-settings-template__step-field-meta">
                  <Select
                    value={row.type}
                    onValueChange={(type) =>
                      updateRow(row.rowId, {
                        type: type as ServiceStepField['type'],
                      })
                    }
                  >
                    <SelectTrigger aria-label="Field type" className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TYPE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Field orientation="horizontal">
                    <Checkbox
                      id={requiredId}
                      checked={row.required === true || row.type === 'select'}
                      disabled={row.type === 'select' && hasRouting(row.options)}
                      onCheckedChange={(checked) =>
                        updateRow(row.rowId, {
                          required: checked === true || undefined,
                        })
                      }
                    />
                    <FieldLabel htmlFor={requiredId}>
                      Required To Complete
                    </FieldLabel>
                  </Field>
                </div>

                {row.type === 'select' ? (
                  <div className="pd-settings-template__step-field-routes">
                    <Textarea
                      aria-label="Dropdown choices"
                      rows={3}
                      value={optionsText(row.options)}
                      placeholder={'One choice per line\nYes\nNo'}
                      onChange={(event) => {
                        const values = event.target.value
                          .split('\n')
                          .map((line) => line.trimEnd())
                        const previous = new Map(
                          row.options.map((option) => [
                            option.value.toLowerCase(),
                            option,
                          ]),
                        )
                        updateRow(row.rowId, {
                          options: values.map((value) => {
                            const trimmed = value.trim()
                            const prior = previous.get(trimmed.toLowerCase())
                            return {
                              value,
                              ...(prior?.nextStepId
                                ? { nextStepId: prior.nextStepId }
                                : {}),
                              ...(prior?.skipDocuments
                                ? { skipDocuments: true }
                                : {}),
                            }
                          }),
                        })
                      }}
                    />
                    <p className="pd-service-flow__inspector-copy">
                      If / require — wire each choice below.
                    </p>
                    <ul className="pd-settings-template__decision-options">
                      {row.options
                        .filter((option) => option.value.trim())
                        .map((option) => {
                          const skipId = `${baseId}-${row.rowId}-${option.value}-skip`
                          return (
                            <li key={`${row.rowId}-${option.value}`}>
                              <div className="pd-settings-template__decision-option-row">
                                <span className="pd-settings-template__decision-option-label">
                                  {option.value.trim()}
                                </span>
                                <Select
                                  value={option.nextStepId || '__default__'}
                                  onValueChange={(next) => {
                                    const nextStepId =
                                      next === '__default__' ? '' : next.trim()
                                    updateOption(row.rowId, option.value, {
                                      nextStepId: nextStepId || undefined,
                                    })
                                  }}
                                >
                                  <SelectTrigger
                                    aria-label={`${row.label || 'Field'} ${option.value.trim()} next step`}
                                    className="h-8"
                                  >
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {nextStepOptions.map((item) => (
                                      <SelectItem
                                        key={item.value || '__default__'}
                                        value={item.value || '__default__'}
                                      >
                                        {item.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <Field orientation="horizontal">
                                <Checkbox
                                  id={skipId}
                                  checked={option.skipDocuments === true}
                                  onCheckedChange={(checked) =>
                                    updateOption(row.rowId, option.value, {
                                      skipDocuments:
                                        checked === true || undefined,
                                    })
                                  }
                                />
                                <FieldLabel htmlFor={skipId}>
                                  Skip Documents For This Choice
                                </FieldLabel>
                              </Field>
                            </li>
                          )
                        })}
                    </ul>
                  </div>
                ) : (
                  <Input
                    aria-label="Placeholder"
                    value={row.placeholder ?? ''}
                    placeholder="Placeholder (optional)"
                    onChange={(event) =>
                      updateRow(row.rowId, {
                        placeholder: event.target.value || undefined,
                      })
                    }
                  />
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
