import { afterEach, describe, expect, it } from 'vitest'
import {
  DEMO_USER,
  LEISURE_USER,
  clearSession,
  writeSession,
} from '@/lib/authApi'
import {
  createClientProfileField,
  deleteClientProfileField,
  listClientProfileFields,
  resetClientProfileFields,
} from '@/lib/clientProfileFieldsStore'
import { TENANT_IDS } from '@/types/tenant'

afterEach(() => {
  clearSession()
  resetClientProfileFields()
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

describe('client profile custom fields', () => {
  it('lets an agency add a field that stays on that tenant', () => {
    asFull()
    const created = createClientProfileField({
      label: 'Profession',
      type: 'text',
    })
    expect(listClientProfileFields()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: created.id, label: 'Profession' }),
      ]),
    )

    asLeisure()
    expect(listClientProfileFields()).toEqual([])
  })

  it('rejects a duplicate label on the same tenant', () => {
    asFull()
    createClientProfileField({ label: 'Preferred country', type: 'country' })
    expect(() =>
      createClientProfileField({ label: 'preferred country', type: 'text' }),
    ).toThrow(/already have a field/)
  })

  it('requires at least two choices for a list field', () => {
    asFull()
    expect(() =>
      createClientProfileField({
        label: 'Trade',
        type: 'select',
        options: ['Mason'],
      }),
    ).toThrow(/two choices/)
  })

  it('removes a field from the tenant catalog', () => {
    asFull()
    const created = createClientProfileField({
      label: 'Preferred job',
      type: 'text',
    })
    expect(deleteClientProfileField(created.id)).toBe(true)
    expect(listClientProfileFields()).toEqual([])
  })
})
