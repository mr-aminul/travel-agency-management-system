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
  if (value === 'platform_admin') return 'platform_admin'
  if (value === 'sub_agent') return 'sub_agent'
  return 'agency_user'
}

function publicUser(row) {
  const user = {
    id: row.id,
    email: row.email,
    name: row.name,
    role: asUserRole(row.role),
  }
  if (row.sub_agent_id) {
    user.subAgentId = row.sub_agent_id
  }
  return user
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
    `select id, email, name, role, tenant_id, password_hash, status, sub_agent_id
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

function sessionFromActorRow(row) {
  return {
    user: publicUser(row),
    tenantId: row.tenant_id || 'tenant-full',
  }
}

async function clearViewAs(token) {
  await query(
    `update platform.sessions set view_as_user_id = null where token_hash = $1`,
    [tokenHash(token)],
  )
}

/**
 * Resolve the signed-in session. When a platform admin is viewing as another
 * user, `user` / `tenantId` are the target and `actor` is the real admin.
 */
export async function resolveSession(token) {
  if (!token) return null
  const result = await query(
    `select
       u.id, u.email, u.name, u.role, u.tenant_id, u.status, u.sub_agent_id,
       s.expires_at, s.view_as_user_id,
       t.id as view_as_id,
       t.email as view_as_email,
       t.name as view_as_name,
       t.role as view_as_role,
       t.tenant_id as view_as_tenant_id,
       t.status as view_as_status,
       t.sub_agent_id as view_as_sub_agent_id
     from platform.sessions s
     join platform.users u on u.id = s.user_id
     left join platform.users t on t.id = s.view_as_user_id
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

  const actorSession = sessionFromActorRow(row)
  const viewAsId =
    typeof row.view_as_user_id === 'string' && row.view_as_user_id.trim()
      ? row.view_as_user_id.trim()
      : null

  if (!viewAsId) {
    return actorSession
  }

  // Only platform admins may view as another user; clear stale overrides.
  if (actorSession.user.role !== 'platform_admin') {
    await clearViewAs(token)
    return actorSession
  }

  if (
    !row.view_as_id ||
    row.view_as_status !== 'active' ||
    row.view_as_role === 'platform_admin' ||
    row.view_as_id === actorSession.user.id
  ) {
    await clearViewAs(token)
    return actorSession
  }

  return {
    user: publicUser({
      id: row.view_as_id,
      email: row.view_as_email,
      name: row.view_as_name,
      role: row.view_as_role,
      sub_agent_id: row.view_as_sub_agent_id,
    }),
    tenantId: row.view_as_tenant_id || 'tenant-full',
    actor: actorSession.user,
    viewingAs: true,
  }
}

/**
 * Platform admin begins viewing the platform as another login.
 * Accepts `userId` and/or `email` (email wins when both differ from seeds).
 * Keeps the same session token; effective identity becomes the target.
 */
export async function startViewAs(token, { userId, email } = {}) {
  const session = await resolveSession(token)
  if (!session) {
    return { ok: false, status: 401, error: 'Authentication required.' }
  }
  const actor = session.actor ?? session.user
  if (actor.role !== 'platform_admin') {
    return { ok: false, status: 403, error: 'Platform admin access required.' }
  }

  const targetId = String(userId ?? '').trim()
  const targetEmail = normalizeEmail(email)
  if (!targetId && !targetEmail) {
    return { ok: false, status: 400, error: 'User is required.' }
  }

  const targetResult = targetEmail
    ? await query(
        `select id, email, name, role, tenant_id, status, sub_agent_id
         from platform.users
         where lower(email) = $1
         limit 1`,
        [targetEmail],
      )
    : await query(
        `select id, email, name, role, tenant_id, status, sub_agent_id
         from platform.users
         where id = $1
         limit 1`,
        [targetId],
      )
  const target = targetResult.rows[0]
  if (!target || target.status !== 'active') {
    return {
      ok: false,
      status: 404,
      error:
        'That user has no active login yet. They need an accepted invite or password first.',
    }
  }
  if (target.id === actor.id) {
    return { ok: false, status: 400, error: 'You are already signed in as yourself.' }
  }
  if (target.role === 'platform_admin') {
    return { ok: false, status: 400, error: 'Cannot view as another platform admin.' }
  }

  await query(
    `update platform.sessions set view_as_user_id = $2 where token_hash = $1`,
    [tokenHash(token), target.id],
  )

  const next = await resolveSession(token)
  if (!next?.viewingAs) {
    return { ok: false, status: 500, error: 'Could not start view as user.' }
  }
  return {
    ok: true,
    status: 200,
    body: {
      user: next.user,
      tenantId: next.tenantId,
      actor: next.actor,
      viewingAs: true,
    },
  }
}

/** Restore the real platform admin identity on the current session. */
export async function stopViewAs(token) {
  const session = await resolveSession(token)
  if (!session) {
    return { ok: false, status: 401, error: 'Authentication required.' }
  }
  if (!session.viewingAs || !session.actor) {
    return {
      ok: true,
      status: 200,
      body: {
        user: session.user,
        tenantId: session.tenantId,
        viewingAs: false,
      },
    }
  }

  await clearViewAs(token)
  const next = await resolveSession(token)
  if (!next) {
    return { ok: false, status: 401, error: 'Authentication required.' }
  }
  return {
    ok: true,
    status: 200,
    body: {
      user: next.user,
      tenantId: next.tenantId,
      viewingAs: false,
    },
  }
}

