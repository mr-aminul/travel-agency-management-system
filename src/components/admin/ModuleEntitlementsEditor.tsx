import { MODULE_GROUPS, type ModuleCatalogItem } from '@/lib/modules'
import { iconForModule } from '@/lib/moduleIcons'
import { setTenantModuleEnabled } from '@/lib/tenantsStore'
import type { ModuleId, Tenant } from '@/types/tenant'
import { Switch } from '@/components/ui'

function ModuleRow({
  module,
  checked,
  onToggle,
}: {
  module: ModuleCatalogItem
  checked: boolean
  onToggle: (moduleId: ModuleId, next: boolean) => void
}) {
  const Icon = iconForModule(module.id)

  return (
    <li className="pd-admin__module-row">
      <div className="pd-admin__module-meta">
        <span className="pd-admin__module-icon" aria-hidden>
          <Icon size={16} strokeWidth={2.1} />
        </span>
        <span className="pd-admin__module-label">{module.label}</span>
      </div>
      <Switch
        label={module.label}
        className="pd-admin__module-switch"
        checked={checked}
        onChange={(event) => onToggle(module.id, event.target.checked)}
      />
    </li>
  )
}

export function ModuleEntitlementsEditor({
  tenant,
  onChange,
}: {
  tenant: Tenant
  onChange?: (tenant: Tenant) => void
}) {
  const enabled = new Set(tenant.enabledModules)
  const servicesGroup = MODULE_GROUPS.find((group) => group.id === 'services')
  const workspaceModules = MODULE_GROUPS.filter(
    (group) => group.id !== 'services',
  ).flatMap((group) => group.modules)

  const toggle = (moduleId: ModuleId, next: boolean) => {
    const updated = setTenantModuleEnabled(tenant.id, moduleId, next)
    if (updated) onChange?.(updated)
  }

  return (
    <div className="pd-admin__modules" aria-label="Modules">
      {servicesGroup ? (
        <section
          className="pd-admin__module-group"
          aria-labelledby="pd-admin-modules-services"
        >
          <h3
            id="pd-admin-modules-services"
            className="pd-admin__module-group-title"
          >
            Services
          </h3>
          <ul className="pd-admin__module-list pd-admin__module-list--grid">
            {servicesGroup.modules.map((module) => (
              <ModuleRow
                key={module.id}
                module={module}
                checked={enabled.has(module.id)}
                onToggle={toggle}
              />
            ))}
          </ul>
        </section>
      ) : null}

      {workspaceModules.length > 0 ? (
        <section
          className="pd-admin__module-group"
          aria-labelledby="pd-admin-modules-workspaces"
        >
          <h3
            id="pd-admin-modules-workspaces"
            className="pd-admin__module-group-title"
          >
            Workspaces
          </h3>
          <ul className="pd-admin__module-list pd-admin__module-list--grid">
            {workspaceModules.map((module) => (
              <ModuleRow
                key={module.id}
                module={module}
                checked={enabled.has(module.id)}
                onToggle={toggle}
              />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
