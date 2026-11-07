import { Plus, Trash2 } from 'lucide-react'
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
import { cx } from '@/lib/cx'
import { requiredKeysForDocument } from '@/lib/documentFormFieldsStore'
import type {
  DocumentFormFieldDraft,
  DocumentFormFieldType,
} from '@/types/documentFormField'

const TYPE_OPTIONS: { value: DocumentFormFieldType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'date', label: 'Date' },
  { value: 'number', label: 'Number' },
  { value: 'select', label: 'Dropdown' },
]

export function keyFromLabel(label: string, used: Set<string>): string {
  const base = label
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((part, index) =>
      index === 0
        ? part.toLowerCase()
        : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase(),
    )
    .join('')
  const seed = /^[a-z]/.test(base) ? base : `field${base || '1'}`
  let candidate = seed
  let n = 2
  while (used.has(candidate)) {
    candidate = `${seed}${n}`
    n += 1
  }
  return candidate
}

function optionsText(field: DocumentFormFieldDraft): string {
  return (field.options ?? []).join('\n')
}

export function DocumentFieldsEditor({
  documentId,
  fields,
  onChange,
  variant = 'default',
}: {
  documentId: string
  fields: DocumentFormFieldDraft[]
  onChange: (fields: DocumentFormFieldDraft[]) => void
  /** Compact single-column layout for the flow inspector. */
  variant?: 'default' | 'compact'
}) {
  const lockedKeys = new Set(requiredKeysForDocument(documentId))
  const isCompact = variant === 'compact'

  const updateField = (
    index: number,
    patch: Partial<DocumentFormFieldDraft>,
  ) => {
    onChange(
      fields.map((field, i) => {
        if (i !== index) return field
        const next = { ...field, ...patch }
        if (patch.type === 'select' && !(next.options?.length)) {
          next.options = ['Fit', 'Unfit']
        }
        if (patch.type && patch.type !== 'select') {
          delete next.options
        }
        if (
          patch.label != null &&
          !lockedKeys.has(field.key) &&
          patch.key === undefined
        ) {
          const used = new Set(
            fields.filter((_, j) => j !== index).map((item) => item.key),
          )
          next.key = keyFromLabel(patch.label, used)
        }
        return next
      }),
    )
  }

  const addField = () => {
    const used = new Set(fields.map((field) => field.key))
    const key = keyFromLabel('New field', used)
    onChange([
      ...fields,
      {
        key,
        label: 'New field',
        type: 'text',
        required: false,
      },
    ])
  }

  const removeField = (index: number) => {
    onChange(fields.filter((_, i) => i !== index))
  }

  return (
    <div
      className={cx(
        'pd-settings-doc-fields',
        isCompact && 'pd-settings-doc-fields--compact',
      )}
    >
      <div className="pd-settings-doc-fields__head">
        <span className="pd-settings-doc-fields__title">
          {isCompact ? `Fields (${fields.length})` : 'Fields To Fill In'}
        </span>
        <Button type="button" variant="ghost" size="sm" onClick={addField}>
          <Plus size={14} />
          {isCompact ? 'Add' : 'Add Field'}
        </Button>
      </div>
      {fields.length === 0 ? (
        <p className="pd-settings-service-empty">
          {isCompact
            ? 'No fields yet. Add what staff fill in on upload.'
            : 'Add at least one field staff will complete when uploading this paper.'}
        </p>
      ) : (
        <ul className="pd-settings-doc-fields__list">
          {fields.map((field, index) => {
            const locked = lockedKeys.has(field.key)
            const reqId = `doc-field-req-${index}`
            return (
              <li
                key={`${field.key}-${index}`}
                className="pd-settings-doc-fields__item"
              >
                <div className="pd-settings-doc-fields__row">
                  <Input
                    aria-label={`Field name ${index + 1}`}
                    placeholder="e.g. Result"
                    value={field.label}
                    onChange={(event) =>
                      updateField(index, { label: event.target.value })
                    }
                  />
                  <Select
                    value={field.type}
                    onValueChange={(type) => {
                      updateField(index, {
                        type: type as DocumentFormFieldType,
                        ...(type === 'select' && !(field.options?.length)
                          ? { options: ['Fit', 'Unfit'] }
                          : {}),
                      })
                    }}
                  >
                    <SelectTrigger
                      aria-label={`Type for ${field.label || `field ${index + 1}`}`}
                      className="h-9"
                    >
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
                  <Field
                    orientation="horizontal"
                    className={
                      isCompact ? 'pd-settings-doc-fields__req' : undefined
                    }
                  >
                    <Checkbox
                      id={reqId}
                      title={locked ? 'Linked to client profile' : undefined}
                      checked={Boolean(field.required)}
                      onCheckedChange={(checked) =>
                        updateField(index, { required: checked === true })
                      }
                    />
                    <FieldLabel htmlFor={reqId}>
                      {isCompact ? 'Req' : 'Required'}
                    </FieldLabel>
                  </Field>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={locked}
                    title={
                      locked
                        ? 'Needed so this value can sync to the client profile'
                        : `Remove ${field.label || 'field'}`
                    }
                    aria-label={`Remove ${field.label || `field ${index + 1}`}`}
                    onClick={() => removeField(index)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
                {field.type === 'select' ? (
                  <Textarea
                    aria-label={`Choices for ${field.label || `field ${index + 1}`}`}
                    rows={2}
                    placeholder={'Fit\nUnfit'}
                    value={optionsText(field)}
                    onChange={(event) =>
                      updateField(index, {
                        options: event.target.value
                          .split('\n')
                          .map((line) => line.trim())
                          .filter(Boolean),
                      })
                    }
                  />
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
