export const CLIENT_PROFILE_FIELD_TYPES = [
  'text',
  'date',
  'country',
  'select',
] as const

export type ClientProfileFieldType = (typeof CLIENT_PROFILE_FIELD_TYPES)[number]

export type ClientProfileField = {
  id: string
  tenantId: string
  label: string
  type: ClientProfileFieldType
  required: boolean
  options: string[]
  createdAt: string
}

export type ClientProfileFieldDraft = {
  label: string
  type: ClientProfileFieldType
  required?: boolean
  options?: string[]
}
