import { useSyncExternalStore } from 'react'
import {
  ALL_MODULE_IDS,
  hasModule,
  isServiceEnabled,
  normalizeModuleId,
} from '@/lib/modules'
import { tenantHasCustomService } from '@/lib/customServicesStore'
import { isBuiltinService, type ServiceType } from '@/types/case'
import { TENANT_IDS, type ModuleId, type Tenant } from '@/types/tenant'

type Listener = () => void

const ENTITLEMENTS_KEY = 'pd-tenant-entitlements'

const SEED_TENANTS: Tenant[] = [
  {
    id: TENANT_IDS.leisure,
    slug: 'coastal-leisure',
    name: 'Coastal Leisure',
    status: 'active',
    enabledModules: [
      'services.tourPackage',
      'services.airTicket',
      'services.hotelBooking',
      'services.touristVisa',
      'finance',
    ],
  },
  {
    id: TENANT_IDS.manpower,
    slug: 'horizon-manpower',
    name: 'Horizon Manpower',
    status: 'active',
    enabledModules: [
      'services.workPermitVisa',
      'services.medicalVisa',
      'finance',
      'hr',
      'partners',
    ],
  },
  {
    id: TENANT_IDS.full,
    slug: 'onetrack-demo',
    name: 'OneTrack Demo',
    status: 'active',
    enabledModules: [...ALL_MODULE_IDS],
  },
]

const NEW_SERVICE_MODULES: ModuleId[] = [
  'services.touristVisa',
  'services.medicalVisa',
  'services.hotelBooking',
]

function mergeSeedServiceCatalog(
  seed: ModuleId[],
  stored: ModuleId[],
): ModuleId[] {
  const alreadyMigrated = NEW_SERVICE_MODULES.some((id) => stored.includes(id))
  if (alreadyMigrated) return stored
  const extras = NEW_SERVICE_MODULES.filter((id) => seed.includes(id))
  return extras.length ? [...stored, ...extras] : stored
}

const listeners = new Set<Listener>()

function emit() {
  listeners.forEach((listener) => listener())
}

function subscribe(listener: Listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function readOverrides(): Partial<Record<string, ModuleId[]>> {
  try {
    const raw = localStorage.getItem(ENTITLEMENTS_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object') return {}
    const next: Partial<Record<string, ModuleId[]>> = {}
    for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!Array.isArray(value)) continue
      next[id] = value
        .map((item) =>
          typeof item === 'string' ? normalizeModuleId(item) : undefined,
        )
        .filter((item): item is ModuleId => item != null)
    }
    return next
  } catch {
    return {}
  }
}

function persistOverrides(tenants: Tenant[]) {
  const overrides: Record<string, ModuleId[]> = {}
  for (const tenant of tenants) {
    overrides[tenant.id] = tenant.enabledModules
  }
  try {
    localStorage.setItem(ENTITLEMENTS_KEY, JSON.stringify(overrides))
  } catch {
    /* ignore quota / private mode */
  }
}

function withOverrides(base: Tenant[]): Tenant[] {
  const overrides = readOverrides()
  return base.map((tenant) => {
    const enabled = overrides[tenant.id]
    return enabled
      ? {
          ...tenant,
          enabledModules: mergeSeedServiceCatalog(tenant.enabledModules, enabled),
        }
      : { ...tenant, enabledModules: [...tenant.enabledModules] }
  })
}

let tenants: Tenant[] = withOverrides(SEED_TENANTS)

function getSnapshot() {
  return tenants
}

export function useTenants(): Tenant[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

export function getTenants(): Tenant[] {
  return tenants
}

export function getTenantById(id: string): Tenant | undefined {
  return tenants.find((tenant) => tenant.id === id)
}

export function getTenantBySlug(slug: string): Tenant | undefined {
  const normalized = slug.trim().toLowerCase()
  if (!normalized) return undefined
  return tenants.find((tenant) => tenant.slug.toLowerCase() === normalized)
}

/** Resolve a public link segment — prefers slug, falls back to internal id. */
export function resolveTenantRef(ref: string): Tenant | undefined {
  return getTenantBySlug(ref) ?? getTenantById(ref)
}

export function useTenantById(id: string): Tenant | undefined {
  return useTenants().find((tenant) => tenant.id === id)
}

export function setTenantModuleEnabled(
  tenantId: string,
  moduleId: ModuleId,
  enabled: boolean,
): Tenant | undefined {
  let updated: Tenant | undefined
  tenants = tenants.map((tenant) => {
    if (tenant.id !== tenantId) return tenant
    const has = tenant.enabledModules.includes(moduleId)
    let enabledModules = tenant.enabledModules
    if (enabled && !has) enabledModules = [...tenant.enabledModules, moduleId]
    if (!enabled && has) {
      enabledModules = tenant.enabledModules.filter((id) => id !== moduleId)
    }
    updated = { ...tenant, enabledModules }
    return updated
  })
  if (updated) {
    persistOverrides(tenants)
    emit()
  }
  return updated
}

export function tenantHasModule(tenant: Tenant, moduleId: ModuleId) {
  return hasModule(tenant.enabledModules, moduleId)
}

export function tenantAllowsService(
  tenant: Tenant,
  service: ServiceType,
): boolean {
  if (isBuiltinService(service)) {
    return isServiceEnabled(tenant.enabledModules, service)
  }
  return tenantHasCustomService(tenant.id, service)
}

export function resetTenantEntitlements() {
  try {
    localStorage.removeItem(ENTITLEMENTS_KEY)
  } catch {
    /* ignore */
  }
  tenants = withOverrides(SEED_TENANTS)
  emit()
}
