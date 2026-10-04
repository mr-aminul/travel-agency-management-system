import type { NavItem } from '@/layout/types'
import type { ServiceType } from '@/types/case'
import type { ModuleId, UserRole } from '@/types/tenant'

export type ModuleCatalogItem = {
  id: ModuleId
  label: string
  description: string
}

/** Pages in the agency product. Nested items are sub-pages of that subject. */
export type ModuleGroup = {
  id: string
  label: string
  description: string
  modules: ModuleCatalogItem[]
}

export const MODULE_GROUPS: ModuleGroup[] = [
  {
    id: 'cases',
    label: 'Cases',
    description: 'Work files by purpose — same sub-pages as the Cases sidebar',
    modules: [
      {
        id: 'cases.manpower',
        label: 'Manpower',
        description: 'Recruitment and overseas employment files',
      },
      {
        id: 'cases.student',
        label: 'Student',
        description: 'Study-abroad files',
      },
      {
        id: 'cases.hajjUmrah',
        label: 'Hajj / Umrah',
        description: 'Pilgrimage packages',
      },
      {
        id: 'cases.leisure',
        label: 'Leisure',
        description: 'Holiday and tour packages',
      },
      {
        id: 'cases.ticketing',
        label: 'Ticketing',
        description: 'Airline bookings',
      },
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    description: 'Payments and balances workspace',
    modules: [
      {
        id: 'finance',
        label: 'Finance',
        description: 'Payments and balances workspace',
      },
    ],
  },
  {
    id: 'documents',
    label: 'Documents',
    description: 'Agency-wide document library',
    modules: [
      {
        id: 'documents',
        label: 'Documents',
        description: 'Agency-wide document library',
      },
    ],
  },
  {
    id: 'reporting',
    label: 'Reporting',
    description: 'Reports and insights',
    modules: [
      {
        id: 'reporting',
        label: 'Reporting',
        description: 'Reports and insights',
      },
    ],
  },
  {
    id: 'hr',
    label: 'HR',
    description: 'Employee management',
    modules: [
      {
        id: 'hr',
        label: 'HR',
        description: 'Employee management (stub)',
      },
    ],
  },
]

export const MODULE_CATALOG: ModuleCatalogItem[] = MODULE_GROUPS.flatMap(
  (group) => group.modules,
)

export const ALL_MODULE_IDS: ModuleId[] = MODULE_CATALOG.map((item) => item.id)

export const SERVICE_MODULE: Record<ServiceType, ModuleId> = {
  Manpower: 'cases.manpower',
  Student: 'cases.student',
  'Hajj/Umrah': 'cases.hajjUmrah',
  Leisure: 'cases.leisure',
  Ticketing: 'cases.ticketing',
}

const SERVICE_SLUG_MODULE: Record<string, ModuleId> = {
  manpower: 'cases.manpower',
  student: 'cases.student',
  'hajj-umrah': 'cases.hajjUmrah',
  leisure: 'cases.leisure',
  ticketing: 'cases.ticketing',
}

export function moduleSet(modules: readonly ModuleId[]): Set<ModuleId> {
  return new Set(modules)
}

export function hasModule(
  modules: readonly ModuleId[],
  id: ModuleId,
): boolean {
  return modules.includes(id)
}

export function isServiceEnabled(
  modules: readonly ModuleId[],
  service: ServiceType,
): boolean {
  return hasModule(modules, SERVICE_MODULE[service])
}

export type PathAccess = 'core' | 'admin' | ModuleId

export function pathAccess(pathname: string): PathAccess {
  const path = pathname.endsWith('/') && pathname.length > 1
    ? pathname.slice(0, -1)
    : pathname

  if (path === '/admin' || path.startsWith('/admin/')) return 'admin'
  if (path === '/hr' || path.startsWith('/hr/')) return 'hr'
  if (path === '/finance' || path.startsWith('/finance/')) return 'finance'
  if (path === '/documents' || path.startsWith('/documents/')) return 'documents'
  if (path === '/reporting' || path.startsWith('/reporting/')) return 'reporting'

  const serviceMatch = path.match(
    /^\/cases\/(manpower|student|hajj-umrah|leisure|ticketing)(?:\/|$)/,
  )
  if (serviceMatch) return SERVICE_SLUG_MODULE[serviceMatch[1]]

  return 'core'
}

export function signedInHomePath(role: UserRole): string {
  return role === 'platform_admin' ? '/admin/tenants' : '/'
}

export function isPathAllowed(
  pathname: string,
  modules: readonly ModuleId[],
  role: UserRole,
): boolean {
  const access = pathAccess(pathname)
  if (role === 'platform_admin') return access === 'admin'
  if (access === 'core') return true
  if (access === 'admin') return false
  return hasModule(modules, access)
}

export function filterNavItems(
  items: NavItem[],
  modules: readonly ModuleId[],
  role: UserRole,
): NavItem[] {
  if (role === 'platform_admin') {
    return items.filter((item) => item.adminOnly)
  }

  const enabled = moduleSet(modules)
  return items.flatMap((item) => {
    if (item.adminOnly) return []
    if (item.moduleId && !enabled.has(item.moduleId)) return []
    const children = item.children
      ? filterNavItems(item.children, modules, role)
      : undefined
    return [{ ...item, ...(children ? { children } : {}) }]
  })
}

export function flattenNavItems(items: NavItem[]): NavItem[] {
  return items.flatMap((item) =>
    item.children?.length ? [item, ...flattenNavItems(item.children)] : [item],
  )
}
