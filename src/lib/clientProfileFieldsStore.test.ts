import { afterEach, describe, expect, it } from 'vitest'
import { DEMO_USER, clearSession, writeSession } from '@/lib/authApi'
import {
  createClientProfileField,
  deleteClientProfileField,
  listClientProfileFields,
  resetClientProfileFields,
} from '@/lib/clientProfileFieldsStore'
import { TENANT_IDS } from '@/types/tenant'
import {
  createTenant,
  resetTenantEntitlements,
} from '@/lib/tenantsStore'

afterEach(() => {
  clearSession()
  resetClientProfileFields()
  resetTenantEntitlements()
})

function asTenant(tenantId: string) {
  writeSession({
    user: DEMO_USER,
    tenantId,
    signedInAt: '2026-01-01T00:00:00.000Z',
  })
}

function asDemo() {
  asTenant(TENANT_IDS.demo)
}

describe('client profile custom fields', () => {
  it('lets an agency add a field that stays on that tenant', () => {
    asDemo()
    const created = createClientProfileField({
      label: 'Profession',
      type: 'text',
    })
    expect(listClientProfileFields()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: created.id, label: 'Profession' }),
      ]),
    )

    const other = createTenant({ name: 'Other Profile Agency' })
    asTenant(other.id)
    expect(listClientProfileFields()).toEqual([])
  })

  it('rejects a duplicate label on the same tenant', () => {
    asDemo()
    createClientProfileField({ label: 'Preferred country', type: 'country' })
    expect(() =>
      createClientProfileField({ label: 'preferred country', type: 'text' }),
    ).toThrow(/already have a field/)
  })

  it('requires at least two choices for a list field', () => {
    asDemo()
    expect(() =>
      createClientProfileField({
        label: 'Trade',
        type: 'select',
        options: ['Mason'],
      }),
    ).toThrow(/two choices/)
  })

  it('removes a field from the tenant catalog', () => {
    asDemo()
    const created = createClientProfileField({
      label: 'Preferred job',
      type: 'text',
    })
    expect(deleteClientProfileField(created.id)).toBe(true)
    expect(listClientProfileFields()).toEqual([])
  })
})
