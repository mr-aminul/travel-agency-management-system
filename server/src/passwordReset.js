import crypto from 'node:crypto'
import { query } from './db.js'
import { hashPassword } from './password.js'
import {
  isMailConfigured,
  publicUiBaseUrl,
  sendPasswordResetEmail,
} from './mail.js'

const RESET_TTL_MS = 1000 * 60 * 15 // 15 minutes
const RATE_WINDOW_MS = 1000 * 60 * 15
const MAX_REQUESTS_PER_EMAIL = 3
const MAX_REQUESTS_PER_IP = 10

/** @type {Map<string, number[]>} */
const requestBuckets = new Map()

function normalizeEmail(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
}

function newToken() {
  return crypto.randomBytes(32).toString('base64url')
}

function sha256Hex(value) {
  return crypto.createHash('sha256').update(String(value), 'utf8').digest('hex')
}

function maskEmail(email) {
  const normalized = normalizeEmail(email)
  const at = normalized.indexOf('@')
  if (at < 1) return '••••@••••'
  const local = normalized.slice(0, at)
  const domain = normalized.slice(at + 1)
  const localMask =
    local.length <= 2 ? `${local[0] || '•'}•` : `${local[0]}•••${local.at(-1)}`
  const domainParts = domain.split('.')
  const domainMask = domainParts
    .map((part, index) =>
      index === domainParts.length - 1
        ? part
        : part.length <= 2
          ? `${part[0] || '•'}•`
          : `${part[0]}•••`,
    )
    .join('.')
  return `${localMask}@${domainMask}`
}

function pruneBucket(key, now) {
  const prior = requestBuckets.get(key) || []
  const fresh = prior.filter((ts) => now - ts < RATE_WINDOW_MS)
  if (fresh.length === 0) requestBuckets.delete(key)
  else requestBuckets.set(key, fresh)
  return fresh
}

function takeRateSlot(key, limit) {
  const now = Date.now()
  const fresh = pruneBucket(key, now)
  if (fresh.length >= limit) return false
  fresh.push(now)
  requestBuckets.set(key, fresh)
  return true
}

function allowResetRequest({ email, ip }) {
  const emailOk = takeRateSlot(`email:${email}`, MAX_REQUESTS_PER_EMAIL)
  const ipOk = takeRateSlot(`ip:${ip || 'unknown'}`, MAX_REQUESTS_PER_IP)
  return emailOk && ipOk
}

/**
 * Always succeeds from the caller's perspective (no email enumeration).
 * Never returns a reset token in the HTTP body.
 */
export async function requestPasswordReset(email, { ip } = {}) {
  const normalizedEmail = normalizeEmail(email)
  if (!normalizedEmail) {
    return { ok: true, status: 200, body: { sent: true } }
  }

  if (!allowResetRequest({ email: normalizedEmail, ip })) {
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

  if (!isMailConfigured()) {
    console.error(
      '[password-reset] SMTP is not configured; refusing to issue reset tokens',
    )
    return {
      ok: false,
      status: 503,
      error: 'Password reset email is temporarily unavailable. Try again later.',
    }
  }

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
       (id, token, user_id, email, expires_at, created_at, otp_hash, attempts)
     values ($1, $2, $3, $4, $5, now(), null, 0)`,
    [id, sha256Hex(token), user.id, user.email, expiresAt.toISOString()],
  )

  const resetUrl = `${publicUiBaseUrl()}/reset/${token}`
  try {
    await sendPasswordResetEmail({
      to: user.email,
      resetUrl,
      expiresMinutes: Math.round(RESET_TTL_MS / 60000),
    })
  } catch (error) {
    await query(`update platform.password_resets set used_at = now() where id = $1`, [
      id,
    ])
    console.error('[password-reset] failed to send email', error)
    return {
      ok: false,
      status: 503,
      error: 'Could not send reset email. Try again later.',
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    console.info('[password-reset] email sent (dev) to', user.email)
  }

  return {
    ok: true,
    status: 200,
    body: { sent: true },
  }
}

export async function getResetByToken(token) {
  const raw = String(token || '').trim()
  if (!raw) return null
  const result = await query(
    `select id, token, user_id, email, expires_at, used_at
     from platform.password_resets where token = $1 limit 1`,
    [sha256Hex(raw)],
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
    body: {
      emailMasked: maskEmail(row.email),
      expiresAt: row.expires_at,
    },
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

  return {
    ok: true,
    status: 200,
    body: { reset: true, emailMasked: maskEmail(row.email) },
  }
}
