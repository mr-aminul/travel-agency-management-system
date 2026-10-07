import { describe, expect, it } from 'vitest'
import { ALL_MODULE_IDS } from '@/lib/modules'
import { TENANT_IDS } from '@/types/tenant'
import type { Client } from '@/types/client'
import type { Case } from '@/types/case'
import { buildSearchCatalog } from './catalog'

const rahim: Client = {
  id: 'c-284',
  tenantId: TENANT_IDS.full,
  name: 'Md. Rahim Uddin',
  phone: '01712345678',
  passport: 'A12345678',
  services: ['Work Permit Visa'],
  balance: 0,
  activeCases: 1,
  idChecked: true,
  createdAt: '2025-11-12',
}

const workFile = {
  id: 'case-101',
  tenantId: TENANT_IDS.full,
  caseId: 'SR-00101',
  clientId: 'c-284',
  clientName: 'Md. Rahim Uddin',
  service: 'Work Permit Visa',
  status: 'In-Progress',
  stage: 'Processing',
  currentStepId: 'medical',
  steps: {},
  documents: [],
  serviceFee: 180000,
  balance: 165000,
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
} as Case

describe('buildSearchCatalog', () => {
  it('indexes clients, service files, and pages for agency users', () => {
    const items = buildSearchCatalog({
      user: { name: 'Demo User', role: 'agency_user' },
      enabledModules: ALL_MODULE_IDS,
      clients: [rahim],
      cases: [workFile],
      subAgents: [],
      employees: [],
    })

    expect(items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'client:c-284',
          path: '/clients/c-284',
        }),
        expect.objectContaining({
          id: 'service:case-101',
          path: '/clients/c-284/services/case-101',
        }),
        expect.objectContaining({ id: 'page:/clients', label: 'Clients' }),
        expect.objectContaining({ id: 'action:create-client' }),
      ]),
    )
    expect(items.filter((item) => item.path === '/hr/employees')).toHaveLength(1)
  })

  it('keeps platform admin on businesses only', () => {
    const items = buildSearchCatalog({
      user: { name: 'Aminul Islam Borhan', role: 'platform_admin' },
      enabledModules: ALL_MODULE_IDS,
      clients: [rahim],
      cases: [workFile],
      subAgents: [],
      employees: [],
    })

    expect(items.some((item) => item.id === 'client:c-284')).toBe(false)
    expect(items.some((item) => item.id === 'action:businesses')).toBe(true)
    expect(items.some((item) => item.id === 'page:/admin/tenants')).toBe(true)
  })
})
