import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react'
import { cx } from '@/lib/cx'

export type FilterChipsProps = HTMLAttributes<HTMLElement> & {
  /** Accessible name for the chip group. */
  label: string
  children: ReactNode
}

/**
 * Horizontal filter-chip row. Gap and wrap live on this primitive so
 * call sites cannot ship bare buttons jammed edge-to-edge.
 */
export function FilterChips({
  label,
  className,
  children,
  ...props
}: FilterChipsProps) {
  return (
    <nav
      className={cx('pd-filter-chips', className)}
      aria-label={label}
      {...props}
    >
      {children}
    </nav>
  )
}

export type FilterChipProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'type' | 'aria-pressed'
> & {
  /** Whether this chip is the active filter. */
  active?: boolean
  children: ReactNode
}

export function FilterChip({
  active = false,
  className,
  children,
  ...props
}: FilterChipProps) {
  return (
    <button
      type="button"
      className={cx('pd-filter-chip', active && 'is-active', className)}
      aria-pressed={active}
      {...props}
    >
      {children}
    </button>
  )
}
