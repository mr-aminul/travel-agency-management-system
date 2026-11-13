import { Navigate, useParams } from 'react-router-dom'
import { adminAgencyPath } from '@/lib/adminPaths'

export default function TenantAllPage() {
  const { tenantId = '' } = useParams()
  return <Navigate to={adminAgencyPath(tenantId, 'overview')} replace />
}
