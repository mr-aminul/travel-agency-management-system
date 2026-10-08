import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { query } from './db.js'

const UPLOAD_ROOT =
  process.env.UPLOAD_DIR?.trim() ||
  path.resolve(process.cwd(), '../data/uploads')

const MAX_BYTES = Number(process.env.UPLOAD_MAX_BYTES || 12 * 1024 * 1024)

function safeName(name) {
  return String(name || 'file')
    .replace(/[^\w.\- ()[\]]+/g, '_')
    .slice(0, 180)
}

export async function ensureUploadRoot() {
  await fs.mkdir(UPLOAD_ROOT, { recursive: true })
}

export async function saveUploadedFile({
  tenantId,
  userId,
  fileName,
  mimeType,
  base64Data,
}) {
  if (!tenantId) {
    return { ok: false, status: 400, error: 'Tenant required.' }
  }
  const raw = String(base64Data ?? '')
  const comma = raw.indexOf(',')
  const payload = raw.startsWith('data:') && comma >= 0 ? raw.slice(comma + 1) : raw
  let buffer
  try {
    buffer = Buffer.from(payload, 'base64')
  } catch {
    return { ok: false, status: 400, error: 'Invalid file data.' }
  }
  if (!buffer.length) {
    return { ok: false, status: 400, error: 'Empty file.' }
  }
  if (buffer.length > MAX_BYTES) {
    return {
      ok: false,
      status: 400,
      error: `File too large (max ${Math.round(MAX_BYTES / 1024 / 1024)}MB).`,
    }
  }

  const id = `file-${crypto.randomBytes(12).toString('hex')}`
  const tenantDir = path.join(UPLOAD_ROOT, tenantId)
  await fs.mkdir(tenantDir, { recursive: true })
  const storedName = `${id}-${safeName(fileName)}`
  const absPath = path.join(tenantDir, storedName)
  await fs.writeFile(absPath, buffer)

  const mime = String(mimeType || 'application/octet-stream').slice(0, 200)
  const name = safeName(fileName) || 'file'
  await query(
    `insert into platform.files
       (id, tenant_id, file_name, mime_type, size_bytes, storage_path, created_by, created_at)
     values ($1, $2, $3, $4, $5, $6, $7, now())`,
    [id, tenantId, name, mime, buffer.length, absPath, userId || null],
  )

  return {
    ok: true,
    status: 201,
    body: {
      id,
      fileName: name,
      mimeType: mime,
      size: buffer.length,
      url: `/api/platform/files/${id}`,
    },
  }
}

export async function getFileRecord(fileId, auth) {
  const result = await query(
    `select id, tenant_id, file_name, mime_type, size_bytes, storage_path
     from platform.files where id = $1 limit 1`,
    [fileId],
  )
  const row = result.rows[0]
  if (!row) return null
  if (
    auth?.user?.role !== 'platform_admin' &&
    row.tenant_id !== auth?.tenantId
  ) {
    return null
  }
  return row
}

export async function readFileBuffer(row) {
  return fs.readFile(row.storage_path)
}
