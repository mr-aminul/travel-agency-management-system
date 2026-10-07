import type { NavItem } from '@/layout/types'
import {
  isBuiltinService,
  type BuiltinServiceType,
  type ServiceType,
} from '@/types/case'
import type { ModuleId, UserRole } from '@/types/tenant'

export type ModuleCatalogItem = {
  id: ModuleId
  label: string
  description: string
}

/** Pages and templates the agency can enable. */
export type ModuleGroup = {
  id: string
  label: string
  description: string
  modules: ModuleCatalogItem[]
}

export const MODULE_GROUPS: ModuleGroup[] = [
  {
    id: 'services',
    label: 'Services',
    description:
      'Templates this agency sells. They filter Services — they are not extra sidebar pages.',
    modules: [
      {
        id: 'services.touristVisa',
        label: 'Tourist Visa',
        description: 'Visit and tourist visa files',
      },
      {
        id: 'services.studentVisa',
        label: 'Student Visa',
        description: 'Study-abroad visa files',
      },
      {
        id: 'services.workPermitVisa',
        label: 'Work Permit Visa',
        description: 'Employment and work-permit files',
      },
      {
        id: 'services.hajjUmrahVisa',
        label: 'Hajj / Umrah Visa',
        description: 'Pilgrimage visa files',
      },
      {
        id: 'services.medicalVisa',
        label: 'Medical Visa',
        description: 'Treatment and medical visa files',
      },
      {
        id: 'services.airTicket',
        label: 'Air Ticket',
        description: 'Airline bookings',
      },
      {
        id: 'services.hotelBooking',
        label: 'Hotel Booking',
        description: 'Hotel reservations',
      },
      {
        id: 'services.tourPackage',
        label: 'Tour Package',
        description: 'Holiday and tour packages',
      },
    ],
  },
  {
    id: 'finance',
    label: 'Payments',
    description: 'Payments and balances workspace',
    modules: [
      {
        id: 'finance',
        label: 'Payments',
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
    id: 'subAgents',
    label: 'Sub Agents',
    description: 'Sub agents who send clients into the pipeline',
    modules: [
      {
        id: 'subAgents',
        label: 'Sub Agents',
        description: 'Sub agent directory and customer pipeline',
      },
    ],
  },
  {
    id: 'hr',
    label: 'HR',
    description: 'Employees, attendance, and payroll',
    modules: [
      {
        id: 'hr',
        label: 'HR',
        description: 'Employees, attendance, and payroll',
      },
    ],
  },
]

export const MODULE_CATALOG: ModuleCatalogItem[] = MODULE_GROUPS.flatMap(
  (group) => group.modules,
)

export const ALL_MODULE_IDS: ModuleId[] = MODULE_CATALOG.map((item) => item.id)

export const SERVICE_MODULE: Record<BuiltinServiceType, ModuleId> = {
  'Tourist Visa': 'services.touristVisa',
  'Student Visa': 'services.studentVisa',
  'Work Permit Visa': 'services.workPermitVisa',
  'Hajj/Umrah Visa': 'services.hajjUmrahVisa',
  'Medical Visa': 'services.medicalVisa',
  'Air Ticket': 'services.airTicket',
  'Hotel Booking': 'services.hotelBooking',
  'Tour Package': 'services.tourPackage',
}

const LEGACY_MODULE_ID: Record<string, ModuleId> = {
  'services.manpower': 'services.workPermitVisa',
  'services.student': 'services.studentVisa',
  'services.hajjUmrah': 'services.hajjUmrahVisa',
  'services.leisure': 'services.tourPackage',
  'services.ticketing': 'services.airTicket',
  'cases.manpower': 'services.workPermitVisa',
  'cases.student': 'services.studentVisa',
  'cases.hajjUmrah': 'services.hajjUmrahVisa',
  'cases.leisure': 'services.tourPackage',
  'cases.ticketing': 'services.airTicket',
  agents: 'subAgents',
  partners: 'subAgents',
}

export function normalizeModuleId(value: string): ModuleId | undefined {
  const mapped = LEGACY_MODULE_ID[value] ?? value
  return ALL_MODULE_IDS.includes(mapped as ModuleId)
    ? (mapped as ModuleId)
    : undefined
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
  if (!isBuiltinService(service)) return false
  return hasModule(modules, SERVICE_MODULE[service])
}

export type PathAccess = 'core' | 'admin' | ModuleId

export function pathAccess(pathname: string): PathAccess {
  const path = pathname.endsWith('/') && pathname.length > 1
    ? pathname.slice(0, -1)
    : pathname

  if (path === '/admin' || path.startsWith('/admin/')) return 'admin'
  if (path === '/hr' || path.startsWith('/hr/')) return 'hr'
  if (
    path === '/sub-agents' ||
    path.startsWith('/sub-agents/') ||
    path === '/partners' ||
    path.startsWith('/partners/') ||
    path === '/agents' ||
    path.startsWith('/agents/')
  ) {
    return 'subAgents'
  }
  if (
    path === '/payments' ||
    path.startsWith('/payments/') ||
    path === '/finance' ||
    path.startsWith('/finance/')
  ) {
    return 'finance'
  }
  if (path === '/documents' || path.startsWith('/documents/')) return 'documents'

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
