import { describe, expect, it, afterEach } from 'vitest'
import { layoutConfig } from '@/config/layout'
import { DATA_KEYS, saveJson } from '@/lib/data'
import {
  MODULE_GROUPS,
  filterNavItems,
  isPathAllowed,
  normalizeModuleId,
  pathAccess,
} from '@/lib/modules'
import { TENANT_IDS } from '@/types/tenant'
import {
  createTenant,
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
    expect(pathAccess('/admin/agencies/tenant-full/people')).toBe('admin')
    expect(pathAccess('/admin/tenants')).toBe('admin')
    expect(pathAccess('/payments')).toBe('finance')
    expect(pathAccess('/finance')).toBe('finance')
  })

  it('allows core paths and blocks disabled modules', () => {
    const limited = createTenant({
      name: 'Limited Modules Co',
      enabledModules: [
        'services.tourPackage',
        'services.airTicket',
        'services.hotelBooking',
        'services.touristVisa',
        'finance',
      ],
    })
    expect(isPathAllowed('/clients', limited.enabledModules, 'agency_user')).toBe(
      true,
    )
    expect(isPathAllowed('/services', limited.enabledModules, 'agency_user')).toBe(
      true,
    )
    expect(isPathAllowed('/hr', limited.enabledModules, 'agency_user')).toBe(
      false,
    )
    expect(
      isPathAllowed('/sub-agents', limited.enabledModules, 'agency_user'),
    ).toBe(false)
    expect(
      isPathAllowed('/admin/agencies', limited.enabledModules, 'agency_user'),
    ).toBe(false)
    expect(
      isPathAllowed('/admin/agencies', limited.enabledModules, 'platform_admin'),
    ).toBe(true)
    expect(
      isPathAllowed('/clients', limited.enabledModules, 'platform_admin'),
    ).toBe(false)
    expect(isPathAllowed('/', limited.enabledModules, 'platform_admin')).toBe(
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
      '/admin/plans',
      '/admin/admins',
    ])
    expect(nav.map((item) => item.label)).toEqual([
      'Platform',
      'Agencies',
      'Users',
      'Activity',
      'Plans',
      'Admins',
    ])
  })

  it('scopes sub-agent paths and nav', () => {
    const limited = createTenant({
      name: 'Sub-agent Scope Co',
      enabledModules: [
        'services.tourPackage',
        'services.airTicket',
        'finance',
      ],
    })
    expect(isPathAllowed('/clients', limited.enabledModules, 'sub_agent')).toBe(
      true,
    )
    expect(
      isPathAllowed('/my-submissions', limited.enabledModules, 'sub_agent'),
    ).toBe(true)
    expect(
      isPathAllowed('/sub-agents', limited.enabledModules, 'sub_agent'),
    ).toBe(false)
    expect(
      isPathAllowed('/settings', limited.enabledModules, 'sub_agent'),
    ).toBe(false)
    const nav = filterNavItems(
      layoutConfig.navItems,
      limited.enabledModules,
      'sub_agent',
    )
    expect(nav.some((item) => item.path === '/my-submissions')).toBe(true)
    expect(nav.some((item) => item.path === '/sub-agents')).toBe(false)
    expect(nav.some((item) => item.path === '/settings')).toBe(false)
  })

  it('hides HR and subAgents from a limited catalog nav', () => {
    const limited = createTenant({
      name: 'Catalog Limited Co',
      enabledModules: [
        'services.tourPackage',
        'services.airTicket',
        'services.hotelBooking',
        'services.touristVisa',
        'finance',
      ],
    })
    const nav = filterNavItems(
      layoutConfig.navItems,
      limited.enabledModules,
      'agency_user',
    )
    const labels = nav.flatMap((item) => [
      item.label,
      ...(item.children?.map((child) => child.label) ?? []),
    ])
    expect(labels).toContain('Services')
    expect(labels).toContain('Clients')
    expect(labels).toContain('Payments')
    expect(labels).not.toContain('Dashboard')
    expect(labels).not.toContain('Settings')
    expect(labels).not.toContain('Trash')
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
    const agency = createTenant({
      name: 'Enable HR Co',
      enabledModules: ['finance'],
    })
    setTenantModuleEnabled(agency.id, 'hr', true)
    const updated = getTenantById(agency.id)!
    expect(isPathAllowed('/hr', updated.enabledModules, 'agency_user')).toBe(
      true,
    )
    const nav = filterNavItems(
      layoutConfig.navItems,
      updated.enabledModules,
      'agency_user',
    )
    expect(nav.some((item) => item.path === '/hr')).toBe(true)
    expect(
      nav
        .find((item) => item.path === '/hr')
        ?.children?.map((child) => child.label),
    ).toEqual(['Employees', 'Attendance & Leave', 'Payroll'])
  })

  it('creates agencies with every product module off', () => {
    const agency = createTenant({ name: 'Blank Agency Co' })
    expect(agency.enabledModules).toEqual([])
    expect(getTenantById(agency.id)?.enabledModules).toEqual([])
  })

  it('keeps toggles when the agency also exists in created tenants', () => {
    const leisure = getTenantById(TENANT_IDS.demo)!
    saveJson(DATA_KEYS.tenantsCreated, [
      {
        ...leisure,
        enabledModules: ['finance'],
      },
    ])
    window.dispatchEvent(new Event('pd-data-rehydrated'))

    setTenantModuleEnabled(TENANT_IDS.demo, 'hr', true)
    expect(getTenantById(TENANT_IDS.demo)!.enabledModules).toContain('hr')

    setTenantModuleEnabled(TENANT_IDS.demo, 'finance', false)
    expect(getTenantById(TENANT_IDS.demo)!.enabledModules).not.toContain(
      'finance',
    )
  })
})
