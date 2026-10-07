import { useState, type FormEvent } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button, Input, Select, Textarea } from '@/components/ui'
import {
  validateOptionalText,
  validateRequiredText,
} from '@/lib/fieldValidation'
import { useTouchedFields } from '@/lib/useTouchedFields'
import {
  DOCUMENT_TEMPLATE_GROUPS,
  PRINT_FIELD_LABELS,
  PRINT_FIELDS,
  embassyHeaderRows,
  putupHeaderRows,
  type DocumentTemplate,
  type DocumentTemplateDraft,
  type DocumentTemplateLayout,
  type PrintField,
  type TemplateColumn,
} from '@/types/documentTemplate'

const GROUP_OPTIONS = DOCUMENT_TEMPLATE_GROUPS.map((group) => ({
  value: group,
  label: group,
}))

const LAYOUT_OPTIONS = [
  { value: 'table', label: 'Print table (embassy / putup)' },
  { value: 'letter', label: 'Letter / notesheet' },
]

const DIRECTION_OPTIONS = [
  { value: 'rtl', label: 'Arabic (right to left)' },
  { value: 'ltr', label: 'Bangla / English (left to right)' },
]

const STARTER_OPTIONS = [
  { value: 'embassy', label: 'Start from embassy list' },
  { value: 'putup', label: 'Start from putup list' },
  { value: 'blank', label: 'Keep current columns' },
]

const FIELD_OPTIONS = PRINT_FIELDS.map((field) => ({
  value: field,
  label: PRINT_FIELD_LABELS[field],
}))

type DocumentTemplateFormProps = {
  initial?: DocumentTemplate
  error?: string | null
  submitLabel: string
  onSubmit: (draft: DocumentTemplateDraft) => void
  onCancel: () => void
}

function cloneColumns(rows: TemplateColumn[][]): TemplateColumn[][] {
  return rows.map((row) => row.map((col) => ({ ...col })))
}

