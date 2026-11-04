import { query } from './db.js'

const MEMBERS_KEY = 'pd-tenant-members-created'

function asRole(value) {
  if (value === 'owner' || value === 'manager' || value === 'staff') return value
  return 'staff'
}

function asStatus(value) {
  if (value === 'active' || value === 'invited' || value === 'disabled') {
    return value
  }
  return 'active'
}

async function readMembers() {
  const result = await query(
    `select value from platform.kv_store where key = $1`,
    [MEMBERS_KEY],
  )
  const value = result.rows[0]?.value
  return Array.isArray(value) ? value : []
}

async function writeMembers(members) {
  await query(
    `insert into platform.kv_store (key, value, updated_at)
     values ($1, $2::jsonb, now())
     on conflict (key) do update set
       value = excluded.value,
       updated_at = now()`,
    [MEMBERS_KEY, JSON.stringify(members)],
  )
}

/**
 * Keep the SPA People roster in sync with platform.users.
 * Login create used to write only the DB row; the roster lived in client KV
 * and could be lost on a failed/stale sync — seats showed 2, People showed 1.
 */
export async function upsertTenantMemberRoster({
  id,
  tenantId,
  email,
  name,
  role,
  status,
}) {
  const userId = String(id ?? '').trim()
  const resolvedTenantId = String(tenantId ?? '').trim()
  const normalizedEmail = String(email ?? '')
    .trim()
    .toLowerCase()
  const trimmedName = String(name ?? '').trim() || normalizedEmail
  if (!userId || !resolvedTenantId || !normalizedEmail) return { ok: false }

  const members = await readMembers()
  const index = members.findIndex((member) => {
    if (!member || typeof member !== 'object') return false
    const memberId = String(member.id ?? '').trim()
    const memberTenant = String(member.tenantId ?? '').trim()
    const memberEmail = String(member.email ?? '')
      .trim()
      .toLowerCase()
    if (memberId && memberId === userId) return true
    return (
      memberTenant === resolvedTenantId &&
      memberEmail &&
      memberEmail === normalizedEmail
    )
  })

  const next = {
    id: userId,
    tenantId: resolvedTenantId,
    name: trimmedName,
    email: normalizedEmail,
    role: asRole(role),
    status: asStatus(status),
  }

  if (index >= 0) {
    members[index] = { ...members[index], ...next }
  } else {
    members.unshift(next)
  }
  await writeMembers(members)
  return { ok: true, member: next }
}

export async function removeTenantMemberRoster({ userId, email, tenantId }) {
  const id = String(userId ?? '').trim()
  const normalizedEmail = String(email ?? '')
    .trim()
    .toLowerCase()
  const resolvedTenantId = String(tenantId ?? '').trim()
  if (!id && !normalizedEmail) return { ok: false, removed: 0 }

  const members = await readMembers()
  const next = members.filter((member) => {
    if (!member || typeof member !== 'object') return true
    const memberId = String(member.id ?? '').trim()
    const memberEmail = String(member.email ?? '')
      .trim()
      .toLowerCase()
    const memberTenant = String(member.tenantId ?? '').trim()
    if (id && memberId === id) return false
    if (
      resolvedTenantId &&
      normalizedEmail &&
      memberTenant === resolvedTenantId &&
      memberEmail === normalizedEmail
    ) {
      return false
    }
    return true
  })
  const removed = members.length - next.length
  if (removed > 0) await writeMembers(next)
  return { ok: true, removed }
}

/**
 * Backfill People roster rows for every agency_user login in a tenant.
 * Repairs ghost users created before server-side roster upsert existed.
 */
export async function syncTenantMembersFromUsers(tenantId) {
  const resolvedTenantId = String(tenantId ?? '').trim()
  if (!resolvedTenantId) return { ok: false, added: 0 }

  const users = await query(
    `select id, email, name, member_role, status
     from platform.users
     where tenant_id = $1
       and role = 'agency_user'`,
    [resolvedTenantId],
  )

  const members = await readMembers()
  let changed = false
  let added = 0

  for (const row of users.rows) {
    const userId = String(row.id ?? '').trim()
    const normalizedEmail = String(row.email ?? '')
      .trim()
      .toLowerCase()
    if (!userId || !normalizedEmail) continue

    const index = members.findIndex((member) => {
      if (!member || typeof member !== 'object') return false
      const memberId = String(member.id ?? '').trim()
      const memberTenant = String(member.tenantId ?? '').trim()
      const memberEmail = String(member.email ?? '')
        .trim()
        .toLowerCase()
      if (memberId && memberId === userId) return true
      return (
        memberTenant === resolvedTenantId &&
        memberEmail === normalizedEmail
      )
    })

    const next = {
      id: userId,
      tenantId: resolvedTenantId,
      name: String(row.name ?? '').trim() || normalizedEmail,
      email: normalizedEmail,
      role: asRole(row.member_role),
      status: row.status === 'disabled' ? 'disabled' : 'active',
    }

    if (index >= 0) {
      const prior = members[index]
      if (
        prior.id !== next.id ||
        prior.email !== next.email ||
        prior.name !== next.name ||
        prior.role !== next.role ||
        prior.status !== next.status ||
        prior.tenantId !== next.tenantId
      ) {
        members[index] = { ...prior, ...next }
        changed = true
      }
    } else {
      members.unshift(next)
      changed = true
      added += 1
    }
  }

  if (changed) await writeMembers(members)
  return { ok: true, added }
}
