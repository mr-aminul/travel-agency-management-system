import type { HTMLAttributes } from 'react'
import { UserRound } from 'lucide-react'
import { cx } from '@/lib/cx'

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl'

export type AvatarProps = HTMLAttributes<HTMLSpanElement> & {
  name?: string | null
  src?: string | null
  size?: AvatarSize
  alt?: string
}

export function Avatar({
  name,
  src,
  size = 'md',
  alt,
  className,
  ...props
}: AvatarProps) {
  const label = alt ?? name ?? 'Avatar'

  return (
    <span
      className={cx('pd-avatar', `pd-avatar--${size}`, className)}
      role="img"
      aria-label={label}
      {...props}
    >
      {src ? (
        <img className="pd-avatar__image" src={src} alt="" />
      ) : (
        <UserRound className="pd-avatar__icon" aria-hidden />
      )}
    </span>
  )
}
