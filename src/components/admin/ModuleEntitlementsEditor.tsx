import { useState } from 'react'
import { MODULE_GROUPS, type ModuleCatalogItem } from '@/lib/modules'
import { iconForModule } from '@/lib/moduleIcons'
import { setTenantModuleEnabled, useTenantById } from '@/lib/tenantsStore'
import type { ModuleId, Tenant } from '@/types/tenant'
import { ConfirmDialog, Switch } from '@/components/ui'

type PendingToggle = {
  moduleId: ModuleId
  next: boolean
  label: string
}

function ModuleRow({
  module,
  checked,
  onToggle,
}: {
  module: ModuleCatalogItem
  checked: boolean
  onToggle: (moduleId: ModuleId, next: boolean, label: string) => void
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
        onChange={(event) =>
          onToggle(module.id, event.target.checked, module.label)
        }
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
  // Prefer the live store row so toggles re-render even if a parent passes a
  // stale tenant snapshot (e.g. All view stacking several sections).
  const liveTenant = useTenantById(tenant.id) ?? tenant
  const enabled = new Set(liveTenant.enabledModules)
  const servicesGroup = MODULE_GROUPS.find((group) => group.id === 'services')
  const workspaceModules = MODULE_GROUPS.filter(
    (group) => group.id !== 'services',
  ).flatMap((group) => group.modules)
  const [pending, setPending] = useState<PendingToggle | null>(null)

  const requestToggle = (
    moduleId: ModuleId,
    next: boolean,
    label: string,
  ) => {
    setPending({ moduleId, next, label })
  }

  const closeConfirm = () => setPending(null)

  const confirmToggle = () => {
    if (!pending) return
    const updated = setTenantModuleEnabled(
      liveTenant.id,
      pending.moduleId,
      pending.next,
    )
    if (updated) onChange?.(updated)
    setPending(null)
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
                onToggle={requestToggle}
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
                onToggle={requestToggle}
              />
            ))}
          </ul>
        </section>
      ) : null}

      <ConfirmDialog
        open={pending != null}
        onClose={closeConfirm}
        onConfirm={confirmToggle}
        title={
          pending
            ? `${pending.next ? 'Enable' : 'Disable'} ${pending.label}?`
            : 'Change product?'
        }
        description={
          pending
            ? pending.next
              ? `Are you sure you want to enable ${pending.label} for this agency?`
              : `Are you sure you want to disable ${pending.label} for this agency?`
            : undefined
        }
        confirmLabel={pending?.next ? 'Enable' : 'Disable'}
        confirmVariant={pending?.next ? 'primary' : 'danger'}
      />
    </div>
  )
}
