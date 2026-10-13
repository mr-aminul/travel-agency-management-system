import { afterEach, describe, expect, it } from 'vitest'
import { DEMO_USER, clearSession, writeSession } from '@/lib/authApi'
import {
  createClient,
  getClientById,
  getClientByPhone,
  resetClients,
} from '@/lib/clientsStore'
import { createCase, getCaseById } from '@/lib/casesStore'
import { TENANT_IDS } from '@/types/tenant'
import {
  createTenant,
  resetTenantEntitlements,
  setTenantModuleEnabled,
} from '@/lib/tenantsStore'
import { resetCustomServices } from '@/lib/customServicesStore'
import { resetClientProfileFields } from '@/lib/clientProfileFieldsStore'

afterEach(() => {
  clearSession()
  resetTenantEntitlements()
  resetCustomServices()
  resetClientProfileFields()
  resetClients()
})

function asTenant(tenantId: string) {
  writeSession({
    user: DEMO_USER,
    tenantId,
    signedInAt: '2026-01-01T00:00:00.000Z',
  })
}

describe('tenant-scoped stores', () => {
  it('does not leak clients across tenants', () => {
    const agencyA = createTenant({
      name: 'Agency A',
      enabledModules: ['services.tourPackage', 'finance'],
    })
    const agencyB = createTenant({
      name: 'Agency B',
      enabledModules: ['services.workPermitVisa', 'finance'],
    })

    asTenant(agencyA.id)
    const created = createClient({
      name: 'Only Agency A Client',
      phone: '01700001111',
      primaryService: 'Tour Package',
      idChecked: true,
    })
    expect(getClientById(created.id)?.name).toBe('Only Agency A Client')

    asTenant(agencyB.id)
    expect(getClientById(created.id)).toBeUndefined()
    expect(getClientByPhone('01700001111')).toBeUndefined()
  })

  it('rejects a service that the tenant does not have', () => {
    const leisureOnly = createTenant({
      name: 'Leisure Only Co',
      enabledModules: [
        'services.tourPackage',
        'services.airTicket',
        'finance',
      ],
    })
    asTenant(leisureOnly.id)
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
  })

  it('shows demo seed cases in the demo tenant', () => {
    asTenant(TENANT_IDS.demo)
    expect(getCaseById('case-101')?.service).toBe('Work Permit Visa')
    expect(getCaseById('case-l-105')?.service).toBe('Tour Package')
  })

  it('creates a client under a subAgent tenant from a public intake', () => {
    const agency = createTenant({
      name: 'Intake Agency',
      enabledModules: ['services.workPermitVisa', 'subAgents', 'finance'],
    })
    setTenantModuleEnabled(agency.id, 'services.workPermitVisa', true)

    clearSession()
    const created = createClient(
      {
        name: 'Public Intake Client',
        phone: '01811119999',
        primaryService: 'Work Permit Visa',
        idChecked: true,
        subAgentId: 'AGT-T0001',
      },
      { tenantId: agency.id },
    )

    asTenant(agency.id)
    expect(getClientById(created.id)?.subAgentId).toBe('AGT-T0001')
    expect(getClientByPhone('01811119999')?.name).toBe('Public Intake Client')

    asTenant(TENANT_IDS.demo)
    expect(getClientById(created.id)).toBeUndefined()
  })
})
