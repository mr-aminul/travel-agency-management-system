/**
 * PBKDF2-SHA256 password helpers (browser + Node via Web Crypto).
 * Encoded form: pbkdf2$iterations$saltHex$hashHex
 */

function hexFromBuffer(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

function bufferFromHex(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) throw new Error('Invalid hex')
  const out = new Uint8Array(hex.length / 2)
  for (let i = 0; i < out.length; i += 1) {
    out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return out
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i += 1) {
    diff |= a[i]! ^ b[i]!
  }
  return diff === 0
}

async function deriveBits(
  password: string,
  salt: Uint8Array,
  iterations: number,
  length: number,
): Promise<Uint8Array> {
  const subtle = globalThis.crypto?.subtle
  if (!subtle) {
    throw new Error('Web Crypto is required for password verification.')
  }
  const key = await subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  // Web Crypto BufferSource types reject some Uint8Array generics; copy to ArrayBuffer.
  const saltCopy = new Uint8Array(salt)
  const bits = await subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: saltCopy,
      iterations,
    },
    key,
    length * 8,
  )
  return new Uint8Array(bits)
}

export async function verifyPasswordHash(
  password: string,
  encoded: string,
): Promise<boolean> {
  if (!encoded) return false
  const parts = encoded.split('$')
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false
  const iterations = Number(parts[1])
  if (!Number.isFinite(iterations) || iterations < 1) return false
  let salt: Uint8Array
  let expected: Uint8Array
  try {
    salt = bufferFromHex(parts[2]!)
    expected = bufferFromHex(parts[3]!)
  } catch {
    return false
  }
  if (salt.length === 0 || expected.length === 0) return false
  const derived = await deriveBits(password, salt, iterations, expected.length)
  return timingSafeEqual(derived, expected)
}

/** Test/helper only — prefer server-side hashing in production. */
export async function hashPasswordForTests(
  password: string,
  iterations = 120_000,
): Promise<string> {
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16))
  const derived = await deriveBits(password, salt, iterations, 32)
  return `pbkdf2$${iterations}$${hexFromBuffer(salt.buffer.slice(salt.byteOffset, salt.byteOffset + salt.byteLength))}$${hexFromBuffer(derived.buffer.slice(derived.byteOffset, derived.byteOffset + derived.byteLength))}`
}