export function DocumentTemplateForm({
  initial,
  error,
  submitLabel,
  onSubmit,
  onCancel,
}: DocumentTemplateFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [group, setGroup] = useState(initial?.group ?? 'Embassy')
  const [layout, setLayout] = useState<DocumentTemplateLayout>(
    initial?.layout ?? 'table',
  )
  const [direction, setDirection] = useState(initial?.direction ?? 'rtl')
  const [title, setTitle] = useState(initial?.title ?? '')
  const [licenseNo, setLicenseNo] = useState(initial?.licenseNo ?? '')
  const [country, setCountry] = useState(initial?.country ?? '')
  const [declaration, setDeclaration] = useState(initial?.declaration ?? '')
  const [letterIntro, setLetterIntro] = useState(initial?.letterIntro ?? '')
  const [letterItems, setLetterItems] = useState(
    (initial?.letterItems ?? []).join('\n'),
  )
  const [headerRows, setHeaderRows] = useState<TemplateColumn[][]>(
    cloneColumns(initial?.headerRows?.length ? initial.headerRows : embassyHeaderRows()),
  )
  const { markAllTouched, showError, blur } = useTouchedFields<
    'name' | 'title' | 'licenseNo' | 'country' | 'declaration' | 'letterIntro'
  >()
  const nameError = validateRequiredText(name, 'Template name', 2)
  const titleError = validateOptionalText(title, 'Printed title', 200)
  const licenseError = validateOptionalText(licenseNo, 'License number', 40)
  const countryError = validateOptionalText(country, 'Destination country', 80)
  const declarationError = validateOptionalText(declaration, 'Declaration', 2000)
  const letterIntroError = validateOptionalText(letterIntro, 'Letter intro', 2000)

  const columns = headerRows[0] ?? []

  const setColumn = (index: number, patch: Partial<TemplateColumn>) => {
    setHeaderRows((rows) => {
      const next = cloneColumns(rows)
      if (!next[0]?.[index]) return rows
      next[0][index] = { ...next[0][index], ...patch }
      return next
    })
  }

  const addColumn = () => {
    setHeaderRows((rows) => {
      const next = cloneColumns(rows.length ? rows : [[]])
      const id = `col-${Date.now()}`
      next[0].push({ id, label: 'Column', field: 'name' })
      return next
    })
  }

  const removeColumn = (index: number) => {
    setHeaderRows((rows) => {
      const next = cloneColumns(rows)
      if (!next[0]) return rows
      next[0] = next[0].filter((_, i) => i !== index)
      return next
    })
  }

  const applyStarter = (value: string) => {
    if (value === 'embassy') {
      setLayout('table')
      setDirection('rtl')
      setGroup('Embassy')
      setTitle('بيان بالجوازات المقدمة')
      setHeaderRows(cloneColumns(embassyHeaderRows()))
      return
    }
    if (value === 'putup') {
      setLayout('table')
      setDirection('ltr')
      setGroup('Manpower')
      setTitle('একক বর্হিগমন ছাড়পত্রের আবেদন ফর্ম')
      setHeaderRows(cloneColumns(putupHeaderRows()))
    }
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    markAllTouched([
      'name',
      'title',
      'licenseNo',
      'country',
      'declaration',
      'letterIntro',
    ])
    if (
      nameError ||
      titleError ||
      licenseError ||
      countryError ||
      declarationError ||
      letterIntroError
    ) {
      return
    }
    onSubmit({
      name,
      group,
      layout,
      direction,
      title,
      licenseNo,
      country,
      declaration,
      headerRows,
      stamps: initial?.stamps,
      letterIntro,
      letterItems: letterItems
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean),
    })
  }

  return (
    <form className="pd-ops-form" onSubmit={handleSubmit} noValidate>
      <Input
        label="Template name"
        required
        value={name}
        onChange={(event) => setName(event.target.value)}
        onBlur={blur('name')}
        placeholder="Embassy List"
        error={
          (showError('name') ? nameError : undefined) ?? error ?? undefined
        }
      />
      <Select
        label="Group"
        value={group}
        options={GROUP_OPTIONS}
        onChange={(event) =>
          setGroup(event.target.value as DocumentTemplateDraft['group'])
        }
      />
      <Select
        label="Layout"
        value={layout}
        options={LAYOUT_OPTIONS}
        onChange={(event) =>
          setLayout(event.target.value as DocumentTemplateLayout)
        }
      />
      <Select
        label="Script direction"
        value={direction}
        options={DIRECTION_OPTIONS}
        onChange={(event) =>
          setDirection(event.target.value as 'rtl' | 'ltr')
        }
      />
      <Input
        label="Printed title"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        onBlur={blur('title')}
        error={showError('title') ? titleError : undefined}
      />
      <Input
        label="License number"
        value={licenseNo}
        onChange={(event) => setLicenseNo(event.target.value)}
        onBlur={blur('licenseNo')}
        placeholder="864"
        error={showError('licenseNo') ? licenseError : undefined}
      />
      <Input
        label="Destination country"
        value={country}
        onChange={(event) => setCountry(event.target.value)}
        onBlur={blur('country')}
        placeholder="সৌদি আরব"
        error={showError('country') ? countryError : undefined}
      />

      {layout === 'letter' ? (
        <>
          <Textarea
            label="Letter intro"
            value={letterIntro}
            onChange={(event) => setLetterIntro(event.target.value)}
            onBlur={blur('letterIntro')}
            hint="Use {{agency}}, {{license}}, {{date}}, {{country}}"
            error={showError('letterIntro') ? letterIntroError : undefined}
          />
          <Textarea
            label="Checklist lines"
            value={letterItems}
            onChange={(event) => setLetterItems(event.target.value)}
            hint="One item per line"
          />
        </>
      ) : (
        <>
          <Select
            label="Column starter"
            defaultValue="blank"
            options={STARTER_OPTIONS}
            onChange={(event) => applyStarter(event.target.value)}
          />
          <div className="pd-ops__section">
            <p className="pd-ops__section-title">Columns</p>
            {columns.map((col, index) => (
              <div key={col.id} className="pd-ops-form pd-ops-form--2">
                <Input
                  label="Heading"
                  value={col.label}
                  onChange={(event) =>
                    setColumn(index, { label: event.target.value })
                  }
                />
                <Input
                  label="English line"
                  value={col.sublabel ?? ''}
                  onChange={(event) =>
                    setColumn(index, { sublabel: event.target.value })
                  }
                />
                <Select
                  label="Fills from"
                  value={col.field}
                  options={FIELD_OPTIONS}
                  onChange={(event) =>
                    setColumn(index, {
                      field: event.target.value as PrintField,
                    })
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={`Remove ${col.label || 'column'}`}
                  onClick={() => removeColumn(index)}
                >
                  <Trash2 size={14} /> Remove
                </Button>
              </div>
            ))}
            <Button type="button" variant="secondary" size="sm" onClick={addColumn}>
              <Plus size={14} /> Add column
            </Button>
          </div>
          <Textarea
            label="Declaration under the table"
            value={declaration}
            onChange={(event) => setDeclaration(event.target.value)}
            onBlur={blur('declaration')}
            error={showError('declaration') ? declarationError : undefined}
          />
        </>
      )}

      <div className="pd-ops__row-actions">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  )
}
