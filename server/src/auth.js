import crypto from 'node:crypto'
import { query } from './db.js'
import { hashPassword, verifyPassword } from './password.js'

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14 // 14 days

function normalizeEmail(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
}

function tokenHash(token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

function newSessionToken() {
  return crypto.randomBytes(32).toString('base64url')
}

function asUserRole(value) {
  return value === 'platform_admin' ? 'platform_admin' : 'agency_user'
}

function publicUser(row) {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: asUserRole(row.role),
  }
}

/** Launch agency + platform admin logins — passwords come from env (never committed). */
function seedDefinitions() {
  const adminEmail =
    process.env.PLATFORM_ADMIN_EMAIL?.trim().toLowerCase() ||
    'aminulislamborhan@gmail.com'
  const adminPassword =
    process.env.PLATFORM_ADMIN_PASSWORD?.trim() || '12345678'
  const agencyPassword =
    process.env.SEED_AGENCY_PASSWORD?.trim() || '12345678'

  return [
    {
      id: 'user-platform-admin',
      email: adminEmail,
      name: 'Aminul Islam Borhan',
      role: 'platform_admin',
      tenantId: 'tenant-full',
      password: adminPassword,
    },
    {
      id: 'user-coastal-owner',
      email: 'ops@coastalleisure.com',
      name: 'Coastal Leisure',
      role: 'agency_user',
      tenantId: 'tenant-leisure',
      password: agencyPassword,
    },
    {
      id: 'user-horizon-owner',
      email: 'ops@horizonmanpower.com',
      name: 'Horizon Manpower',
      role: 'agency_user',
      tenantId: 'tenant-manpower',
      password: agencyPassword,
    },
    {
      id: 'user-onetrack-owner',
      email: 'ops@onetrack.bd',
      name: 'OneTrack Agency',
      role: 'agency_user',
      tenantId: 'tenant-full',
      password: agencyPassword,
    },
  ]
}

/**
 * Ensure launch agency + admin users exist (insert-if-missing).
 * Never rewrite password_hash on existing rows (prevents prod password reset on restart).
 * Set SEED_FORCE_PASSWORDS=1 to intentionally reset those account passwords.
 */
export async function seedAuthUsers() {
  const forcePasswords = process.env.SEED_FORCE_PASSWORDS === '1'
  for (const account of seedDefinitions()) {
    const passwordHash = hashPassword(account.password)
    const memberRole =
      account.role === 'platform_admin' ? null : 'owner'
    if (forcePasswords) {
      await query(
        `insert into platform.users
           (id, email, name, role, tenant_id, password_hash, status, member_role, updated_at)
         values ($1, $2, $3, $4, $5, $6, 'active', $7, now())
         on conflict (id) do update set
           email = excluded.email,
           name = excluded.name,
           role = excluded.role,
           tenant_id = excluded.tenant_id,
           password_hash = excluded.password_hash,
           status = 'active',
           member_role = coalesce(platform.users.member_role, excluded.member_role),
           updated_at = now()`,
        [
          account.id,
          account.email,
          account.name,
          account.role,
          account.tenantId,
          passwordHash,
          memberRole,
        ],
      )
      continue
    }
    await query(
      `insert into platform.users
         (id, email, name, role, tenant_id, password_hash, status, member_role, updated_at)
       values ($1, $2, $3, $4, $5, $6, 'active', $7, now())
       on conflict (id) do update set
         email = excluded.email,
         name = excluded.name,
         role = excluded.role,
         tenant_id = excluded.tenant_id,
         member_role = coalesce(platform.users.member_role, excluded.member_role),
         updated_at = now()`,
      [
        account.id,
        account.email,
        account.name,
        account.role,
        account.tenantId,
        passwordHash,
        memberRole,
      ],
    )
  }
}

async function createSession(userId) {
  const token = newSessionToken()
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS)
  await query(
    `insert into platform.sessions (token_hash, user_id, expires_at)
     values ($1, $2, $3)`,
    [tokenHash(token), userId, expiresAt.toISOString()],
  )
  return { token, expiresAt }
}

