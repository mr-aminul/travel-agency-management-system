import { useAuth } from '@/lib/useAuth'
import { getTenantById, useTenants } from '@/lib/tenantsStore'
import { DEFAULT_TENANT_ID, type Tenant } from '@/types/tenant'

export function useActiveTenant(): Tenant {
  const { session } = useAuth()
  const tenants = useTenants()
  const id = session?.tenantId ?? DEFAULT_TENANT_ID
  return (
    tenants.find((tenant) => tenant.id === id) ??
    getTenantById(DEFAULT_TENANT_ID)!
  )
}
