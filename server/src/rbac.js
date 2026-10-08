import { query } from './db.js'

const SETTINGS_WRITE_KEYS = new Set([
  'pd-user-page-access',
  'pd-agency-profiles',
  'pd-service-templates',
  'pd-document-print-templates',
  'pd-client-profile-fields',
  'pd-custom-services',
  'pd-hidden-services',
  'pd-service-icon-overrides',
  'pd-onboarding-state',
  'pd-tenant-members-created',
])

export function isElevatedMemberRole(role) {
  return role === 'owner' || role === 'manager'
}

export async function loadMemberRole(userId, tenantId) {
  const result = await query(
    `select member_role, role, tenant_id from platform.users where id = $1 limit 1`,
    [userId],
  )
  const row = result.rows[0]
  if (!row) return null
  if (row.role === 'platform_admin') return 'platform_admin'
  if (tenantId && row.tenant_id && row.tenant_id !== tenantId) return null
  return row.member_role || 'staff'
}

export async function setUserMemberRole(userId, memberRole) {
  await query(
    `update platform.users set member_role = $2, updated_at = now() where id = $1`,
    [userId, memberRole],
  )
}

/** Keys that only owners/managers may write. */
export function isSettingsWriteKey(key) {
  return SETTINGS_WRITE_KEYS.has(key)
}

/**
 * Deny staff from writing agency settings / IAM blobs.
 * Platform admins always allowed. Domain data (clients/cases/payments) allowed for staff.
 */
export async function assertCanWriteKvKey(auth, key) {
  if (auth?.user?.role === 'platform_admin') return { ok: true }
  if (!isSettingsWriteKey(key)) return { ok: true }
  const role = await loadMemberRole(auth.user.id, auth.tenantId)
  if (isElevatedMemberRole(role)) return { ok: true }
  return {
    ok: false,
    status: 403,
    error: 'Only owners and managers can change agency settings.',
  }
}

export async function assertCanManageUsers(auth, targetTenantId) {
  if (auth?.user?.role === 'platform_admin') return { ok: true }
  if (targetTenantId && targetTenantId !== auth.tenantId) {
    return { ok: false, status: 403, error: 'Wrong agency.' }
  }
  const role = await loadMemberRole(auth.user.id, auth.tenantId)
  if (isElevatedMemberRole(role)) return { ok: true }
  return {
    ok: false,
    status: 403,
    error: 'Only owners and managers can manage users.',
  }
}
