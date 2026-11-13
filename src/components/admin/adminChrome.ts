/** Shared Tailwind class strings for admin / settings chrome (ex-`pd-admin__*`). */

export {
  chromeHeadClass,
  elevatedPageClass,
  tableShellClass,
  whiteControlClass,
} from '@/components/clients/shadcnChrome'

export const adminQuietClass = 'm-0 text-sm text-muted-foreground'

export const adminAllViewClass = 'flex min-w-0 flex-col gap-4'

export const adminPanelClass =
  'flex flex-col gap-4 rounded-[0.9rem] border border-border bg-[color-mix(in_srgb,var(--color-surface)_92%,transparent)] p-4'

export const adminPanelHeaderClass =
  'flex flex-wrap items-start justify-between gap-3'

export const adminPanelToolbarClass =
  'flex flex-wrap items-center justify-between gap-3'

export const adminPanelTitleClass =
  'm-0 flex items-center gap-[0.45rem] text-[1.05rem] font-extrabold text-[var(--color-theme-ink)]'

export const adminCountClass =
  'inline-flex h-[1.35rem] min-w-[1.35rem] items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-theme)_14%,transparent)] px-[0.35rem] text-xs font-extrabold tabular-nums text-[var(--color-theme-ink)]'

export const adminToolbarRowClass = 'flex max-w-80 flex-wrap items-center gap-2'

export const adminClientsToolbarClass = 'flex flex-wrap items-center gap-2'

export const adminBulkBarClass =
  'mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 rounded-md border border-border bg-[color-mix(in_srgb,var(--color-theme)_8%,var(--color-bg))] px-[0.875rem] py-2.5'

export const adminBulkCountClass = 'text-sm font-semibold text-foreground'

export const adminBulkActionsClass =
  'inline-flex flex-wrap items-center gap-2'

export const adminUserClass = 'flex min-w-0 items-center gap-[0.6rem]'

export const adminUserNameClass = 'font-semibold'

export const adminBusinessNameClass =
  'font-semibold text-inherit no-underline hover:underline'

export const adminRowClass = 'cursor-pointer'

export const adminRowChevronClass =
  'ms-auto block text-muted-foreground'

export const adminRowActionsClass = 'inline-flex flex-wrap gap-2'

export const adminSelectColClass = 'w-9'

export const adminSelectCellClass = 'w-9 align-middle'

export const adminCredentialNameClass =
  'mb-3 mt-0 font-semibold text-foreground'

export const adminCredentialRowClass =
  'mb-2 mt-0 text-muted-foreground'

export const adminShortcutsClass =
  'grid grid-cols-4 gap-3 max-md:grid-cols-2'

export const adminShortcutClass =
  'flex flex-col items-start gap-3 rounded-[0.85rem] border border-border bg-[color-mix(in_srgb,var(--color-surface)_92%,transparent)] p-4 font-bold text-foreground no-underline hover:border-[color-mix(in_srgb,var(--color-theme)_40%,var(--color-border))]'

export const adminShortcutIconClass =
  'inline-flex size-10 items-center justify-center rounded-[0.7rem] bg-[color-mix(in_srgb,var(--color-theme)_12%,transparent)] text-[var(--color-theme-ink)]'

export const adminFormGridClass =
  'grid grid-cols-[repeat(auto-fit,minmax(16rem,1fr))] items-start gap-4'

export const adminFormStackClass = 'flex flex-col gap-[1.125rem]'

export const adminModulesClass = 'flex flex-col gap-4'

export const adminModuleGroupClass = 'flex min-w-0 flex-col gap-[0.45rem]'

export const adminModuleGroupTitleClass =
  'm-0 text-xs font-bold uppercase tracking-[0.04em] text-muted-foreground'

export const adminModuleListClass = 'm-0 list-none p-0'

export const adminModuleListGridClass =
  'm-0 grid list-none grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] gap-2.5 p-0'

export const adminModuleRowClass =
  'flex min-h-[5.25rem] items-center justify-between gap-2 rounded-xl border border-border bg-[color-mix(in_srgb,var(--color-surface)_96%,transparent)] px-3 py-3'

export const adminModuleMetaClass = 'flex min-w-0 items-center gap-[0.55rem]'

export const adminModuleIconClass =
  'inline-flex size-[1.85rem] shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--color-theme)_14%,transparent)] text-[var(--color-theme-ink)]'

export const adminModuleLabelClass =
  'truncate text-[0.8125rem] font-semibold leading-tight text-foreground'

export const adminModuleSwitchClass = 'shrink-0'

export const adminMessagingQuantityHeadClass =
  'mb-[0.55rem] flex items-center justify-between gap-3'

export const adminMessagingQuantityClass = 'flex flex-col gap-[0.65rem]'

export const adminMessagingQuantityRowClass =
  'grid max-w-[22rem] grid-cols-[minmax(0,12rem)_auto] items-center gap-2'

export const adminPlanClass =
  'flex flex-col gap-[0.55rem] border-t border-border pt-[0.7rem]'

export const adminPlanStorageClass =
  'mt-[0.85rem] flex flex-col gap-[0.55rem] border-t border-border pt-[0.85rem]'

export const adminPlanStorageRowClass =
  'grid grid-cols-[minmax(0,1fr)_5.5rem_auto] items-center gap-[0.45rem]'

export const adminPlanBillClass = 'flex flex-col gap-[0.35rem]'

export const adminPlanOpsClass = 'grid grid-cols-2 gap-[0.4rem]'

export const adminBillingCardPendingClass =
  'm-0 flex list-none flex-col gap-[0.3rem] p-0'
