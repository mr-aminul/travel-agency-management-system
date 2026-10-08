import { useSyncExternalStore } from 'react'
import {
  readAgencyProfile,
  saveAgencyProfile,
  seedAgencyProfileBusinessName,
} from '@/lib/agencyProfile'
import { agencyCreateErrors, slugifyAgencyName } from '@/lib/agencyUserRules'
import {
  DATA_KEYS,
  loadJson,
  loadJsonParsed,
  removeJson,
  saveJson,
} from '@/lib/data'
import {
  ALL_MODULE_IDS,
  hasModule,
  isServiceEnabled,
  normalizeModuleId,
} from '@/lib/modules'
import { tenantHasCustomService } from '@/lib/customServicesStore'
import { isBuiltinService, type ServiceType } from '@/types/case'
import {
  TENANT_IDS,
  type CreateTenantInput,
  type ModuleId,
  type Tenant,
  type TenantStatus,
} from '@/types/tenant'

type Listener = () => void

const ENTITLEMENTS_KEY = DATA_KEYS.tenantEntitlements
const NAMES_KEY = DATA_KEYS.tenantNames
const STATUSES_KEY = DATA_KEYS.tenantStatuses
const CREATED_TENANTS_KEY = DATA_KEYS.tenantsCreated

/** Sensible default catalog for newly onboarded agencies. */
export const DEFAULT_STARTER_MODULES: ModuleId[] = [
  'services.touristVisa',
  'services.studentVisa',
  'services.airTicket',
  'services.hotelBooking',
  'services.tourPackage',
  'finance',
  'documents',
]

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
      'subAgents',
    ],
  },
  {
    id: TENANT_IDS.full,
    slug: 'onetrack',
    name: 'OneTrack',
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
  rebuildSnapshot()
  listeners.forEach((listener) => listener())
}

function subscribe(listener: Listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function readOverrides(): Partial<Record<string, ModuleId[]>> {
  const parsed = loadJson<unknown>(ENTITLEMENTS_KEY, {})
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
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
}

function persistOverrides(list: Tenant[]) {
  const overrides: Record<string, ModuleId[]> = {}
  for (const tenant of list) {
    overrides[tenant.id] = tenant.enabledModules
  }
  saveJson(ENTITLEMENTS_KEY, overrides)
}

function readNameOverrides(): Record<string, string> {
  const parsed = loadJson<unknown>(NAMES_KEY, {})
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
  const next: Record<string, string> = {}
  for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
    if (typeof value !== 'string') continue
    const name = value.trim()
    if (name) next[id] = name
  }
  return next
}

function persistNameOverrides(overrides: Record<string, string>) {
  saveJson(NAMES_KEY, overrides)
}

function readStatusOverrides(): Partial<Record<string, TenantStatus>> {
  const parsed = loadJson<unknown>(STATUSES_KEY, {})
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
  const next: Partial<Record<string, TenantStatus>> = {}
  for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
    if (value === 'trial' || value === 'active' || value === 'suspended') {
      next[id] = value
    }
  }
  return next
}

