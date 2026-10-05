import type { ClientProfileField } from '@/types/clientProfileField'
import { DESTINATION_COUNTRIES } from '@/lib/destinationCountries'

export function emptyCustomFieldValues(
  defs: ClientProfileField[],
  existing?: Record<string, string>,
): Record<string, string> {
  const next: Record<string, string> = {}
  for (const field of defs) {
    next[field.id] = (existing?.[field.id] ?? '').trim()
  }
  return next
}

export function compactCustomFieldValues(
  values: Record<string, string>,
): Record<string, string> | undefined {
  const next: Record<string, string> = {}
  for (const [key, value] of Object.entries(values)) {
    const trimmed = value.trim()
    if (trimmed) next[key] = trimmed
  }
  return Object.keys(next).length ? next : undefined
}

export function missingRequiredCustomFields(
  defs: ClientProfileField[],
  values: Record<string, string>,
): string[] {
  return defs
    .filter((field) => field.required && !values[field.id]?.trim())
    .map((field) => field.label)
}

export function countrySelectOptions(current = '') {
  const listed = DESTINATION_COUNTRIES as readonly string[]
  const extra =
    current && !listed.includes(current)
      ? [{ value: current, label: current }]
      : []
  return [
    { value: '', label: '—' },
    ...extra,
    ...listed.map((country) => ({ value: country, label: country })),
  ]
}
