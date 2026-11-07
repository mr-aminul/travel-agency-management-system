/** Shared Tailwind chrome for Clients (no pd-* classes). */

import { cn } from '@/lib/utils'

export const elevatedPageClass =
  "flex flex-col gap-5 font-[family-name:'Geist_Variable',sans-serif]"

/** Surface control; pair with `is-active` or `data-[state=on]` for theme fill. */
export const whiteControlClass =
  'pd-white-control h-9 gap-1.5 rounded-lg border-input bg-[var(--color-surface)] text-foreground shadow-xs hover:bg-[var(--color-surface)]'

/** Solid selected state — brand blue via .pd-white-control.is-active in theme.css. */
export const activeWhiteControlClass = 'is-active'

/** Pure white field fill on elevated gray canvas (not --color-surface). */
export const pureWhiteFieldClass =
  'h-9 rounded-lg border border-input !bg-white shadow-xs dark:!bg-[var(--color-surface)]'

/** Pure white outline control on elevated gray canvas. */
export const pureWhiteOutlineClass =
  'h-9 gap-1.5 rounded-lg border-input !bg-white text-foreground shadow-xs hover:!bg-white dark:!bg-[var(--color-surface)] dark:hover:!bg-[var(--color-surface)]'

/**
 * White rectangular filter chips. Active = theme ring/border (no white-on-light).
 * Uses ! so outline Button variants cannot override fill/text.
 */
export function filterChipClass(active: boolean, className?: string) {
  return cn(
    'h-7 rounded-md border px-2.5 text-xs shadow-xs !bg-white !text-foreground hover:!bg-white hover:!text-foreground dark:!bg-[var(--color-surface)] dark:hover:!bg-[var(--color-surface)]',
    active
      ? 'border-primary !font-semibold ring-1 ring-primary'
      : 'border-input',
    className,
  )
}

/** Table header cells — brand blue via .pd-chrome-head in theme.css. */
export const chromeHeadClass =
  'pd-chrome-head h-auto border-b-transparent px-[0.85rem] py-[0.45rem] text-[0.875rem] font-semibold'

export const tableShellClass =
  'overflow-auto rounded-xl border border-border bg-card shadow-md'

export const summaryStatGroupClass =
  'grid grid-cols-[repeat(auto-fit,minmax(8.5rem,1fr))] gap-2'

/** Stat cards — brand blue (--color-theme), same as New Client / table heads. */
export const summaryStatClass =
  'pd-summary-stat-chrome relative inline-flex h-auto w-full min-w-0 flex-col items-start justify-start gap-0.5 overflow-hidden rounded-[0.65rem] border-0 px-[0.95rem] py-[0.7rem] text-left font-semibold whitespace-normal shadow-none hover:brightness-[1.08]'

export const summaryStatPeekClass =
  'pointer-events-none absolute -right-[0.65rem] -bottom-[0.75rem] size-[4.75rem] rotate-[-18deg] text-primary-foreground opacity-35'

export const summaryStatLabelClass =
  'relative z-[1] inline-flex items-center gap-1.5 text-[0.8rem] font-medium text-primary-foreground/84 [&_svg]:text-primary-foreground [&_svg]:opacity-100'

export const summaryStatValueClass =
  'relative z-[1] text-[1.35rem] font-bold leading-tight tracking-tight text-primary-foreground'

/** Floating 180ms sheet panel (replaces pd-sub-agent-sheet). */
export const floatingSheetClass =
  '!top-3 !right-3 !bottom-3 !left-auto !h-auto !w-[min(32rem,calc(100vw-1.5rem))] !max-w-[calc(100vw-1.5rem)] !gap-0 !rounded-2xl !border-0 bg-[var(--color-surface-raised,var(--color-surface))] p-0 shadow-[var(--shadow-deep)] sm:!max-w-[min(32rem,calc(100vw-1.5rem))]'

export const floatingSheetWideClass =
  '!w-[min(40rem,calc(100vw-1.5rem))] sm:!max-w-[min(40rem,calc(100vw-1.5rem))]'
