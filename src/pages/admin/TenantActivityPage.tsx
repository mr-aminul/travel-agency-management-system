import { useParams } from 'react-router-dom'
import { useTenantById } from '@/lib/tenantsStore'
import AdminActivityPage from '@/pages/admin/AdminActivityPage'

export default function TenantActivityPage() {
  const { tenantId = '' } = useParams()
  const tenant = useTenantById(tenantId)

  // Layout owns the missing-agency redirect.
  if (!tenant) return null

  return <AdminActivityPage lockedTenantId={tenant.id} />
}
