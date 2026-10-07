import { Link, Navigate, useParams } from 'react-router-dom'
import { useTenantMembersByTenantId } from '@/lib/tenantMembersStore'
import { setTenantStatus, useTenantById } from '@/lib/tenantsStore'
import type { TenantStatus } from '@/types/tenant'
import { MetricTile, Select } from '@/components/ui'

const STATUS_OPTIONS: { value: TenantStatus; label: string }[] = [
  { value: 'trial', label: 'Trial' },
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
]

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
            hint="Service lines & workspaces"
          />
        </Link>
        <MetricTile
          label="Status"
          value={tenant.status === 'active' ? 'Active' : tenant.status}
          hint={tenant.slug}
        />
      </div>

      <div className="pd-admin__status-control">
        <Select
          label="Agency status"
          value={tenant.status}
          options={STATUS_OPTIONS}
          onChange={(event) => {
            const next = event.target.value as TenantStatus
            setTenantStatus(tenant.id, next)
          }}
          hint="Suspended agencies cannot sign in."
        />
      </div>
    </section>
  )
}
