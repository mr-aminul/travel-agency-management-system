import { Link, Navigate, useParams } from 'react-router-dom'
import { MetricTile } from '@/components/ui'
import { useTenantMembersByTenantId } from '@/lib/tenantMembersStore'
import { useTenantById } from '@/lib/tenantsStore'

export default function TenantOverviewPage() {
  const { tenantId = '' } = useParams()
  const tenant = useTenantById(tenantId)
  const members = useTenantMembersByTenantId(tenantId)

  if (!tenant) {
    return <Navigate to="/admin/tenants" replace />
  }

  const activeUsers = members.filter((member) => member.status === 'active').length

  return (
    <section className="pd-admin__overview" aria-label="Overview">
      <div className="pd-admin__metrics">
        <Link
          className="pd-admin__metric-link"
          to={`/admin/tenants/${tenant.id}/users`}
        >
          <MetricTile
            label="Users"
            value={members.length}
            hint={`${activeUsers} active`}
          />
        </Link>
        <Link
          className="pd-admin__metric-link"
          to={`/admin/tenants/${tenant.id}/modules`}
        >
          <MetricTile
            label="Modules"
            value={tenant.enabledModules.length}
            hint="Enabled for this business"
          />
        </Link>
        <MetricTile
          label="Status"
          value={tenant.status === 'active' ? 'Active' : tenant.status}
          hint={tenant.slug}
        />
      </div>
    </section>
  )
}
