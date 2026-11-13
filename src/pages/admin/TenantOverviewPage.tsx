import { useNavigate, useParams } from 'react-router-dom'
import { TenantOpsOverview } from '@/components/admin/TenantOpsOverview'
import { useAuth } from '@/lib/auth'
import {
  adminAgencyPath,
  setSupportReturnPath,
} from '@/lib/adminPaths'
import { useTenantMembersByTenantId } from '@/lib/tenantMembersStore'
import { useTenantById } from '@/lib/tenantsStore'
import type { TenantMember } from '@/types/tenant'

export default function TenantOverviewPage() {
  const { tenantId = '' } = useParams()
  const navigate = useNavigate()
  const { startViewAs } = useAuth()
  const tenant = useTenantById(tenantId)
  const members = useTenantMembersByTenantId(tenantId)

  // Layout owns the missing-agency redirect.
  if (!tenant) return null

  const open = (
    section: 'access' | 'people' | 'billing' | 'activity',
  ) => {
    navigate(adminAgencyPath(tenant.id, section))
  }

  const handleViewAs = async (member: TenantMember) => {
    setSupportReturnPath(adminAgencyPath(tenant.id, 'overview'))
    await startViewAs({
      userId: member.id,
      email: member.email,
      name: member.name,
      role: 'agency_user',
      tenantId: tenant.id,
    })
    navigate('/', { replace: true })
  }

  return (
    <TenantOpsOverview
      tenant={tenant}
      members={members}
      onAddPeople={() => open('people')}
      onOpenAccess={() => open('access')}
      onOpenPeople={() => open('people')}
      onOpenBilling={() => open('billing')}
      onOpenActivity={() => open('activity')}
      onViewAs={handleViewAs}
    />
  )
}
