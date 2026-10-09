import { formatDisplayDate } from '@/lib/formatDate'

export type DocumentFieldType = 'text' | 'date' | 'number'

export type DocumentFieldDef = {
  key: string
  label: string
  type: DocumentFieldType
  required?: boolean
  placeholder?: string
}

export type DocumentFormDef = {
  documentId: string
  fields: DocumentFieldDef[]
  /** When set, also write these keys onto the client profile. */
  syncToClient?: Partial<Record<'passport' | 'nid', string>>
}

/**
 * Absolute-minimum fields per document type.
 * Keyed by CaseDocument.id across services.
 */
const FORMS: Record<string, DocumentFormDef> = {
  passport: {
    documentId: 'passport',
    fields: [
      {
        key: 'number',
        label: 'Passport number',
        type: 'text',
        required: true,
        placeholder: 'e.g. A12345678',
      },
      {
        key: 'placeOfIssue',
        label: 'Place of issue',
        type: 'text',
      },
      {
        key: 'issuedOn',
        label: 'Date of issue',
        type: 'date',
      },
      {
        key: 'expiry',
        label: 'Date of expiry',
        type: 'date',
        required: true,
      },
    ],
    syncToClient: { passport: 'number' },
  },
  nid: {
    documentId: 'nid',
    fields: [
      {
        key: 'number',
        label: 'NID number',
        type: 'text',
        required: true,
        placeholder: 'e.g. 1990123456789',
      },
    ],
    syncToClient: { nid: 'number' },
  },
  id: {
    documentId: 'id',
    fields: [
      {
        key: 'number',
        label: 'ID number',
        type: 'text',
        required: true,
      },
      {
        key: 'idType',
        label: 'ID type',
        type: 'text',
        required: true,
        placeholder: 'NID / Passport',
      },
    ],
  },
  medical: {
    documentId: 'medical',
    fields: [
      { key: 'clinic', label: 'Clinic', type: 'text', required: true },
      { key: 'date', label: 'Medical date', type: 'date', required: true },
      {
        key: 'result',
        label: 'Result',
        type: 'text',
        required: true,
        placeholder: 'Fit / Unfit',
      },
    ],
  },
  vaccine: {
    documentId: 'vaccine',
    fields: [
      {
        key: 'vaccine',
        label: 'Vaccine',
        type: 'text',
        required: true,
        placeholder: 'e.g. Meningitis',
      },
      { key: 'date', label: 'Date', type: 'date', required: true },
    ],
  },
  demand: {
    documentId: 'demand',
    fields: [
      { key: 'employer', label: 'Employer', type: 'text', required: true },
      { key: 'date', label: 'Letter date', type: 'date', required: true },
    ],
  },
  bmet: {
    documentId: 'bmet',
    fields: [
      {
        key: 'registrationNo',
        label: 'BMET registration no.',
        type: 'text',
        required: true,
      },
      { key: 'date', label: 'Date', type: 'date', required: true },
    ],
  },
  offer: {
    documentId: 'offer',
    fields: [
      { key: 'university', label: 'University', type: 'text', required: true },
      {
        key: 'offerType',
        label: 'Offer type',
        type: 'text',
        required: true,
        placeholder: 'Conditional / Unconditional',
      },
    ],
  },
  financial: {
    documentId: 'financial',
    fields: [
      {
        key: 'sponsor',
        label: 'Sponsor / bank',
        type: 'text',
        required: true,
      },
      {
        key: 'amount',
        label: 'Amount shown',
        type: 'text',
        required: true,
      },
    ],
  },
  visa: {
    documentId: 'visa',
    fields: [
      {
        key: 'number',
        label: 'Visa / file number',
        type: 'text',
        required: true,
      },
      { key: 'issuedOn', label: 'Issued on', type: 'date', required: true },
    ],
  },
  package: {
    documentId: 'package',
    fields: [
      { key: 'packageName', label: 'Package name', type: 'text', required: true },
      { key: 'reference', label: 'Booking reference', type: 'text', required: true },
    ],
  },
  itinerary: {
    documentId: 'itinerary',
    fields: [
      { key: 'reference', label: 'Booking reference', type: 'text', required: true },
      { key: 'dates', label: 'Travel dates', type: 'text', required: true },
    ],
  },
  deposit: {
    documentId: 'deposit',
    fields: [
      { key: 'amount', label: 'Amount (৳)', type: 'number', required: true },
      { key: 'paidOn', label: 'Paid on', type: 'date', required: true },
    ],
  },
  payment: {
    documentId: 'payment',
    fields: [
      { key: 'amount', label: 'Amount (৳)', type: 'number', required: true },
      { key: 'paidOn', label: 'Paid on', type: 'date', required: true },
    ],
  },
  ticket: {
    documentId: 'ticket',
    fields: [
      { key: 'pnr', label: 'PNR', type: 'text', required: true },
      { key: 'airline', label: 'Airline', type: 'text', required: true },
    ],
  },
}

const FALLBACK: DocumentFormDef = {
  documentId: 'other',
  fields: [
    {
      key: 'reference',
      label: 'Reference / number',
      type: 'text',
      required: true,
    },
  ],
}

export function getDocumentForm(documentId: string): DocumentFormDef {
  return FORMS[documentId] ?? { ...FALLBACK, documentId }
}

export function validateDocumentFields(
  form: DocumentFormDef,
  fields: Record<string, string>,
): Record<string, string> {
  const errors: Record<string, string> = {}
  for (const field of form.fields) {
    if (!field.required) continue
    if (!(fields[field.key] ?? '').trim()) {
      errors[field.key] = `${field.label} is required.`
    }
  }
  return errors
}

export function summarizeDocumentFields(
  form: DocumentFormDef,
  fields: Record<string, string>,
): string {
  const parts = form.fields
    .map((field) => {
      const value = (fields[field.key] ?? '').trim()
      if (!value) return ''
      return field.type === 'date' ? formatDisplayDate(value, value) : value
    })
    .filter(Boolean)
  return parts.join(' · ') || 'Recorded'
}

export function documentExpiryFromFields(
  form: DocumentFormDef,
  fields: Record<string, string>,
): string | null {
  if (form.documentId === 'nid') return 'Lifetime'
  const expiry = fields.expiry?.trim()
  return expiry || null
}
