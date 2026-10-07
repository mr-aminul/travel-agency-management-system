import { useState, type FormEvent } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { SettingsInfo } from '@/components/settings/SettingsInfo'
import { Button, Checkbox, ConfirmDialog, EmptyState, Input, Select, SideDrawer, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Textarea } from '@/components/ui'
import {
  createClientProfileField,
  deleteClientProfileField,
  useClientProfileFields,
} from '@/lib/clientProfileFieldsStore'
import {
  validateOptionalText,
  validateRequiredText,
} from '@/lib/fieldValidation'
import { useTouchedFields } from '@/lib/useTouchedFields'
import type { ClientProfileFieldType } from '@/types/clientProfileField'

const TYPE_OPTIONS: { value: ClientProfileFieldType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'date', label: 'Date' },
  { value: 'country', label: 'Country' },
  { value: 'select', label: 'Choice list' },
]

function typeLabel(type: ClientProfileFieldType): string {
  return TYPE_OPTIONS.find((option) => option.value === type)?.label ?? type
}

export function ClientProfileFieldsSection({
  title,
  info,
}: {
  title: string
  info: string
}) {
  const fields = useClientProfileFields()
  const [composerOpen, setComposerOpen] = useState(false)
  const [label, setLabel] = useState('')
  const [type, setType] = useState<ClientProfileFieldType>('text')
  const [required, setRequired] = useState(false)
  const [optionsText, setOptionsText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const { markAllTouched, showError, blur } = useTouchedFields<
    'label' | 'options'
  >()
  const labelError = validateRequiredText(label, 'Field name', 2)
  const optionsError =
    type === 'select'
      ? validateRequiredText(optionsText, 'Choices', 1) ??
        (optionsText
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean).length === 0
          ? 'Add at least one choice.'
          : undefined)
      : validateOptionalText(optionsText, 'Choices', 500)

  const closeComposer = () => {
    setComposerOpen(false)
    setLabel('')
    setType('text')
    setRequired(false)
    setOptionsText('')
    setError(null)
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    markAllTouched(['label', 'options'])
    if (labelError || optionsError) return
    try {
      createClientProfileField({
        label,
        type,
        required,
        options: optionsText
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean),
      })
      closeComposer()
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Could not add that field.',
      )
    }
  }

  const pendingDelete = fields.find((field) => field.id === pendingDeleteId)

  return (
    <>
      <header className="pd-settings-panel__header pd-settings-panel__header--flush">
        <h2 id="settings-panel-title" className="pd-settings-panel__title">
          {title}
        </h2>
        <SettingsInfo title={title} body={info} />
        <div className="pd-settings-panel__actions">
          <Button
            type="button"
            size="sm"
            onClick={() => {
              setComposerOpen(true)
              setError(null)
            }}
          >
            <Plus size={14} />
            Add field
          </Button>
        </div>
      </header>

      <div className="pd-settings-catalog">
        {fields.length ? (
          <Table aria-label={title}>
            <TableHeader>
              <TableRow>
                <TableHead>Field</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Required</TableHead>
                <TableHead aria-label="Actions" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {fields.map((field) => (
                <TableRow key={field.id}>
                  <TableCell>{field.label}</TableCell>
                  <TableCell>{typeLabel(field.type)}</TableCell>
                  <TableCell>{field.required ? 'Yes' : 'No'}</TableCell>
                  <TableCell>
                    <div className="pd-settings-catalog__row-actions">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-label={`Remove ${field.label}`}
                        onClick={() => setPendingDeleteId(field.id)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyState
            title="No custom fields yet"
            description="Add fields this agency needs on client profiles, such as profession or preferred country."
          />
        )}
      </div>

      <SideDrawer
        open={composerOpen}
        onClose={closeComposer}
        title="Add field"
        description="Fields you add here show on new client profiles for this agency."
        className="pd-settings-drawer"
      >
        <form
          className="pd-settings-catalog__composer"
          onSubmit={handleSubmit}
        >
          <Input
            label="Field name"
            name="customFieldLabel"
            required
            placeholder="e.g. Profession"
            value={label}
            autoFocus
            onChange={(event) => {
              setLabel(event.target.value)
              setError(null)
            }}
            onBlur={blur('label')}
            error={showError('label') ? labelError : undefined}
          />
          <Select
            label="Type"
            name="customFieldType"
            value={type}
            onChange={(event) =>
              setType(event.target.value as ClientProfileFieldType)
            }
            options={TYPE_OPTIONS}
          />
          {type === 'select' ? (
            <Textarea
              label="Choices"
              name="customFieldOptions"
              required
              rows={3}
              hint="One choice per line"
              placeholder={'Mason\nElectrician\nDriver'}
              value={optionsText}
              onChange={(event) => setOptionsText(event.target.value)}
              onBlur={blur('options')}
              error={showError('options') ? optionsError : undefined}
            />
          ) : null}
          <Checkbox
            label="Required on new clients"
            checked={required}
            onChange={(event) => setRequired(event.target.checked)}
          />
          {error ? (
            <p
              className="pd-settings-form__status pd-settings-form__status--error"
              role="alert"
            >
              {error}
            </p>
          ) : null}
          <div className="pd-settings-catalog__composer-actions">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={closeComposer}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Add field
            </Button>
          </div>
        </form>
      </SideDrawer>

      <ConfirmDialog
        open={pendingDelete != null}
        onClose={() => setPendingDeleteId(null)}
        onConfirm={() => {
          if (pendingDelete) deleteClientProfileField(pendingDelete.id)
          setPendingDeleteId(null)
        }}
        title={`Remove ${pendingDelete?.label ?? 'this field'}?`}
        description="It will no longer appear on client profiles. Existing values stay stored."
        confirmLabel="Remove"
        confirmVariant="danger"
      />
    </>
  )
}
