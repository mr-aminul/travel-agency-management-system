import { describe, expect, it } from 'vitest'
import { layoutConfig } from '@/config/layout'
import {
  MODULE_GROUPS,
  filterNavItems,
  isPathAllowed,
  pathAccess,
} from '@/lib/modules'
import { TENANT_IDS } from '@/types/tenant'
import { getTenantById, setTenantModuleEnabled, resetTenantEntitlements } from '@/lib/tenantsStore'
import { afterEach } from 'vitest'

afterEach(() => {
  resetTenantEntitlements()
})

describe('module entitlements', () => {
  it('treats case service slugs as modules and case ids as core', () => {
    expect(pathAccess('/cases/manpower')).toBe('cases.manpower')
    expect(pathAccess('/cases/case-101')).toBe('core')
    expect(pathAccess('/cases/case-101/invoice')).toBe('core')
    expect(pathAccess('/hr')).toBe('hr')
    expect(pathAccess('/admin/tenants')).toBe('admin')
    expect(pathAccess('/admin/tenants/tenant-leisure/users')).toBe('admin')
  })

  it('allows core paths and blocks disabled modules', () => {
    const leisure = getTenantById(TENANT_IDS.leisure)!
    expect(isPathAllowed('/clients', leisure.enabledModules, 'agency_user')).toBe(
      true,
    )
    expect(
      isPathAllowed('/cases/manpower', leisure.enabledModules, 'agency_user'),
    ).toBe(false)
    expect(isPathAllowed('/hr', leisure.enabledModules, 'agency_user')).toBe(
      false,
    )
    expect(
      isPathAllowed('/admin/tenants', leisure.enabledModules, 'agency_user'),
    ).toBe(false)
    expect(
      isPathAllowed('/admin/tenants', leisure.enabledModules, 'platform_admin'),
    ).toBe(true)
    expect(
      isPathAllowed('/clients', leisure.enabledModules, 'platform_admin'),
    ).toBe(false)
    expect(isPathAllowed('/', leisure.enabledModules, 'platform_admin')).toBe(
      false,
    )
  })

  it('limits platform admin nav to tenant management', () => {
    const nav = filterNavItems(
      layoutConfig.navItems,
      [],
      'platform_admin',
    )
    expect(nav.map((item) => item.path)).toEqual(['/admin/tenants'])
  })

  it('hides manpower and HR from leisure nav', () => {
    const leisure = getTenantById(TENANT_IDS.leisure)!
    const nav = filterNavItems(
      layoutConfig.navItems,
      leisure.enabledModules,
      'agency_user',
    )
    const labels = nav.flatMap((item) => [
      item.label,
      ...(item.children?.map((child) => child.label) ?? []),
    ])
    expect(labels).toContain('Leisure')
    expect(labels).toContain('Ticketing')
    expect(labels).toContain('Finance')
    expect(labels).not.toContain('Manpower')
    expect(labels).not.toContain('HR')
    expect(labels).not.toContain('Businesses')
  })

  it('nests case services under Cases and keeps other modules as pages', () => {
    const cases = MODULE_GROUPS.find((group) => group.id === 'cases')
    expect(cases?.modules.map((module) => module.id)).toEqual([
      'cases.manpower',
      'cases.student',
      'cases.hajjUmrah',
      'cases.leisure',
      'cases.ticketing',
    ])
    expect(
      MODULE_GROUPS.filter((group) => group.modules.length === 1).map(
        (group) => group.id,
      ),
    ).toEqual(['finance', 'documents', 'reporting', 'hr'])
  })

  it('restores a module when the platform admin enables it', () => {
    setTenantModuleEnabled(TENANT_IDS.leisure, 'hr', true)
    const leisure = getTenantById(TENANT_IDS.leisure)!
    expect(isPathAllowed('/hr', leisure.enabledModules, 'agency_user')).toBe(
      true,
    )
    const nav = filterNavItems(
      layoutConfig.navItems,
      leisure.enabledModules,
      'agency_user',
    )
    expect(nav.some((item) => item.path === '/hr')).toBe(true)
  })
})
