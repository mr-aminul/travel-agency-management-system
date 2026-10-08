import crypto from 'node:crypto'
import { query } from './db.js'
import { hashPassword } from './password.js'

const RESET_TTL_MS = 1000 * 60 * 60 // 1 hour

function normalizeEmail(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
}

function newToken() {
  return crypto.randomBytes(24).toString('base64url')
}

/**
 * Always succeeds from the caller's perspective (no email enumeration).
 * Returns token only when a user exists (for UI copy-link in admin/dev;
 * production email would send it out-of-band).
 */
export async function requestPasswordReset(email) {
  const normalizedEmail = normalizeEmail(email)
  if (!normalizedEmail) {
    return { ok: true, status: 200, body: { sent: true } }
  }

  const result = await query(
    `select id, email, status from platform.users where lower(email) = $1 limit 1`,
    [normalizedEmail],
  )
  const user = result.rows[0]
  if (!user || user.status !== 'active') {
    return { ok: true, status: 200, body: { sent: true } }
  }

  // Invalidate prior unused tokens
  await query(
    `update platform.password_resets
     set used_at = now()
     where user_id = $1 and used_at is null`,
    [user.id],
  )

  const id = `rst-${crypto.randomBytes(8).toString('hex')}`
  const token = newToken()
  const expiresAt = new Date(Date.now() + RESET_TTL_MS)
  await query(
    `insert into platform.password_resets
       (id, token, user_id, email, expires_at, created_at)
     values ($1, $2, $3, $4, $5, now())`,
    [id, token, user.id, user.email, expiresAt.toISOString()],
  )

  return {
    ok: true,
    status: 200,
    body: {
      sent: true,
      // Returned so the SPA can show a copyable link until email is wired.
      token,
      expiresAt: expiresAt.toISOString(),
    },
  }
}

export async function getResetByToken(token) {
  const result = await query(
    `select id, token, user_id, email, expires_at, used_at
     from platform.password_resets where token = $1 limit 1`,
    [String(token || '').trim()],
  )
  return result.rows[0] || null
}

export async function publicResetView(token) {
  const row = await getResetByToken(token)
  if (!row) return { ok: false, status: 404, error: 'Reset link not found.' }
  if (row.used_at) {
    return { ok: false, status: 410, error: 'This reset link was already used.' }
  }
  if (new Date(row.expires_at).getTime() <= Date.now()) {
    return { ok: false, status: 410, error: 'This reset link has expired.' }
  }
  return {
    ok: true,
    status: 200,
    body: { email: row.email, expiresAt: row.expires_at },
  }
}

export async function confirmPasswordReset({ token, password }) {
  const row = await getResetByToken(token)
  if (!row) return { ok: false, status: 404, error: 'Reset link not found.' }
  if (row.used_at) {
    return { ok: false, status: 410, error: 'This reset link was already used.' }
  }
  if (new Date(row.expires_at).getTime() <= Date.now()) {
    return { ok: false, status: 410, error: 'This reset link has expired.' }
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
  await query(
    `update platform.users
     set password_hash = $2, status = 'active', updated_at = now()
     where id = $1`,
    [row.user_id, passwordHash],
  )
  await query(
    `update platform.password_resets set used_at = now() where id = $1`,
    [row.id],
  )
  await query(`delete from platform.sessions where user_id = $1`, [row.user_id])

  return { ok: true, status: 200, body: { reset: true, email: row.email } }
}
