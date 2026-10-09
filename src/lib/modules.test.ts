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
    expect(pathAccess('/sub-agents')).toBe('subAgents')
    expect(pathAccess('/agents')).toBe('subAgents')
    expect(normalizeModuleId('agents')).toBe('subAgents')
    expect(pathAccess('/admin')).toBe('admin')
    expect(pathAccess('/admin/agencies')).toBe('admin')
    expect(pathAccess('/admin/agencies/tenant-leisure/people')).toBe('admin')
    expect(pathAccess('/admin/tenants')).toBe('admin')
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
      isPathAllowed('/sub-agents', leisure.enabledModules, 'agency_user'),
    ).toBe(false)
    expect(
      isPathAllowed('/admin/agencies', leisure.enabledModules, 'agency_user'),
    ).toBe(false)
    expect(
      isPathAllowed('/admin/agencies', leisure.enabledModules, 'platform_admin'),
    ).toBe(true)
    expect(
      isPathAllowed('/clients', leisure.enabledModules, 'platform_admin'),
    ).toBe(false)
    expect(isPathAllowed('/', leisure.enabledModules, 'platform_admin')).toBe(
      false,
    )
  })

  it('limits platform admin nav to control-plane homes', () => {
    const nav = filterNavItems(
      layoutConfig.navItems,
      [],
      'platform_admin',
    )
    expect(nav.map((item) => item.path)).toEqual([
      '/admin',
      '/admin/agencies',
      '/admin/people',
      '/admin/activity',
      '/admin/platform',
      '/help',
    ])
  })

  it('scopes sub-agent paths and nav', () => {
    const leisure = getTenantById(TENANT_IDS.leisure)!
    expect(isPathAllowed('/clients', leisure.enabledModules, 'sub_agent')).toBe(
      true,
    )
    expect(
      isPathAllowed('/my-submissions', leisure.enabledModules, 'sub_agent'),
    ).toBe(true)
    expect(
      isPathAllowed('/sub-agents', leisure.enabledModules, 'sub_agent'),
    ).toBe(false)
    expect(
      isPathAllowed('/settings', leisure.enabledModules, 'sub_agent'),
    ).toBe(false)
    const nav = filterNavItems(
      layoutConfig.navItems,
      leisure.enabledModules,
      'sub_agent',
    )
    expect(nav.some((item) => item.path === '/my-submissions')).toBe(true)
    expect(nav.some((item) => item.path === '/sub-agents')).toBe(false)
    expect(nav.some((item) => item.path === '/settings')).toBe(false)
  })

  it('hides HR and subAgents from leisure nav and does not list service types', () => {
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
    expect(labels).not.toContain('Agencies')
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
    ).toEqual(['finance', 'documents', 'subAgents', 'hr'])
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
