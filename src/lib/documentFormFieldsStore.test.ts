import { afterEach, describe, expect, it } from 'vitest'
import {
  DEMO_USER,
  LEISURE_USER,
  clearSession,
  writeSession,
} from '@/lib/authApi'
import { getDocumentForm } from '@/lib/caseDocumentForms'
import {
  clearDocumentFormOverride,
  listDocumentFormOverrides,
  resetDocumentFormFields,
  saveDocumentFormOverride,
} from '@/lib/documentFormFieldsStore'
import { TENANT_IDS } from '@/types/tenant'

afterEach(() => {
  clearSession()
  resetDocumentFormFields()
})

function asLeisure() {
  writeSession({
    user: LEISURE_USER,
    tenantId: TENANT_IDS.leisure,
    signedInAt: '2026-01-01T00:00:00.000Z',
  })
}

function asFull() {
  writeSession({
    user: DEMO_USER,
    tenantId: TENANT_IDS.full,
    signedInAt: '2026-01-01T00:00:00.000Z',
  })
}

describe('document form field overrides', () => {
  it('lets an agency customize passport fields for that tenant only', () => {
    asFull()
    saveDocumentFormOverride('passport', [
      {
        key: 'number',
        label: 'Pass no.',
        type: 'text',
        required: true,
      },
      {
        key: 'placeOfIssue',
        label: 'Issued at',
        type: 'text',
      },
      {
        key: 'expiry',
        label: 'Valid until',
        type: 'date',
        required: true,
      },
    ])

    const form = getDocumentForm('passport')
    expect(form.fields.map((field) => field.label)).toEqual([
      'Pass no.',
      'Issued at',
      'Valid until',
    ])
    expect(form.syncToClient).toEqual({ passport: 'number' })

    asLeisure()
    expect(listDocumentFormOverrides()).toEqual([])
    expect(getDocumentForm('passport').fields[0]?.label).toBe('Passport number')
  })

  it('rejects removing locked identity keys', () => {
    asFull()
    expect(() =>
      saveDocumentFormOverride('passport', [
        { key: 'number', label: 'Passport number', type: 'text', required: true },
      ]),
    ).toThrow(/number and expiry/)
  })

  it('restores built-in fields when the override is cleared', () => {
    asFull()
    saveDocumentFormOverride('medical', [
      { key: 'clinic', label: 'Hospital', type: 'text', required: true },
      { key: 'date', label: 'Date', type: 'date', required: true },
      {
        key: 'result',
        label: 'Result',
        type: 'select',
        required: true,
        options: ['Fit', 'Unfit'],
      },
    ])
    expect(getDocumentForm('medical').fields[0]?.label).toBe('Hospital')
    expect(clearDocumentFormOverride('medical')).toBe(true)
    expect(getDocumentForm('medical').fields[0]?.label).toBe('Clinic')
  })

  it('requires two choices for a dropdown field', () => {
    asFull()
    expect(() =>
      saveDocumentFormOverride('medical', [
        { key: 'clinic', label: 'Clinic', type: 'text', required: true },
        {
          key: 'result',
          label: 'Result',
          type: 'select',
          required: true,
          options: ['Fit'],
        },
      ]),
    ).toThrow(/two choices/)
  })
})