function persistStatusOverrides(overrides: Partial<Record<string, TenantStatus>>) {
  saveJson(STATUSES_KEY, overrides)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeStoredTenant(value: unknown): Tenant | undefined {
  if (!isRecord(value)) return undefined
  const id = typeof value.id === 'string' ? value.id.trim() : ''
  const slug = typeof value.slug === 'string' ? value.slug.trim() : ''
  const name = typeof value.name === 'string' ? value.name.trim() : ''
  if (!id || !slug || !name) return undefined
  const status: TenantStatus =
    value.status === 'active' || value.status === 'suspended'
      ? value.status
      : 'trial'
  const enabledModules = Array.isArray(value.enabledModules)
    ? value.enabledModules
        .map((item) =>
          typeof item === 'string' ? normalizeModuleId(item) : undefined,
        )
        .filter((item): item is ModuleId => item != null)
    : []
  return { id, slug, name, status, enabledModules }
}

function readCreatedTenants(): Tenant[] {
  return loadJsonParsed(CREATED_TENANTS_KEY, [] as Tenant[], (value) => {
    if (!Array.isArray(value)) return []
    return value
      .map(normalizeStoredTenant)
      .filter((tenant): tenant is Tenant => tenant != null)
  })
}

function persistCreatedTenants() {
  saveJson(CREATED_TENANTS_KEY, createdTenants)
}

function withOverrides(base: Tenant[]): Tenant[] {
  const moduleOverrides = readOverrides()
  const nameOverrides = readNameOverrides()
  const statusOverrides = readStatusOverrides()
  return base.map((tenant) => {
    const enabled = moduleOverrides[tenant.id]
    const name = nameOverrides[tenant.id] ?? tenant.name
    const status = statusOverrides[tenant.id] ?? tenant.status
    return {
      ...tenant,
      name,
      status,
      enabledModules: enabled
        ? mergeSeedServiceCatalog(tenant.enabledModules, enabled)
        : [...tenant.enabledModules],
    }
  })
}

let tenants: Tenant[] = withOverrides(SEED_TENANTS)
/** Agencies created via admin / launch bootstrap (persisted through the data layer). */
let createdTenants: Tenant[] = readCreatedTenants()
let snapshot: Tenant[] = []

function rebuildSnapshot() {
  // Launch agencies also live in pd-tenants-created (like Ismail) — dedupe by id.
  const byId = new Map<string, Tenant>()
  for (const tenant of tenants) byId.set(tenant.id, tenant)
  for (const tenant of createdTenants) {
    const prior = byId.get(tenant.id)
    byId.set(tenant.id, prior ? { ...prior, ...tenant } : tenant)
  }
  snapshot = [...byId.values()]
}

rebuildSnapshot()

function reloadTenantsFromStorage() {
  tenants = withOverrides(SEED_TENANTS)
  createdTenants = readCreatedTenants()
  rebuildSnapshot()
  listeners.forEach((listener) => listener())
}

if (typeof window !== 'undefined') {
  window.addEventListener('pd-data-rehydrated', reloadTenantsFromStorage)
}

function getSnapshot() {
  return snapshot
}

function uniqueSlug(base: string): string {
  const root = base || 'agency'
  let slug = root
  let n = 2
  while (snapshot.some((tenant) => tenant.slug === slug)) {
    slug = `${root}-${n}`
    n += 1
  }
  return slug
}

export function useTenants(): Tenant[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

export function getTenants(): Tenant[] {
  return getSnapshot()
}

export function getTenantById(id: string): Tenant | undefined {
  return getSnapshot().find((tenant) => tenant.id === id)
}

export function getTenantBySlug(slug: string): Tenant | undefined {
  const normalized = slug.trim().toLowerCase()
  if (!normalized) return undefined
  return getSnapshot().find((tenant) => tenant.slug.toLowerCase() === normalized)
}

export function createTenant(input: CreateTenantInput): Tenant {
  const errors = agencyCreateErrors(input)
  if (errors.name) throw new Error(errors.name)

  const name = input.name.trim()
  const slug = uniqueSlug(
    (input.slug?.trim() && slugifyAgencyName(input.slug)) ||
      slugifyAgencyName(name),
  )
  const created: Tenant = {
    id: `tenant-${Date.now().toString(36)}`,
    slug,
    name,
    status: input.status ?? 'trial',
    enabledModules: input.enabledModules
      ? [...input.enabledModules]
      : [...DEFAULT_STARTER_MODULES],
  }
  createdTenants = [created, ...createdTenants]
  persistCreatedTenants()
  // Keep contact-profile display name in sync with the org name (single SOT: tenant.name).
  seedAgencyProfileBusinessName(created.id, created.name)
  emit()
  return created
}

function syncProfileBusinessName(tenantId: string, name: string) {
  saveAgencyProfile(
    { ...readAgencyProfile(tenantId), businessName: name },
    tenantId,
  )
}

/**
 * Rename the agency. `tenant.name` is the single business / org display name.
 * Mirrors into AgencyProfile so branding/invoice readers stay consistent.
 */
export function updateTenantName(
  tenantId: string,
  name: string,
): Tenant | undefined {
  const errors = agencyCreateErrors({ name })
  if (errors.name) throw new Error(errors.name)
  const trimmed = name.trim()

  const createdIndex = createdTenants.findIndex(
    (tenant) => tenant.id === tenantId,
  )
  if (createdIndex >= 0) {
    const updated = { ...createdTenants[createdIndex]!, name: trimmed }
    createdTenants = createdTenants.map((tenant, index) =>
      index === createdIndex ? updated : tenant,
    )
    persistCreatedTenants()
    syncProfileBusinessName(tenantId, trimmed)
    emit()
    return updated
  }

  if (!tenants.some((tenant) => tenant.id === tenantId)) return undefined

  const overrides = readNameOverrides()
  overrides[tenantId] = trimmed
  persistNameOverrides(overrides)
  tenants = withOverrides(SEED_TENANTS)
  syncProfileBusinessName(tenantId, trimmed)
  emit()
  return getTenantById(tenantId)
}

/** Resolve a public link segment — prefers slug, falls back to internal id. */
export function resolveTenantRef(ref: string): Tenant | undefined {
  return getTenantBySlug(ref) ?? getTenantById(ref)
}

export function useTenantById(id: string): Tenant | undefined {
  return useTenants().find((tenant) => tenant.id === id)
}

function patchTenantModules(
  list: Tenant[],
  tenantId: string,
  moduleId: ModuleId,
  enabled: boolean,
): { list: Tenant[]; updated?: Tenant } {
  let updated: Tenant | undefined
  const next = list.map((tenant) => {
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
  return { list: next, updated }
}

export function setTenantStatus(
  tenantId: string,
  status: TenantStatus,
): Tenant | undefined {
  if (status !== 'trial' && status !== 'active' && status !== 'suspended') {
    throw new Error('Invalid status.')
  }

  const createdIndex = createdTenants.findIndex(
    (tenant) => tenant.id === tenantId,
  )
  if (createdIndex >= 0) {
    const updated = { ...createdTenants[createdIndex]!, status }
    createdTenants = createdTenants.map((tenant, index) =>
      index === createdIndex ? updated : tenant,
    )
    persistCreatedTenants()
    emit()
    return updated
  }

  if (!tenants.some((tenant) => tenant.id === tenantId)) return undefined
  const overrides = readStatusOverrides()
  overrides[tenantId] = status
  persistStatusOverrides(overrides)
  tenants = withOverrides(SEED_TENANTS)
  emit()
  return getTenantById(tenantId)
}

export function setTenantModuleEnabled(
  tenantId: string,
  moduleId: ModuleId,
  enabled: boolean,
): Tenant | undefined {
  const seedPatch = patchTenantModules(tenants, tenantId, moduleId, enabled)
  if (seedPatch.updated) {
    tenants = seedPatch.list
    persistOverrides(tenants)
    emit()
    return seedPatch.updated
  }
  const createdPatch = patchTenantModules(
    createdTenants,
    tenantId,
    moduleId,
    enabled,
  )
  if (createdPatch.updated) {
    createdTenants = createdPatch.list
    persistCreatedTenants()
    emit()
    return createdPatch.updated
  }
  return undefined
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
  removeJson(ENTITLEMENTS_KEY)
  removeJson(NAMES_KEY)
  removeJson(STATUSES_KEY)
  removeJson(CREATED_TENANTS_KEY)
  tenants = withOverrides(SEED_TENANTS)
  createdTenants = []
  emit()
}
