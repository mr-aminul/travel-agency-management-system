import type { HTMLAttributes, ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cx } from '@/lib/cx'

export type BadgeVariant =
  | 'neutral'
  | 'completed'
  | 'pending'
  | 'in-progress'
  | 'on-hold'
  | 'danger'

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant
  icon?: LucideIcon
  children: ReactNode
}

export function Badge({
  variant = 'neutral',
  icon: Icon,
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cx('pd-badge', `pd-badge--${variant}`, className)}
      {...props}
    >
      {Icon ? (
        <Icon
          className="pd-badge__icon"
          size={12}
          strokeWidth={2.25}
          aria-hidden
        />
      ) : null}
      {children}
    </span>
  )
}