export async function loginWithPassword(email, password) {
  const normalizedEmail = normalizeEmail(email)
  const normalizedPassword = String(password ?? '')
  if (!normalizedEmail) {
    return { ok: false, status: 400, error: 'Enter your email.' }
  }
  if (!normalizedPassword) {
    return { ok: false, status: 400, error: 'Enter your password.' }
  }

  const result = await query(
    `select id, email, name, role, tenant_id, password_hash, status
     from platform.users
     where lower(email) = $1
     limit 1`,
    [normalizedEmail],
  )
  const row = result.rows[0]
  if (!row || row.status !== 'active') {
    return { ok: false, status: 401, error: 'Email or password is incorrect.' }
  }
  if (!verifyPassword(normalizedPassword, row.password_hash)) {
    return { ok: false, status: 401, error: 'Email or password is incorrect.' }
  }

  const session = await createSession(row.id)
  return {
    ok: true,
    status: 200,
    body: {
      accessToken: session.token,
      expiresAt: session.expiresAt.toISOString(),
      tenantId: row.tenant_id || 'tenant-full',
      user: publicUser(row),
      signedInAt: new Date().toISOString(),
    },
  }
}

export async function revokeSession(token) {
  if (!token) return
  await query(`delete from platform.sessions where token_hash = $1`, [
    tokenHash(token),
  ])
}

export async function resolveSession(token) {
  if (!token) return null
  const result = await query(
    `select u.id, u.email, u.name, u.role, u.tenant_id, u.status, s.expires_at
     from platform.sessions s
     join platform.users u on u.id = s.user_id
     where s.token_hash = $1
     limit 1`,
    [tokenHash(token)],
  )
  const row = result.rows[0]
  if (!row) return null
  if (row.status !== 'active') return null
  if (new Date(row.expires_at).getTime() <= Date.now()) {
    await query(`delete from platform.sessions where token_hash = $1`, [
      tokenHash(token),
    ])
    return null
  }
  return {
    user: publicUser(row),
    tenantId: row.tenant_id || 'tenant-full',
  }
}

export function readBearerToken(req) {
  const header = req.headers.authorization
  if (typeof header === 'string' && header.toLowerCase().startsWith('bearer ')) {
    return header.slice(7).trim() || null
  }
  return null
}

export async function requireAuth(req, res, next) {
  try {
    const token = readBearerToken(req)
    const session = await resolveSession(token)
    if (!session) {
      res.status(401).json({ error: 'Authentication required.' })
      return
    }
    req.auth = session
    req.accessToken = token
    next()
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'auth failed',
    })
  }
}

export async function requirePlatformAdmin(req, res, next) {
  await requireAuth(req, res, () => {
    if (req.auth?.user?.role !== 'platform_admin') {
      res.status(403).json({ error: 'Platform admin access required.' })
      return
    }
    next()
  })
}

/**
 * Provision an agency login user (admin-set initial password).
 * Email must be unique across platform.users.
 */
export async function createAgencyUser({
  email,
  name,
  password,
  tenantId,
  id,
  memberRole,
}) {
  const normalizedEmail = normalizeEmail(email)
  const trimmedName = String(name ?? '').trim()
  const rawPassword = String(password ?? '')
  const resolvedTenantId = String(tenantId ?? '').trim()
  const userId =
    String(id ?? '').trim() || `user-${crypto.randomBytes(8).toString('hex')}`
  const resolvedMemberRole =
    memberRole === 'owner' || memberRole === 'manager' || memberRole === 'staff'
      ? memberRole
      : 'staff'

  if (!normalizedEmail) {
    return { ok: false, status: 400, error: 'Email is required.' }
  }
  if (!trimmedName) {
    return { ok: false, status: 400, error: 'Name is required.' }
  }
  if (!rawPassword || rawPassword.length < 8) {
    return {
      ok: false,
      status: 400,
      error: 'Password must be at least 8 characters.',
    }
  }
  if (!resolvedTenantId) {
    return { ok: false, status: 400, error: 'Agency is required.' }
  }

  const existing = await query(
    `select id from platform.users where lower(email) = $1 limit 1`,
    [normalizedEmail],
  )
  if (existing.rows[0]) {
    return {
      ok: false,
      status: 409,
      error: 'An account with this email already exists.',
    }
  }

  const passwordHash = hashPassword(rawPassword)
  await query(
    `insert into platform.users
       (id, email, name, role, tenant_id, password_hash, status, member_role, updated_at)
     values ($1, $2, $3, 'agency_user', $4, $5, 'active', $6, now())`,
    [
      userId,
      normalizedEmail,
      trimmedName,
      resolvedTenantId,
      passwordHash,
      resolvedMemberRole,
    ],
  )

  return {
    ok: true,
    status: 201,
    body: {
      user: {
        id: userId,
        email: normalizedEmail,
        name: trimmedName,
        role: 'agency_user',
      },
      tenantId: resolvedTenantId,
      memberRole: resolvedMemberRole,
    },
  }
}

