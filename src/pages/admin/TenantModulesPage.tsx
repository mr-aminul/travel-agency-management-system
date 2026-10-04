import { Navigate, useParams } from 'react-router-dom'
import { Card, Switch } from '@/components/ui'
import { MODULE_GROUPS } from '@/lib/modules'
import {
  setTenantModuleEnabled,
  tenantHasModule,
  useTenantById,
} from '@/lib/tenantsStore'
import type { ModuleCatalogItem } from '@/lib/modules'
import type { Tenant } from '@/types/tenant'

function EntitlementRow({
  tenant,
  module,
}: {
  tenant: Tenant
  module: ModuleCatalogItem
}) {
  const enabled = tenantHasModule(tenant, module.id)

  return (
    <div className="pd-admin__entitlement">
      <div className="pd-admin__entitlement-copy">
        <p className="pd-admin__entitlement-name">{module.label}</p>
        <p className="pd-admin__entitlement-desc">{module.description}</p>
      </div>
      <Switch
        className="pd-admin__switch"
        label={module.label}
        title={module.description}
        checked={enabled}
        onChange={(event) => {
          setTenantModuleEnabled(tenant.id, module.id, event.target.checked)
        }}
      />
    </div>
  )
}

export default function TenantModulesPage() {
  const { tenantId = '' } = useParams()
  const tenant = useTenantById(tenantId)

  if (!tenant) {
    return <Navigate to="/admin/tenants" replace />
  }

  const nestedGroups = MODULE_GROUPS.filter((group) => group.modules.length > 1)
  const pageGroups = MODULE_GROUPS.filter((group) => group.modules.length === 1)

  return (
    <div className="pd-admin__module-groups">
      {nestedGroups.map((group) => {
        const enabledCount = group.modules.filter((module) =>
          tenantHasModule(tenant, module.id),
        ).length

        return (
          <Card
            key={group.id}
            title={group.label}
            description={`${enabledCount} of ${group.modules.length} sub-pages enabled`}
          >
            <ul className="pd-admin__entitlements">
              {group.modules.map((module) => (
                <li key={module.id}>
                  <EntitlementRow tenant={tenant} module={module} />
                </li>
              ))}
            </ul>
          </Card>
        )
      })}

      <Card
        title="Workspaces"
        description="Top-level pages in the agency sidebar"
      >
        <ul className="pd-admin__entitlements pd-admin__entitlements--grid">
          {pageGroups.map((group) => {
            const module = group.modules[0]
            if (!module) return null
            return (
              <li key={group.id}>
                <EntitlementRow
                  tenant={tenant}
                  module={{ ...module, label: group.label, description: group.description }}
                />
              </li>
            )
          })}
        </ul>
      </Card>
    </div>
  )
}
