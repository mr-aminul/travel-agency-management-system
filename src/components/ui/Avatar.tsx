import type { HTMLAttributes } from 'react'
import {
  Building2,
  Crown,
  Handshake,
  IdCard,
  UserRound,
  type LucideIcon,
} from 'lucide-react'
import { cx } from '@/lib/cx'
import type { TenantMemberRole } from '@/types/tenant'

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl'

/** Placeholder glyph when no photo is set — one icon per entity type. */
export type AvatarKind =
  | 'business'
  | 'owner'
  | 'staff'
  | 'client'
  | 'subAgent'

export type AvatarProps = HTMLAttributes<HTMLSpanElement> & {
  name?: string | null
  src?: string | null
  size?: AvatarSize
  kind?: AvatarKind
  alt?: string
}

const AVATAR_KIND_ICON: Record<AvatarKind, LucideIcon> = {
  business: Building2,
  owner: Crown,
  staff: IdCard,
  client: UserRound,
  subAgent: Handshake,
}

export function avatarKindForMemberRole(
  role: TenantMemberRole | undefined,
): AvatarKind {
  if (role === 'owner') return 'owner'
  return 'staff'
}

export function Avatar({
  name,
  src,
  size = 'md',
  kind = 'client',
  alt,
  className,
  ...props
}: AvatarProps) {
  const label = alt ?? name ?? 'Avatar'
  const Icon = AVATAR_KIND_ICON[kind]

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
        <Icon className="pd-avatar__icon" aria-hidden />
      )}
    </span>
  )
}
