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
  type ServiceType,
} from '@/types/case'

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
    return activeTenantAllowsService(service) ? service : undefined
  }
  return findCustomServiceBySlug(slug)?.name
}

export function useEnabledServiceOptions(forTenantId?: string) {
  useCustomServices()
  useHiddenServices()
  return getEnabledServiceOptions(forTenantId)
}
