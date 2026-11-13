import { useState } from 'react'
import { MODULE_GROUPS, type ModuleCatalogItem } from '@/lib/modules'
import { iconForModule } from '@/lib/moduleIcons'
import { setTenantModuleEnabled, useTenantById } from '@/lib/tenantsStore'
import type { ModuleId, Tenant } from '@/types/tenant'
import { LabeledSwitch } from '@/components/clients/LabeledSwitch'
import { Button } from '@/components/shadcn/button'
import { ConfirmDialog } from '@/components/shadcn/confirm-dialog'
import {
  adminModuleGroupClass,
  adminModuleGroupTitleClass,
  adminModuleIconClass,
  adminModuleLabelClass,
  adminModuleListGridClass,
  adminModuleRowClass,
  adminModuleSwitchClass,
  adminModulesClass,
} from '@/components/admin/adminChrome'

type PendingToggle =
  | {
      kind: 'one'
      moduleId: ModuleId
      next: boolean
      label: string
    }
  | {
      kind: 'group'
      groupLabel: string
      moduleIds: ModuleId[]
      next: boolean
    }

const switchClass = `${adminModuleSwitchClass} [&>span:last-child]:sr-only`

function ModuleTile({
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
    <li
      className={
        checked
          ? `${adminModuleRowClass} flex-col items-stretch border-[color-mix(in_srgb,var(--color-theme)_30%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-theme)_6%,var(--color-surface))]`
          : `${adminModuleRowClass} flex-col items-stretch`
      }
    >
      <div className="flex items-start justify-between gap-2">
        <span className={adminModuleIconClass} aria-hidden>
          <Icon size={16} strokeWidth={2.1} />
        </span>
        <LabeledSwitch
          label={module.label}
          className={switchClass}
          offDanger
          checked={checked}
          onChange={(event) =>
            onToggle(module.id, event.target.checked, module.label)
          }
        />
      </div>
      <span className={`${adminModuleLabelClass} whitespace-normal`}>
        {module.label}
      </span>
    </li>
  )
}

function GroupBulkActions({
  groupLabel,
  moduleIds,
  enabled,
  onBulk,
}: {
  groupLabel: string
  moduleIds: ModuleId[]
  enabled: Set<ModuleId>
  onBulk: (groupLabel: string, moduleIds: ModuleId[], next: boolean) => void
}) {
  const allOn = moduleIds.every((id) => enabled.has(id))
  const allOff = moduleIds.every((id) => !enabled.has(id))

  return (
    <div className="flex shrink-0 items-center gap-0.5">
      <Button
        type="button"
        variant="ghost"
        size="xs"
        disabled={allOn}
        onClick={() => onBulk(groupLabel, moduleIds, true)}
      >
        Enable all
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="xs"
        disabled={allOff}
        onClick={() => onBulk(groupLabel, moduleIds, false)}
      >
        Disable all
      </Button>
    </div>
  )
}

export function ModuleEntitlementsEditor({
  tenant,
  onChange,
}: {
  tenant: Tenant
  onChange?: (tenant: Tenant) => void
}) {
  // Prefer the live store row so toggles re-render if a parent passes a stale snapshot.
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
    setPending({ kind: 'one', moduleId, next, label })
  }

  const requestBulk = (
    groupLabel: string,
    moduleIds: ModuleId[],
    next: boolean,
  ) => {
    setPending({ kind: 'group', groupLabel, moduleIds, next })
  }

  const closeConfirm = () => setPending(null)

  const confirmToggle = () => {
    if (!pending) return

    if (pending.kind === 'one') {
      const updated = setTenantModuleEnabled(
        liveTenant.id,
        pending.moduleId,
        pending.next,
      )
      if (updated) onChange?.(updated)
      setPending(null)
      return
    }

    let updated: Tenant | undefined
    for (const moduleId of pending.moduleIds) {
      updated =
        setTenantModuleEnabled(liveTenant.id, moduleId, pending.next) ?? updated
    }
    if (updated) onChange?.(updated)
    setPending(null)
  }

  const confirmTitle = (() => {
    if (!pending) return 'Change product?'
    if (pending.kind === 'one') {
      return `${pending.next ? 'Enable' : 'Disable'} ${pending.label}?`
    }
    return `${pending.next ? 'Enable' : 'Disable'} all ${pending.groupLabel}?`
  })()

  return (
    <div className={adminModulesClass} aria-label="Modules">
      {servicesGroup ? (
        <section
          className={adminModuleGroupClass}
          aria-labelledby="pd-admin-modules-services"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3
              id="pd-admin-modules-services"
              className={adminModuleGroupTitleClass}
            >
              Services
            </h3>
            <GroupBulkActions
              groupLabel="Services"
              moduleIds={servicesGroup.modules.map((module) => module.id)}
              enabled={enabled}
              onBulk={requestBulk}
            />
          </div>
          <ul className={adminModuleListGridClass}>
            {servicesGroup.modules.map((module) => (
              <ModuleTile
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
          className={adminModuleGroupClass}
          aria-labelledby="pd-admin-modules-workspaces"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3
              id="pd-admin-modules-workspaces"
              className={adminModuleGroupTitleClass}
            >
              Workspaces
            </h3>
            <GroupBulkActions
              groupLabel="Workspaces"
              moduleIds={workspaceModules.map((module) => module.id)}
              enabled={enabled}
              onBulk={requestBulk}
            />
          </div>
          <ul className={adminModuleListGridClass}>
            {workspaceModules.map((module) => (
              <ModuleTile
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
        title={confirmTitle}
        confirmLabel={pending?.next ? 'Enable' : 'Disable'}
        confirmVariant={pending?.next ? 'primary' : 'danger'}
      />
    </div>
  )
}
