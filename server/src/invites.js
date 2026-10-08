import crypto from 'node:crypto'
import { query } from './db.js'
import { hashPassword } from './password.js'
import { setUserMemberRole } from './rbac.js'

const INVITE_TTL_MS = 1000 * 60 * 60 * 24 * 7 // 7 days

function normalizeEmail(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
}

function newToken() {
  return crypto.randomBytes(24).toString('base64url')
}

function asRole(value) {
  if (value === 'owner' || value === 'manager' || value === 'staff') return value
  return 'staff'
}

export async function createInvite({
  tenantId,
  email,
  name,
  memberRole,
  invitedBy,
}) {
  const normalizedEmail = normalizeEmail(email)
  const trimmedName = String(name ?? '').trim()
  const role = asRole(memberRole)
  if (!normalizedEmail) {
    return { ok: false, status: 400, error: 'Email is required.' }
  }
  if (!trimmedName) {
    return { ok: false, status: 400, error: 'Name is required.' }
  }
  if (!tenantId) {
    return { ok: false, status: 400, error: 'Agency is required.' }
  }

  const existingUser = await query(
    `select id, status from platform.users where lower(email) = $1 limit 1`,
    [normalizedEmail],
  )
  if (existingUser.rows[0]?.status === 'active') {
    return {
      ok: false,
      status: 409,
      error: 'An active account with this email already exists.',
    }
  }

  // Expire prior open invites for same email+tenant
  await query(
    `update platform.invites
     set expires_at = now()
     where tenant_id = $1 and lower(email) = $2 and accepted_at is null`,
    [tenantId, normalizedEmail],
  )

  const id = `inv-${crypto.randomBytes(8).toString('hex')}`
  const token = newToken()
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS)
  await query(
    `insert into platform.invites
       (id, token, tenant_id, email, name, member_role, invited_by, expires_at, created_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, now())`,
    [
      id,
      token,
      tenantId,
      normalizedEmail,
      trimmedName,
      role,
      invitedBy || null,
      expiresAt.toISOString(),
    ],
  )

  return {
    ok: true,
    status: 201,
    body: {
      id,
      token,
      email: normalizedEmail,
      name: trimmedName,
      memberRole: role,
      tenantId,
      expiresAt: expiresAt.toISOString(),
    },
  }
}

export async function getInviteByToken(token) {
  const result = await query(
    `select id, token, tenant_id, email, name, member_role, expires_at, accepted_at
     from platform.invites where token = $1 limit 1`,
    [String(token || '').trim()],
  )
  return result.rows[0] || null
}

async function agencyName(tenantId) {
  const result = await query(
    `select value from platform.kv_store where key = 'pd-tenants-created'`,
  )
  const tenants = Array.isArray(result.rows[0]?.value)
    ? result.rows[0].value
    : []
  const match = tenants.find((t) => t && t.id === tenantId)
  if (match?.name) return String(match.name)
  const names = await query(
    `select value from platform.kv_store where key = 'pd-tenant-names'`,
  )
  const map =
    names.rows[0]?.value && typeof names.rows[0].value === 'object'
      ? names.rows[0].value
      : {}
  return map[tenantId] || 'Your agency'
}

export async function publicInviteView(token) {
  const row = await getInviteByToken(token)
  if (!row) return { ok: false, status: 404, error: 'Invite not found.' }
  if (row.accepted_at) {
    return { ok: false, status: 410, error: 'This invite was already used.' }
  }
  if (new Date(row.expires_at).getTime() <= Date.now()) {
    return { ok: false, status: 410, error: 'This invite has expired.' }
  }
  return {
    ok: true,
    status: 200,
    body: {
      email: row.email,
      name: row.name,
      memberRole: row.member_role,
      tenantId: row.tenant_id,
      agencyName: await agencyName(row.tenant_id),
      expiresAt: row.expires_at,
    },
  }
}

export async function acceptInvite({ token, password }) {
  const row = await getInviteByToken(token)
  if (!row) return { ok: false, status: 404, error: 'Invite not found.' }
  if (row.accepted_at) {
    return { ok: false, status: 410, error: 'This invite was already used.' }
  }
  if (new Date(row.expires_at).getTime() <= Date.now()) {
    return { ok: false, status: 410, error: 'This invite has expired.' }
  }
  const rawPassword = String(password ?? '')
  if (rawPassword.length < 8) {
    return {
      ok: false,
      status: 400,
      error: 'Password must be at least 8 characters.',
    }
  }

  const passwordHash = hashPassword(rawPassword)
  const userId = `user-${crypto.randomBytes(8).toString('hex')}`

  const existing = await query(
    `select id from platform.users where lower(email) = $1 limit 1`,
    [row.email],
  )
  if (existing.rows[0]) {
    await query(
      `update platform.users
       set name = $2,
           tenant_id = $3,
           password_hash = $4,
           status = 'active',
           member_role = $5,
           role = 'agency_user',
           updated_at = now()
       where id = $1`,
      [
        existing.rows[0].id,
        row.name,
        row.tenant_id,
        passwordHash,
        row.member_role,
      ],
    )
    await query(
      `update platform.invites set accepted_at = now() where id = $1`,
      [row.id],
    )
    return {
      ok: true,
      status: 200,
      body: {
        userId: existing.rows[0].id,
        email: row.email,
        name: row.name,
        tenantId: row.tenant_id,
        memberRole: row.member_role,
      },
    }
  }

  await query(
    `insert into platform.users
       (id, email, name, role, tenant_id, password_hash, status, member_role, updated_at)
     values ($1, $2, $3, 'agency_user', $4, $5, 'active', $6, now())`,
    [userId, row.email, row.name, row.tenant_id, passwordHash, row.member_role],
  )
  await query(`update platform.invites set accepted_at = now() where id = $1`, [
    row.id,
  ])

  return {
    ok: true,
    status: 200,
    body: {
      userId,
      email: row.email,
      name: row.name,
      tenantId: row.tenant_id,
      memberRole: row.member_role,
    },
  }
}

export async function listInvitesForTenant(tenantId) {
  const result = await query(
    `select id, email, name, member_role, expires_at, accepted_at, created_at, token
     from platform.invites
     where tenant_id = $1
     order by created_at desc
     limit 100`,
    [tenantId],
  )
  return result.rows.map((row) => ({
    id: row.id,
    email: row.email,
    name: row.name,
    memberRole: row.member_role,
    expiresAt: row.expires_at,
    acceptedAt: row.accepted_at,
    createdAt: row.created_at,
    token: row.accepted_at ? undefined : row.token,
    status: row.accepted_at
      ? 'accepted'
      : new Date(row.expires_at).getTime() <= Date.now()
        ? 'expired'
        : 'pending',
  }))
}

/** Keep setUserMemberRole export used when provisioning with password. */
export { setUserMemberRole }
