import { Link, Navigate, useParams } from 'react-router-dom'
import { countCasesForTenant, latestCaseActivityForTenant } from '@/lib/casesStore'
import { countClientsForTenant } from '@/lib/clientsStore'
import { formatDisplayDate } from '@/lib/formatDate'
import {
  countPaymentsForTenant,
  latestPaymentActivityForTenant,
} from '@/lib/paymentsStore'
import { useTenantMembersByTenantId } from '@/lib/tenantMembersStore'
import { setTenantStatus, useTenantById } from '@/lib/tenantsStore'
import type { TenantStatus } from '@/types/tenant'
import { MetricTile, Select } from '@/components/ui'

const STATUS_OPTIONS: { value: TenantStatus; label: string }[] = [
  { value: 'trial', label: 'Trial' },
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
]

function latestActivity(tenantId: string): string | undefined {
  const caseStamp = latestCaseActivityForTenant(tenantId)
  const paymentStamp = latestPaymentActivityForTenant(tenantId)
  if (caseStamp && paymentStamp) {
    return caseStamp > paymentStamp ? caseStamp : paymentStamp
  }
  return caseStamp ?? paymentStamp
}

export default function TenantOverviewPage() {
  const { tenantId = '' } = useParams()
  const tenant = useTenantById(tenantId)
  const members = useTenantMembersByTenantId(tenantId)

  if (!tenant) {
    return <Navigate to="/admin/tenants" replace />
  }

  const activeUsers = members.filter((member) => member.status === 'active').length
  const clientCount = countClientsForTenant(tenant.id)
  const caseCount = countCasesForTenant(tenant.id)
  const paymentCount = countPaymentsForTenant(tenant.id)
  const activity = latestActivity(tenant.id)
  const moduleLabels = tenant.enabledModules
    .map((id) => id.replace(/^services\./, ''))
    .slice(0, 8)

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
        <MetricTile
          label="Clients"
          value={clientCount}
          hint={`${caseCount} services · ${paymentCount} payments`}
        />
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
          hint={
            activity
              ? `Last activity ${formatDisplayDate(activity)}`
              : tenant.slug
          }
        />
      </div>

      {moduleLabels.length > 0 ? (
        <p className="pd-ops__meta" aria-label="Enabled modules">
          Modules · {moduleLabels.join(' · ')}
          {tenant.enabledModules.length > moduleLabels.length
            ? ` · +${tenant.enabledModules.length - moduleLabels.length} more`
            : ''}
        </p>
      ) : null}

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
