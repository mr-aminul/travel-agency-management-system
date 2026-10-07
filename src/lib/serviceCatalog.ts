import { useCustomServices } from '@/lib/customServicesStore'
import { activeTenantAllowsService, resolveActiveTenant } from '@/lib/activeTenant'
import { findCustomServiceBySlug, listCustomServices } from '@/lib/customServicesStore'
import {
  isCatalogServiceHidden,
  useHiddenServices,
} from '@/lib/hiddenServicesStore'
import { getTenantById, tenantAllowsService } from '@/lib/tenantsStore'
import {
  BUILTIN_SERVICE_OPTIONS,
  CASE_SERVICE_SLUGS,
  isCaseServiceSlug,
  type BuiltinServiceType,
  type ServiceType,
} from '@/types/case'

export type CatalogServiceRef = {
  key: ServiceType
  label: string
  kind: 'builtin' | 'custom'
  description: string
  customId?: string
}

export function getEnabledServiceOptions(forTenantId?: string): {
  value: ServiceType
  label: string
}[] {
  const tenant = forTenantId
    ? getTenantById(forTenantId)
    : resolveActiveTenant()
  if (!tenant) return []
  const builtin = BUILTIN_SERVICE_OPTIONS.filter(
    (option) =>
      tenantAllowsService(tenant, option.value) &&
      !isCatalogServiceHidden(option.value, tenant.id),
  )
  const custom = listCustomServices(tenant.id)
    .filter((item) => !isCatalogServiceHidden(item.name, tenant.id))
    .map((item) => ({
      value: item.name,
      label: item.name,
    }))
  return [...builtin, ...custom]
}

export function resolveServiceFromSlug(
  slug: string,
): ServiceType | undefined {
  if (isCaseServiceSlug(slug)) {
    const service = CASE_SERVICE_SLUGS[slug]
    if (!activeTenantAllowsService(service)) return undefined
    if (isCatalogServiceHidden(service)) return undefined
    return service
  }
  const custom = findCustomServiceBySlug(slug)
  if (!custom) return undefined
  if (isCatalogServiceHidden(custom.name)) return undefined
  return custom.name
}

export function listCatalogServiceRefs(
  forTenantId?: string,
): CatalogServiceRef[] {
  const tenant = forTenantId
    ? getTenantById(forTenantId)
    : resolveActiveTenant()
  if (!tenant) return []
  const builtin = BUILTIN_SERVICE_OPTIONS.filter(
    (option) =>
      tenantAllowsService(tenant, option.value) &&
      !isCatalogServiceHidden(option.value, tenant.id),
  ).map((option) => ({
    key: option.value,
    label: option.label,
    kind: 'builtin' as const,
    description: '',
  }))
  const custom = listCustomServices(tenant.id)
    .filter((item) => !isCatalogServiceHidden(item.name, tenant.id))
    .map((item) => ({
      key: item.name,
      label: item.name,
      kind: 'custom' as const,
      description: item.description,
      customId: item.id,
    }))
  return [...builtin, ...custom]
}

export function listHiddenBuiltinCatalogOptions(
  forTenantId?: string,
): { value: BuiltinServiceType; label: string }[] {
  const tenant = forTenantId
    ? getTenantById(forTenantId)
    : resolveActiveTenant()
  if (!tenant) return []
  return BUILTIN_SERVICE_OPTIONS.filter(
    (option) =>
      tenantAllowsService(tenant, option.value) &&
      isCatalogServiceHidden(option.value, tenant.id),
  )
}

export function findCatalogServiceRef(
  key: string,
  forTenantId?: string,
): CatalogServiceRef | undefined {
  const needle = key.trim().toLowerCase()
  return listCatalogServiceRefs(forTenantId).find(
    (item) => item.key.toLowerCase() === needle,
  )
}

export function resolveCatalogEditorService(
  slug: string,
  forTenantId?: string,
): CatalogServiceRef | undefined {
  const name = resolveServiceFromSlug(slug)
  if (!name) return undefined
  return findCatalogServiceRef(name, forTenantId)
}

export function useEnabledServiceOptions(forTenantId?: string) {
  useCustomServices()
  useHiddenServices()
  return getEnabledServiceOptions(forTenantId)
}

export function useCatalogServiceRefs(forTenantId?: string) {
  useCustomServices()
  useHiddenServices()
  return listCatalogServiceRefs(forTenantId)
}

export function useHiddenBuiltinCatalogOptions(forTenantId?: string) {
  useCustomServices()
  useHiddenServices()
  return listHiddenBuiltinCatalogOptions(forTenantId)
}
