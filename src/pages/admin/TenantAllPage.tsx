import { useParams } from 'react-router-dom'
import { adminAllViewClass } from '@/components/admin/adminChrome'
import { useTenantById } from '@/lib/tenantsStore'
import TenantActivityPage from '@/pages/admin/TenantActivityPage'
import TenantMessagingPage from '@/pages/admin/TenantMessagingPage'
import TenantModulesPage from '@/pages/admin/TenantModulesPage'
import TenantOverviewPage from '@/pages/admin/TenantOverviewPage'
import TenantUsersPage from '@/pages/admin/TenantUsersPage'

export default function TenantAllPage() {
  const { tenantId = '' } = useParams()
  const tenant = useTenantById(tenantId)

  // Layout owns the missing-agency redirect so People sync cannot bounce us.
  if (!tenant) return null

  return (
    <div className={adminAllViewClass} aria-label="All">
      {/* Setup order: status → product → messaging → people → activity */}
      <TenantOverviewPage />
      <TenantModulesPage />
      <TenantMessagingPage />
      <TenantUsersPage />
      <TenantActivityPage />
    </div>
  )
}
