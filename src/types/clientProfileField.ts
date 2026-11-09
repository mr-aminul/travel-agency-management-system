export const CLIENT_PROFILE_FIELD_TYPES = [
  'text',
  'date',
  'country',
  'select',
] as const

export type ClientProfileFieldType = (typeof CLIENT_PROFILE_FIELD_TYPES)[number]

/** Built-in profile sections. Custom fields pick one of these. */
export const CLIENT_PROFILE_SECTIONS = [
  { id: 'identity', label: 'Personal' },
  { id: 'contact', label: 'Contact' },
  { id: 'family', label: 'Family' },
  { id: 'work', label: 'Work' },
  { id: 'placement', label: 'Placement' },
  { id: 'extra', label: 'Extra' },
] as const

export type ClientProfileSectionId =
  (typeof CLIENT_PROFILE_SECTIONS)[number]['id']

export type ClientProfileField = {
  id: string
  tenantId: string
  label: string
  type: ClientProfileFieldType
  /** Which profile section this field appears in. */
  section: ClientProfileSectionId
  required: boolean
  options: string[]
  createdAt: string
}

export type ClientProfileFieldDraft = {
  label: string
  type: ClientProfileFieldType
  section?: ClientProfileSectionId
  required?: boolean
  options?: string[]
}
