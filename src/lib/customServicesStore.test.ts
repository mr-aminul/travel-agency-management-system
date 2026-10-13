import { afterEach, describe, expect, it } from 'vitest'
import { DEMO_USER, clearSession, writeSession } from '@/lib/authApi'
import { getFirstStepId, getStepDefs } from '@/lib/caseChecklist'
import {
  createCase,
  getCasesByService,
  renameServiceOnCases,
} from '@/lib/casesStore'
import {
  createClient,
  getClientById,
  renameServiceOnClients,
} from '@/lib/clientsStore'
import {
  createCustomService,
  deleteCustomService,
  resetCustomServices,
  updateCustomService,
  validateCustomServiceName,
} from '@/lib/customServicesStore'
import {
  hideCatalogService,
  resetHiddenServices,
  restoreCatalogService,
} from '@/lib/hiddenServicesStore'
import {
  getServiceIconOverride,
  resetServiceIconOverrides,
} from '@/lib/serviceIconOverridesStore'
import {
  getServiceTemplateOverride,
  resetServiceTemplates,
} from '@/lib/serviceTemplatesStore'
import { getEnabledServiceOptions } from '@/lib/serviceCatalog'
import { TENANT_IDS } from '@/types/tenant'
import {
  createTenant,
  resetTenantEntitlements,
} from '@/lib/tenantsStore'

afterEach(() => {
  clearSession()
  resetCustomServices()
  resetServiceTemplates()
  resetHiddenServices()
  resetServiceIconOverrides()
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

describe('custom services', () => {
  it('rejects names that collide with built-in templates', () => {
    asDemo()
    expect(validateCustomServiceName('Air Ticket')).toMatch(/already used/)
    expect(validateCustomServiceName('hajj umrah')).toMatch(/too close/)
  })

  it('lets an agency create a service and open a file on it', () => {
    asDemo()
    const created = createCustomService({
      name: 'Visa processing',
      description: 'Embassy files',
      iconId: 'stamp',
    })
    expect(created.name).toBe('Visa processing')
    expect(getServiceIconOverride('Visa processing')).toBe('stamp')
    expect(
      getEnabledServiceOptions().some(
        (option) => option.value === 'Visa processing',
      ),
    ).toBe(true)

    const client = createClient({
      name: 'Visa Client',
      phone: '01700009999',
      primaryService: 'Visa processing',
      idChecked: true,
    })
    const file = createCase({
      clientId: client.id,
      service: 'Visa processing',
    })
    expect(file.service).toBe('Visa processing')
    expect(file.currentStepId).toBe(getFirstStepId('Visa processing'))
    expect(getStepDefs('Visa processing')[0].id).toBe('intake')
    expect(file.documents.length).toBeGreaterThan(0)
  })

  it('lets an agency rename a custom service and keep files attached', () => {
    asDemo()
    const created = createCustomService({
      name: 'Courier desk',
      description: 'Document runs',
    })
    const client = createClient({
      name: 'Courier Client',
      phone: '01700006666',
      primaryService: 'Courier desk',
      idChecked: true,
    })
    createCase({ clientId: client.id, service: 'Courier desk' })

    const updated = updateCustomService(created.id, {
      name: 'Document courier',
      description: 'Passport and embassy runs',
    })
    expect(updated?.name).toBe('Document courier')
    expect(getServiceTemplateOverride('Courier desk')).toBeUndefined()
    expect(
      getServiceTemplateOverride('Document courier')?.steps.length,
    ).toBeGreaterThan(0)

    renameServiceOnCases('Courier desk', 'Document courier')
    renameServiceOnClients('Courier desk', 'Document courier')

    expect(getCasesByService('Document courier')).toHaveLength(1)
    expect(getClientById(client.id)?.services).toContain('Document courier')
    expect(
      getEnabledServiceOptions().some(
        (option) => option.value === 'Document courier',
      ),
    ).toBe(true)
  })

  it('lets an agency delete a custom service from the catalog', () => {
    asDemo()
    const created = createCustomService({ name: 'Umrah add-on' })
    expect(
      getEnabledServiceOptions().some((option) => option.value === 'Umrah add-on'),
    ).toBe(true)
    expect(deleteCustomService(created.id)).toBe(true)
    expect(
      getEnabledServiceOptions().some((option) => option.value === 'Umrah add-on'),
    ).toBe(false)
  })

  it('hides a built-in service from new files and restores it', () => {
    asDemo()
    expect(
      getEnabledServiceOptions().some((option) => option.value === 'Work Permit Visa'),
    ).toBe(true)
    hideCatalogService('Work Permit Visa')
    expect(
      getEnabledServiceOptions().some((option) => option.value === 'Work Permit Visa'),
    ).toBe(false)
    restoreCatalogService('Work Permit Visa')
    expect(
      getEnabledServiceOptions().some((option) => option.value === 'Work Permit Visa'),
    ).toBe(true)
  })

  it('does not let a limited agency open work-permit after adding a custom service', () => {
    const limited = createTenant({
      name: 'Leisure Catalog Co',
      enabledModules: [
        'services.tourPackage',
        'services.airTicket',
        'finance',
      ],
    })
    asTenant(limited.id)
    createCustomService({ name: 'Airport transfer' })
    const client = createClient({
      name: 'Transfer Client',
      phone: '01700008888',
      primaryService: 'Airport transfer',
      idChecked: true,
    })
    expect(() =>
      createCase({ clientId: client.id, service: 'Work Permit Visa' }),
    ).toThrow(/not enabled/)
  })
})
