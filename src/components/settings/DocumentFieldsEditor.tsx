import { Plus, Trash2 } from 'lucide-react'
import { Button, Checkbox, Input, Select, Textarea } from '@/components/ui'
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
      { key, label: 'New field', type: 'text', required: false },
    ])
  }

  const removeField = (index: number) => {
    const target = fields[index]
    if (!target || lockedKeys.has(target.key)) return
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
          {isCompact ? `Fields (${fields.length})` : 'Fields to fill in'}
        </span>
        <Button type="button" variant="ghost" size="sm" onClick={addField}>
          <Plus size={14} />
          {isCompact ? 'Add' : 'Add field'}
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
                    aria-label={`Type for ${field.label || `field ${index + 1}`}`}
                    value={field.type}
                    onChange={(event) => {
                      const type = event.target.value as DocumentFormFieldType
                      updateField(index, {
                        type,
                        ...(type === 'select' && !(field.options?.length)
                          ? { options: ['Fit', 'Unfit'] }
                          : {}),
                      })
                    }}
                    options={TYPE_OPTIONS}
                  />
                  <Checkbox
                    className={
                      isCompact ? 'pd-settings-doc-fields__req' : undefined
                    }
                    label={isCompact ? 'Req' : 'Required'}
                    title={locked ? 'Linked to client profile' : undefined}
                    checked={Boolean(field.required)}
                    onChange={(event) =>
                      updateField(index, { required: event.target.checked })
                    }
                  />
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
                    label={isCompact ? undefined : 'Choices'}
                    hint={
                      isCompact
                        ? undefined
                        : 'One choice per line — used for dropdowns and next-step branches'
                    }
                    rows={isCompact ? 2 : 2}
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
      {!isCompact && lockedKeys.size > 0 ? (
        <p className="pd-field-hint">
          Some fields stay linked to the client profile — you can rename them,
          but not remove them.
        </p>
      ) : null}
    </div>
  )
}
