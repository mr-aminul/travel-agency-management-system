import { afterEach, describe, expect, it } from 'vitest'
import {
  DEMO_USER,
  clearSession,
  writeSession,
} from '@/lib/authApi'
import {
  createClient,
  getClientById,
  getClientByPhone,
  resetClients,
} from '@/lib/clientsStore'
import { createSubAgent, resetSubAgents } from '@/lib/subAgentsStore'
import {
  createTenant,
  resetTenantEntitlements,
} from '@/lib/tenantsStore'
import { TENANT_IDS } from '@/types/tenant'

afterEach(() => {
  clearSession()
  resetClients()
  resetSubAgents()
  resetTenantEntitlements()
})

describe('tenant isolation for sub agents', () => {
  it('creates globally unique sub-agent ids', () => {
    writeSession({
      user: DEMO_USER,
      tenantId: TENANT_IDS.demo,
      signedInAt: '2026-01-01T00:00:00.000Z',
    })
    const first = createSubAgent({
      name: 'Agent One',
      phone: '01710000001',
    })
    const second = createSubAgent({
      name: 'Agent Two',
      phone: '01710000002',
    })
    expect(first.id).not.toBe(second.id)
    expect(first.id.startsWith('AGT-')).toBe(true)
    expect(first.id).not.toMatch(/^AGT-T\d{4}$/)
  })

  it('rejects attaching a client to a sub agent from another agency', () => {
    writeSession({
      user: DEMO_USER,
      tenantId: TENANT_IDS.demo,
      signedInAt: '2026-01-01T00:00:00.000Z',
    })
    expect(() =>
      createClient({
        name: 'Wrong Agency Lead',
        phone: '01899998888',
        primaryService: 'Tour Package',
        idChecked: true,
        subAgentId: 'AGT-OTHER-TENANT',
      }),
    ).toThrow(/not part of this agency/i)
  })
})

describe('tenant isolation for clients', () => {
  it('hides another agency client from the active session', () => {
    const otherTenant = createTenant({
      name: 'Other Recruiting House',
      enabledModules: ['services.tourPackage', 'services.workPermitVisa'],
    })
    const other = createClient(
      {
        name: 'Other Agency Client',
        phone: '01870001111',
        primaryService: 'Tour Package',
        idChecked: true,
      },
      { tenantId: otherTenant.id },
    )

    writeSession({
      user: DEMO_USER,
      tenantId: TENANT_IDS.demo,
      signedInAt: '2026-01-01T00:00:00.000Z',
    })

    expect(getClientById(other.id)).toBeUndefined()
    expect(getClientByPhone(other.phone)).toBeUndefined()
  })

  it('allows the same phone on a different agency', () => {
    const otherTenant = createTenant({
      name: 'Sister Agency Ltd',
      enabledModules: ['services.tourPackage', 'services.workPermitVisa'],
    })
    createClient(
      {
        name: 'Agency A Lead',
        phone: '01870002222',
        primaryService: 'Tour Package',
        idChecked: true,
      },
      { tenantId: otherTenant.id },
    )

    writeSession({
      user: DEMO_USER,
      tenantId: TENANT_IDS.demo,
      signedInAt: '2026-01-01T00:00:00.000Z',
    })

    const mine = createClient({
      name: 'Agency Demo Lead',
      phone: '01870002222',
      primaryService: 'Work Permit Visa',
      idChecked: true,
    })

    expect(mine.tenantId).toBe(TENANT_IDS.demo)
    expect(getClientByPhone('01870002222')?.id).toBe(mine.id)
    expect(
      getClientByPhone('01870002222', undefined, otherTenant.id)?.name,
    ).toBe('Agency A Lead')
  })
})
