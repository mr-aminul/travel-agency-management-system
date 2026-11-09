import { useState, type FormEvent } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { SettingsInfo } from '@/components/settings/SettingsInfo'
import {
  chromeHeadClass,
  floatingSheetClass,
  tableShellClass,
} from '@/components/clients/shadcnChrome'
import { Input, Select, Textarea } from '@/components/clients/clientShadcnFields'
import { Button } from '@/components/shadcn/button'
import { Checkbox } from '@/components/shadcn/checkbox'
import { ConfirmDialog } from '@/components/shadcn/confirm-dialog'
import { Empty, EmptyHeader, EmptyTitle } from '@/components/shadcn/empty'
import { Field, FieldLabel } from '@/components/shadcn/field'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/shadcn/sheet'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/shadcn/table'
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
import {
  CLIENT_PROFILE_SECTIONS,
  type ClientProfileFieldType,
  type ClientProfileSectionId,
} from '@/types/clientProfileField'

const TYPE_OPTIONS: { value: ClientProfileFieldType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'date', label: 'Date' },
  { value: 'country', label: 'Country' },
  { value: 'select', label: 'Choice List' },
]

function typeLabel(type: ClientProfileFieldType): string {
  return TYPE_OPTIONS.find((option) => option.value === type)?.label ?? type
}

function sectionLabel(section: ClientProfileSectionId): string {
  return (
    CLIENT_PROFILE_SECTIONS.find((option) => option.id === section)?.label ??
    'Extra'
  )
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
  const [section, setSection] = useState<ClientProfileSectionId>('extra')
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
    setSection('extra')
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
        section,
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
            className="h-9 rounded-lg"
            onClick={() => {
              setComposerOpen(true)
              setError(null)
            }}
          >
            <Plus size={14} />
            Add Field
          </Button>
        </div>
      </header>

      <div className="pd-settings-catalog">
        {fields.length ? (
          <div className={tableShellClass}>
            <Table aria-label={title}>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-0">
                  <TableHead className={chromeHeadClass}>Field</TableHead>
                  <TableHead className={chromeHeadClass}>Section</TableHead>
                  <TableHead className={chromeHeadClass}>Type</TableHead>
                  <TableHead className={chromeHeadClass}>Required</TableHead>
                  <TableHead className={chromeHeadClass} aria-label="Actions" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {fields.map((field) => (
                  <TableRow key={field.id}>
                    <TableCell>{field.label}</TableCell>
                    <TableCell>{sectionLabel(field.section)}</TableCell>
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
          </div>
        ) : (
          <Empty className="border border-dashed">
            <EmptyHeader>
              <EmptyTitle>No Custom Fields Yet</EmptyTitle>
            </EmptyHeader>
          </Empty>
        )}
      </div>

      <Sheet
        open={composerOpen}
        onOpenChange={(next) => {
          if (!next) closeComposer()
        }}
      >
        <SheetContent className={floatingSheetClass}>
          <SheetHeader className="border-b border-border px-5 py-4 pr-12">
            <SheetTitle className="text-base font-semibold">Add Field</SheetTitle>
          </SheetHeader>
          <form
            className="flex flex-col gap-4 p-5"
            onSubmit={handleSubmit}
          >
            <Input
              label="Field Name"
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
              label="Section"
              value={section}
              onChange={(event) =>
                setSection(event.target.value as ClientProfileSectionId)
              }
              options={CLIENT_PROFILE_SECTIONS.map((option) => ({
                value: option.id,
                label: option.label,
              }))}
            />
            <Select
              label="Type"
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
                placeholder={'Mason\nElectrician\nDriver'}
                value={optionsText}
                onChange={(event) => setOptionsText(event.target.value)}
                onBlur={blur('options')}
                error={showError('options') ? optionsError : undefined}
              />
            ) : null}
            <Field orientation="horizontal">
              <Checkbox
                id="custom-field-required"
                checked={required}
                onCheckedChange={(checked) => setRequired(checked === true)}
              />
              <FieldLabel htmlFor="custom-field-required">
                Required On New Clients
              </FieldLabel>
            </Field>
            {error ? (
              <p
                className="m-0 text-sm text-destructive"
                role="alert"
              >
                {error}
              </p>
            ) : null}
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-lg"
                onClick={closeComposer}
              >
                Cancel
              </Button>
              <Button type="submit" className="h-9 rounded-lg">
                Add Field
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={pendingDelete != null}
        onClose={() => setPendingDeleteId(null)}
        onConfirm={() => {
          if (pendingDelete) deleteClientProfileField(pendingDelete.id)
          setPendingDeleteId(null)
        }}
        title={`Remove ${pendingDelete?.label ?? 'this field'}? Existing values stay stored.`}
        confirmLabel="Remove"
        confirmVariant="danger"
      />
    </>
  )
}
