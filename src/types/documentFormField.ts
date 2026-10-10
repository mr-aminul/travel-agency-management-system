export const DOCUMENT_FORM_FIELD_TYPES = [
  'text',
  'date',
  'number',
  'select',
] as const

export type DocumentFormFieldType = (typeof DOCUMENT_FORM_FIELD_TYPES)[number]

export type DocumentFormFieldDraft = {
  key: string
  label: string
  type: DocumentFormFieldType
  required?: boolean
  placeholder?: string
  /** Choices when type is select (dropdown). */
  options?: string[]
}

export type DocumentFormOverride = {
  documentId: string
  tenantId: string
  fields: DocumentFormFieldDraft[]
  updatedAt: string
}