/** Resolve agency user by id, else by email (members may predate shared ids). */
async function findAgencyUserRow({ userId, email }) {
  const id = String(userId ?? '').trim()
  if (id) {
    const byId = await query(
      `select id, email, name, role, tenant_id, status
       from platform.users
       where id = $1 and role = 'agency_user'
       limit 1`,
      [id],
    )
    if (byId.rows[0]) return byId.rows[0]
  }
  const normalizedEmail = normalizeEmail(email)
  if (!normalizedEmail) return null
  const byEmail = await query(
    `select id, email, name, role, tenant_id, status
     from platform.users
     where lower(email) = $1 and role = 'agency_user'
     limit 1`,
    [normalizedEmail],
  )
  return byEmail.rows[0] ?? null
}

export async function setAgencyUserStatus({ userId, email, status }) {
  const next = status === 'disabled' ? 'disabled' : 'active'
  const row = await findAgencyUserRow({ userId, email })
  if (!row) {
    return { ok: false, status: 404, error: 'User not found.' }
  }

  const result = await query(
    `update platform.users
     set status = $2, updated_at = now()
     where id = $1
     returning id, email, name, role, tenant_id, status`,
    [row.id, next],
  )
  const updated = result.rows[0]
  if (next === 'disabled') {
    await query(`delete from platform.sessions where user_id = $1`, [row.id])
  }
  return {
    ok: true,
    status: 200,
    body: {
      user: publicUser(updated),
      tenantId: updated.tenant_id || null,
      status: updated.status,
    },
  }
}

export async function setAgencyUserPassword({
  userId,
  email,
  password,
  name,
  tenantId,
}) {
  const rawPassword = String(password ?? '')
  if (!rawPassword || rawPassword.length < 8) {
    return {
      ok: false,
      status: 400,
      error: 'Password must be at least 8 characters.',
    }
  }

  let row = await findAgencyUserRow({ userId, email })

  // Repair: member exists in SPA but never got a platform.users login row.
  if (!row) {
    const normalizedEmail = normalizeEmail(email)
    const resolvedTenantId = String(tenantId ?? '').trim()
    const trimmedName = String(name ?? '').trim() || normalizedEmail
    if (!normalizedEmail || !resolvedTenantId) {
      return { ok: false, status: 404, error: 'User not found.' }
    }
    const created = await createAgencyUser({
      email: normalizedEmail,
      name: trimmedName,
      password: rawPassword,
      tenantId: resolvedTenantId,
      id: String(userId ?? '').trim() || undefined,
    })
    if (!created.ok) return created
    return {
      ok: true,
      status: 200,
      body: {
        user: created.body.user,
        tenantId: created.body.tenantId,
        repaired: true,
      },
    }
  }

  const passwordHash = hashPassword(rawPassword)
  const result = await query(
    `update platform.users
     set password_hash = $2, status = 'active', updated_at = now()
     where id = $1
     returning id, email, name, role, tenant_id, status`,
    [row.id, passwordHash],
  )
  const updated = result.rows[0]
  await query(`delete from platform.sessions where user_id = $1`, [row.id])
  return {
    ok: true,
    status: 200,
    body: {
      user: publicUser(updated),
      tenantId: updated.tenant_id || null,
    },
  }
}
