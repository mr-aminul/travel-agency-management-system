import { getActiveTenantId } from '@/lib/authApi'
import {
  getTenantById,
  tenantAllowsService,
  tenantHasModule,
} from '@/lib/tenantsStore'
import { DEFAULT_TENANT_ID, type ModuleId, type Tenant } from '@/types/tenant'
import type { ServiceType } from '@/types/case'

export function resolveActiveTenant(): Tenant {
  return getTenantById(getActiveTenantId()) ?? getTenantById(DEFAULT_TENANT_ID)!
}

export function activeTenantHasModule(moduleId: ModuleId): boolean {
  return tenantHasModule(resolveActiveTenant(), moduleId)
}

export function activeTenantAllowsService(service: ServiceType): boolean {
  return tenantAllowsService(resolveActiveTenant(), service)
}
