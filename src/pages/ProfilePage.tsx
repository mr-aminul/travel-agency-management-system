import { useAuth } from '@/lib/auth'
import { getActiveTenantId } from '@/lib/authApi'
import { findTenantMemberForUser } from '@/lib/tenantMembersStore'
import '@/styles/layout-ops.css'
import {
  Avatar,
  avatarKindForMemberRole,
  CopyableText,
  PageHeader,
} from '@/components/ui'

export default function ProfilePage() {
  const { user } = useAuth()
  const member =
    user && user.role !== 'platform_admin'
      ? findTenantMemberForUser(getActiveTenantId(), user.id, user.email)
      : undefined
  const avatarKind = avatarKindForMemberRole(member?.role)

  return (
    <div className="pd-page pd-ops" aria-label="My profile">
      <PageHeader
        title="My profile"
        description="The signed-in staff account for this workspace."
      />
      <div className="pd-profile-hero">
        <Avatar name={user?.name ?? 'Staff'} size="xl" kind={avatarKind} />
        <div>
          <strong>{user?.name ?? '—'}</strong>
          <p className="pd-ops__meta">
            {user?.email ? <CopyableText value={user.email} /> : '—'}
          </p>
        </div>
      </div>
      <dl className="pd-profile-kv">
        <div>
          <dt>Name</dt>
          <dd>{user?.name ?? '—'}</dd>
        </div>
        <div>
          <dt>Email</dt>
          <dd>{user?.email ? <CopyableText value={user.email} /> : '—'}</dd>
        </div>
        <div>
          <dt>Role</dt>
          <dd>{user?.role === 'platform_admin' ? 'Platform admin' : 'Agency user'}</dd>
        </div>
      </dl>
    </div>
  )
}
