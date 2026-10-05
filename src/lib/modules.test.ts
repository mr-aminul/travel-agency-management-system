import { describe, expect, it, afterEach } from 'vitest'
import { layoutConfig } from '@/config/layout'
import {
  MODULE_GROUPS,
  filterNavItems,
  isPathAllowed,
  normalizeModuleId,
  pathAccess,
} from '@/lib/modules'
import { TENANT_IDS } from '@/types/tenant'
import {
  getTenantById,
  setTenantModuleEnabled,
  resetTenantEntitlements,
} from '@/lib/tenantsStore'

afterEach(() => {
  resetTenantEntitlements()
})

describe('module entitlements', () => {
  it('treats services urls as core', () => {
    expect(pathAccess('/services')).toBe('core')
    expect(pathAccess('/settings')).toBe('core')
    expect(pathAccess('/settings/services/tourist-visa')).toBe('core')
    expect(pathAccess('/clients/c-284/services/case-101')).toBe('core')
    expect(pathAccess('/clients/c-284/services/case-101/invoice')).toBe('core')
    expect(pathAccess('/services/case-101')).toBe('core')
    expect(pathAccess('/services/case-101/invoice')).toBe('core')
    expect(pathAccess('/work')).toBe('core')
    expect(pathAccess('/cases/manpower')).toBe('core')
    expect(pathAccess('/hr')).toBe('hr')
    expect(pathAccess('/hr/employees')).toBe('hr')
    expect(pathAccess('/hr/employees/EMP-7001')).toBe('hr')
    expect(pathAccess('/hr/attendance')).toBe('hr')
    expect(pathAccess('/hr/payroll')).toBe('hr')
    expect(pathAccess('/partners')).toBe('partners')
    expect(pathAccess('/agents')).toBe('partners')
    expect(normalizeModuleId('agents')).toBe('partners')
    expect(pathAccess('/admin/tenants')).toBe('admin')
    expect(pathAccess('/admin/tenants/tenant-leisure/users')).toBe('admin')
    expect(pathAccess('/payments')).toBe('finance')
    expect(pathAccess('/finance')).toBe('finance')
  })

  it('allows core paths and blocks disabled modules', () => {
    const leisure = getTenantById(TENANT_IDS.leisure)!
    expect(isPathAllowed('/clients', leisure.enabledModules, 'agency_user')).toBe(
      true,
    )
    expect(isPathAllowed('/services', leisure.enabledModules, 'agency_user')).toBe(
      true,
    )
    expect(isPathAllowed('/hr', leisure.enabledModules, 'agency_user')).toBe(
      false,
    )
    expect(
      isPathAllowed('/partners', leisure.enabledModules, 'agency_user'),
    ).toBe(false)
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

  it('hides HR and partners from leisure nav and does not list service types', () => {
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
    expect(labels).toContain('Services')
    expect(labels).toContain('Clients')
    expect(labels).toContain('Payments')
    expect(labels).not.toContain('Manpower')
    expect(labels).not.toContain('Leisure')
    expect(labels).not.toContain('Ticketing')
    expect(labels).not.toContain('HR')
    expect(labels).not.toContain('Sub Agents')
    expect(labels).not.toContain('Businesses')
  })

  it('lists service templates separately from workspace pages', () => {
    const services = MODULE_GROUPS.find((group) => group.id === 'services')
    expect(services?.modules.map((module) => module.id)).toEqual([
      'services.touristVisa',
      'services.studentVisa',
      'services.workPermitVisa',
      'services.hajjUmrahVisa',
      'services.medicalVisa',
      'services.airTicket',
      'services.hotelBooking',
      'services.tourPackage',
    ])
    expect(
      MODULE_GROUPS.filter((group) => group.modules.length === 1).map(
        (group) => group.id,
      ),
    ).toEqual(['finance', 'documents', 'reporting', 'partners', 'hr'])
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
    expect(
      nav
        .find((item) => item.path === '/hr')
        ?.children?.map((child) => child.label),
    ).toEqual(['Employees', 'Attendance & Leave', 'Payroll'])
  })
})
