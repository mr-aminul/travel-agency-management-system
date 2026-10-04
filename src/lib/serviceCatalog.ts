import { useCustomServices } from '@/lib/customServicesStore'
import { activeTenantAllowsService } from '@/lib/activeTenant'
import { findCustomServiceBySlug, listCustomServices } from '@/lib/customServicesStore'
import {
  isCatalogServiceHidden,
  useHiddenServices,
} from '@/lib/hiddenServicesStore'
import {
  BUILTIN_SERVICE_OPTIONS,
  CASE_SERVICE_SLUGS,
  isCaseServiceSlug,
  type ServiceType,
} from '@/types/case'

export function getEnabledServiceOptions(): {
  value: ServiceType
  label: string
}[] {
  const builtin = BUILTIN_SERVICE_OPTIONS.filter(
    (option) =>
      activeTenantAllowsService(option.value) &&
      !isCatalogServiceHidden(option.value),
  )
  const custom = listCustomServices()
    .filter((item) => !isCatalogServiceHidden(item.name))
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

export function useEnabledServiceOptions() {
  useCustomServices()
  useHiddenServices()
  return getEnabledServiceOptions()
}
