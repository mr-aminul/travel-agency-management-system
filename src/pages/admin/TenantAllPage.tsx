import { Navigate, useParams } from 'react-router-dom'
import { ADMIN_AGENCIES } from '@/lib/adminPaths'
import { useTenantById } from '@/lib/tenantsStore'
import TenantActivityPage from '@/pages/admin/TenantActivityPage'
import TenantModulesPage from '@/pages/admin/TenantModulesPage'
import TenantOverviewPage from '@/pages/admin/TenantOverviewPage'
import TenantUsersPage from '@/pages/admin/TenantUsersPage'

export default function TenantAllPage() {
  const { tenantId = '' } = useParams()
  const tenant = useTenantById(tenantId)

  if (!tenant) {
    return <Navigate to={ADMIN_AGENCIES} replace />
  }

  return (
    <div className="pd-admin__all-view" aria-label="All">
      {/* Setup order: status → product access → people → activity */}
      <TenantOverviewPage />
      <TenantModulesPage />
      <TenantUsersPage />
      <TenantActivityPage />
    </div>
  )
}
