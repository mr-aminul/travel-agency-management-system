import { afterEach, describe, expect, it } from 'vitest'
import {
  LEISURE_USER,
  MANPOWER_USER,
  clearSession,
  writeSession,
} from '@/lib/authApi'
import {
  createClient,
  getClientById,
  getClientByPhone,
  resetClients,
} from '@/lib/clientsStore'
import { createCase, getCaseById } from '@/lib/casesStore'
import { TENANT_IDS } from '@/types/tenant'
import { resetTenantEntitlements } from '@/lib/tenantsStore'
import { resetCustomServices } from '@/lib/customServicesStore'
import { resetClientProfileFields } from '@/lib/clientProfileFieldsStore'

afterEach(() => {
  clearSession()
  resetTenantEntitlements()
  resetCustomServices()
  resetClientProfileFields()
  resetClients()
})

function asLeisure() {
  writeSession({
    user: LEISURE_USER,
    tenantId: TENANT_IDS.leisure,
    signedInAt: '2026-01-01T00:00:00.000Z',
  })
}

function asManpower() {
  writeSession({
    user: MANPOWER_USER,
    tenantId: TENANT_IDS.manpower,
    signedInAt: '2026-01-01T00:00:00.000Z',
  })
}

describe('tenant-scoped stores', () => {
  it('does not leak clients across tenants', () => {
    asLeisure()
    const created = createClient({
      name: 'Only Leisure Client',
      phone: '01700001111',
      primaryService: 'Tour Package',
      idChecked: true,
    })
    expect(getClientById(created.id)?.name).toBe('Only Leisure Client')

    asManpower()
    expect(getClientById(created.id)).toBeUndefined()
    expect(getClientByPhone('01700001111')).toBeUndefined()
  })

  it('rejects a service that the tenant does not have', () => {
    asLeisure()
    const client = createClient({
      name: 'No Manpower',
      phone: '01700002222',
      primaryService: 'Air Ticket',
      idChecked: true,
    })
    expect(() =>
      createCase({
        clientId: client.id,
        service: 'Work Permit Visa',
      }),
    ).toThrow(/not enabled/)
    expect(getCaseById('case-m-101')).toBeUndefined()
  })

  it('shows manpower seed cases only in the manpower tenant', () => {
    asManpower()
    expect(getCaseById('case-m-101')?.service).toBe('Work Permit Visa')
    asLeisure()
    expect(getCaseById('case-m-101')).toBeUndefined()
    expect(getCaseById('case-l-105')?.service).toBe('Tour Package')
  })

  it('creates a client under a partner tenant from a public intake', () => {
    clearSession()
    const created = createClient(
      {
        name: 'Public Intake Client',
        phone: '01811119999',
        primaryService: 'Work Permit Visa',
        idChecked: true,
        partnerId: 'AGT-M0001',
      },
      { tenantId: TENANT_IDS.manpower },
    )

    asManpower()
    expect(getClientById(created.id)?.partnerId).toBe('AGT-M0001')
    expect(getClientByPhone('01811119999')?.name).toBe('Public Intake Client')

    asLeisure()
    expect(getClientById(created.id)).toBeUndefined()
  })
})