/** Real signed-in user (admin) even while viewing as someone else. */
export function sessionActor(session) {
  if (!session) return null
  return session.actor ?? session.user
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
  role,
  subAgentId,
  linkOnly,
}) {
  const normalizedEmail = normalizeEmail(email)
  const trimmedName = String(name ?? '').trim()
  const rawPassword = String(password ?? '')
  const resolvedTenantId = String(tenantId ?? '').trim()
  const userId =
    String(id ?? '').trim() || `user-${crypto.randomBytes(8).toString('hex')}`
  const resolvedRole = role === 'sub_agent' ? 'sub_agent' : 'agency_user'
  const resolvedSubAgentId =
    resolvedRole === 'sub_agent' ? String(subAgentId ?? '').trim() : ''
  const resolvedMemberRole =
    resolvedRole === 'sub_agent'
      ? null
      : memberRole === 'owner' ||
          memberRole === 'manager' ||
          memberRole === 'staff'
        ? memberRole
        : 'staff'
  const isLinkOnly = linkOnly === true

  if (!normalizedEmail) {
    return { ok: false, status: 400, error: 'Email is required.' }
  }
  if (!trimmedName) {
    return { ok: false, status: 400, error: 'Name is required.' }
  }
  if (!isLinkOnly && (!rawPassword || rawPassword.length < 8)) {
    return {
      ok: false,
      status: 400,
      error: 'Password must be at least 8 characters.',
    }
  }
  if (!resolvedTenantId) {
    return { ok: false, status: 400, error: 'Agency is required.' }
  }
  if (resolvedRole === 'sub_agent' && !resolvedSubAgentId) {
    return { ok: false, status: 400, error: 'Sub agent is required.' }
  }

  const existing = await query(
    `select id, role, tenant_id, sub_agent_id, name
     from platform.users where lower(email) = $1 limit 1`,
    [normalizedEmail],
  )
  if (existing.rows[0]) {
    const row = existing.rows[0]
    // Same email: link agency ↔ sub-agent instead of blocking / overwriting password.
    if (resolvedRole === 'agency_user' && row.role === 'sub_agent') {
      if (!rawPassword || rawPassword.length < 8) {
        return {
          ok: false,
          status: 400,
          error: 'Password must be at least 8 characters.',
        }
      }
      await query(
        `update platform.users
         set name = $2,
             role = 'agency_user',
             tenant_id = $3,
             password_hash = $4,
             status = 'active',
             member_role = $5,
             updated_at = now()
         where id = $1`,
        [
          row.id,
          trimmedName,
          resolvedTenantId,
          hashPassword(rawPassword),
          resolvedMemberRole,
        ],
      )
      return {
        ok: true,
        status: 200,
        body: {
          user: {
            id: row.id,
            email: normalizedEmail,
            name: trimmedName,
            role: 'agency_user',
            ...(row.sub_agent_id ? { subAgentId: row.sub_agent_id } : {}),
          },
          tenantId: resolvedTenantId,
          memberRole: resolvedMemberRole,
          linked: true,
        },
      }
    }
    if (
      resolvedRole === 'sub_agent' &&
      (row.role === 'agency_user' || row.role === 'sub_agent')
    ) {
      // Never rewrite password here — agency owners keep their existing login.
      await query(
        `update platform.users
         set sub_agent_id = $2,
             status = 'active',
             updated_at = now()
         where id = $1`,
        [row.id, resolvedSubAgentId],
      )
      return {
        ok: true,
        status: 200,
        body: {
          user: {
            id: row.id,
            email: normalizedEmail,
            name: row.name || trimmedName,
            role: row.role === 'agency_user' ? 'agency_user' : 'sub_agent',
            subAgentId: resolvedSubAgentId,
          },
          tenantId: row.tenant_id || resolvedTenantId,
          memberRole: null,
          linked: true,
        },
      }
    }
    return {
      ok: false,
      status: 409,
      error: 'An account with this email already exists.',
    }
  }

  if (isLinkOnly) {
    return {
      ok: false,
      status: 404,
      error:
        'No existing login for this email. Set a password to create sub-agent access, or use an email that already has an agency login.',
    }
  }

  const passwordHash = hashPassword(rawPassword)
  await query(
    `insert into platform.users
       (id, email, name, role, tenant_id, password_hash, status, member_role, sub_agent_id, updated_at)
     values ($1, $2, $3, $4, $5, $6, 'active', $7, $8, now())`,
    [
      userId,
      normalizedEmail,
      trimmedName,
      resolvedRole,
      resolvedTenantId,
      passwordHash,
      resolvedMemberRole,
      resolvedSubAgentId || null,
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
        role: resolvedRole,
        ...(resolvedSubAgentId ? { subAgentId: resolvedSubAgentId } : {}),
      },
      tenantId: resolvedTenantId,
      memberRole: resolvedMemberRole,
    },
  }
}

/** Resolve agency or sub-agent user by id, else by email. */
async function findAgencyUserRow({ userId, email }) {
  const id = String(userId ?? '').trim()
  if (id) {
    const byId = await query(
      `select id, email, name, role, tenant_id, status, sub_agent_id
       from platform.users
       where id = $1 and role in ('agency_user', 'sub_agent')
       limit 1`,
      [id],
    )
    if (byId.rows[0]) return byId.rows[0]
  }
  const normalizedEmail = normalizeEmail(email)
  if (!normalizedEmail) return null
  const byEmail = await query(
    `select id, email, name, role, tenant_id, status, sub_agent_id
     from platform.users
     where lower(email) = $1 and role in ('agency_user', 'sub_agent')
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
