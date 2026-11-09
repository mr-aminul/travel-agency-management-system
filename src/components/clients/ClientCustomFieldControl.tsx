import { Input, Select } from '@/components/clients/clientShadcnFields'
import {
  countrySelectOptions,
} from '@/lib/clientCustomFields'
import { formatDisplayDate } from '@/lib/formatDate'
import type { ClientProfileField } from '@/types/clientProfileField'

export function ClientCustomFieldControl({
  field,
  value,
  readOnly,
  compact,
  error,
  onChange,
  onBlur,
}: {
  field: ClientProfileField
  value: string
  readOnly?: boolean
  compact?: boolean
  error?: string
  onChange: (value: string) => void
  onBlur?: () => void
}) {
  if (field.type === 'country') {
    return (
      <Select
        label={field.label}
        required={field.required}
        value={value}
        readOnly={readOnly}
        compact={compact}
        searchable
        error={error}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
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
        compact={compact}
        error={error}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        options={[
          { value: '', label: '-' },
          ...field.options.map((option) => ({ value: option, label: option })),
        ]}
      />
    )
  }

  return (
    <Input
      label={field.label}
      required={field.required}
      compact={compact}
      type={field.type === 'date' && !readOnly ? 'date' : 'text'}
      readOnly={readOnly}
      value={
        field.type === 'date' && readOnly
          ? formatDisplayDate(value, '')
          : value
      }
      placeholder={readOnly && !value ? 'Not set' : undefined}
      error={error}
      onChange={(event) => onChange(event.target.value)}
      onBlur={onBlur}
    />
  )
}
