import { Input, Select } from '@/components/ui'
import {
  countrySelectOptions,
} from '@/lib/clientCustomFields'
import { formatDisplayDate } from '@/lib/formatDate'
import type { ClientProfileField } from '@/types/clientProfileField'

export function ClientCustomFieldControl({
  field,
  value,
  readOnly,
  error,
  onChange,
}: {
  field: ClientProfileField
  value: string
  readOnly?: boolean
  error?: string
  onChange: (value: string) => void
}) {
  if (field.type === 'country') {
    return (
      <Select
        label={field.label}
        required={field.required}
        value={value}
        readOnly={readOnly}
        searchable
        error={error}
        onChange={(event) => onChange(event.target.value)}
        options={countrySelectOptions(value)}
      />
    )
  }

  if (field.type === 'select') {
    return (
      <Select
        label={field.label}
        required={field.required}
        value={value}
        readOnly={readOnly}
        error={error}
        onChange={(event) => onChange(event.target.value)}
        options={[
          { value: '', label: '—' },
          ...field.options.map((option) => ({ value: option, label: option })),
        ]}
      />
    )
  }

  return (
    <Input
      label={field.label}
      required={field.required}
      type={field.type === 'date' && !readOnly ? 'date' : 'text'}
      readOnly={readOnly}
      value={
        field.type === 'date' && readOnly
          ? formatDisplayDate(value, '')
          : value
      }
      error={error}
      onChange={(event) => onChange(event.target.value)}
    />
  )
}
