import { MODULE_GROUPS } from '@/lib/modules'
import { setTenantModuleEnabled } from '@/lib/tenantsStore'
import type { ModuleId, Tenant } from '@/types/tenant'
import { Switch } from '@/components/ui'

export function ModuleEntitlementsEditor({
  tenant,
  onChange,
}: {
  tenant: Tenant
  onChange?: (tenant: Tenant) => void
}) {
  const enabled = new Set(tenant.enabledModules)

  const toggle = (moduleId: ModuleId, next: boolean) => {
    const updated = setTenantModuleEnabled(tenant.id, moduleId, next)
    if (updated) onChange?.(updated)
  }

  return (
    <div className="pd-admin__modules" aria-label="Modules">
      {MODULE_GROUPS.map((group) => (
        <section key={group.id} className="pd-admin__module-group">
          <header className="pd-admin__module-group-header">
            <h3 className="pd-admin__module-group-title">{group.label}</h3>
            <p className="pd-admin__module-group-desc">{group.description}</p>
          </header>
          <ul className="pd-admin__module-list">
            {group.modules.map((module) => (
              <li key={module.id}>
                <Switch
                  label={module.label}
                  checked={enabled.has(module.id)}
                  onChange={(event) =>
                    toggle(module.id, event.target.checked)
                  }
                />
                <p className="pd-admin__module-item-desc">{module.description}</p>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
