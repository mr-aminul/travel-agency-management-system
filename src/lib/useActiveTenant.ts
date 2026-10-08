import { useAuth } from '@/lib/useAuth'
import { getTenantById, useTenants } from '@/lib/tenantsStore'
import { DEFAULT_TENANT_ID, type Tenant } from '@/types/tenant'

/** Placeholder when the session tenant is not in the hydrated catalog yet. */
function stubTenant(id: string): Tenant {
  return {
    id,
    slug: 'agency',
    name: 'Agency',
    status: 'active',
    enabledModules: [],
  }
}

export function useActiveTenant(): Tenant {
  const { session } = useAuth()
  const tenants = useTenants()
  const id = session?.tenantId ?? DEFAULT_TENANT_ID
  const matched =
    tenants.find((tenant) => tenant.id === id) ?? getTenantById(id)
  if (matched) return matched
  // Never fall back to a different agency — that breaks member/access checks.
  if (session?.tenantId) return stubTenant(session.tenantId)
  return getTenantById(DEFAULT_TENANT_ID) ?? stubTenant(DEFAULT_TENANT_ID)
}
