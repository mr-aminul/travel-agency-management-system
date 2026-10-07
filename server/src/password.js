import crypto from 'node:crypto'

const DEFAULT_ITERATIONS = 120_000
const KEY_LEN = 32
const DIGEST = 'sha256'

/**
 * @param {string} password
 * @param {number} [iterations]
 * @returns {string} pbkdf2$iterations$saltHex$hashHex
 */
export function hashPassword(password, iterations = DEFAULT_ITERATIONS) {
  const salt = crypto.randomBytes(16)
  const derived = crypto.pbkdf2Sync(
    Buffer.from(password, 'utf8'),
    salt,
    iterations,
    KEY_LEN,
    DIGEST,
  )
  return `pbkdf2$${iterations}$${salt.toString('hex')}$${derived.toString('hex')}`
}

/**
 * @param {string} password
 * @param {string} encoded
 * @returns {boolean}
 */
export function verifyPassword(password, encoded) {
  if (!encoded || typeof encoded !== 'string') return false
  const parts = encoded.split('$')
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false
  const iterations = Number(parts[1])
  if (!Number.isFinite(iterations) || iterations < 1) return false
  let salt
  let expected
  try {
    salt = Buffer.from(parts[2], 'hex')
    expected = Buffer.from(parts[3], 'hex')
  } catch {
    return false
  }
  if (salt.length === 0 || expected.length === 0) return false
  const derived = crypto.pbkdf2Sync(
    Buffer.from(password, 'utf8'),
    salt,
    iterations,
    expected.length,
    DIGEST,
  )
  if (derived.length !== expected.length) return false
  return crypto.timingSafeEqual(derived, expected)
}
