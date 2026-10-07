import {
  validateOptionalDate,
  validateOptionalText,
  trimmed,
} from '@/lib/fieldValidation'

export type ClientProfileFieldLike = {
  id: string
  label: string
  type: 'text' | 'date' | 'country' | 'select'
  required: boolean
}

export function validateCustomFieldValue(
  field: ClientProfileFieldLike,
  value: string,
): string | undefined {
  const text = trimmed(value)
  if (!text) {
    return field.required ? `${field.label} is required.` : undefined
  }
  if (field.type === 'date') {
    return validateOptionalDate(value, field.label)
  }
  if (field.type === 'select' || field.type === 'country') {
    return undefined
  }
  return validateOptionalText(value, field.label)
}
