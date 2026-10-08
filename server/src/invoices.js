import crypto from 'node:crypto'
import { query } from './db.js'

function newToken() {
  return crypto.randomBytes(24).toString('base64url')
}

export async function createInvoiceShare({
  tenantId,
  caseId,
  invoice,
  createdBy,
}) {
  const token = newToken()
  const id = `inv-${crypto.randomBytes(8).toString('hex')}`
  await query(
    `insert into platform.invoice_shares
       (id, token, tenant_id, case_id, invoice, created_by, created_at, revoked_at)
     values ($1, $2, $3, $4, $5::jsonb, $6, now(), null)`,
    [
      id,
      token,
      tenantId,
      caseId || null,
      JSON.stringify(invoice),
      createdBy || null,
    ],
  )
  return { id, token }
}

export async function getInvoiceByToken(token) {
  const result = await query(
    `select id, token, tenant_id, case_id, invoice, revoked_at, created_at
     from platform.invoice_shares
     where token = $1
     limit 1`,
    [String(token || '').trim()],
  )
  const row = result.rows[0]
  if (!row || row.revoked_at) return null
  return row
}

export async function revokeInvoiceShare({ token, tenantId, isAdmin }) {
  const row = await getInvoiceByToken(token)
  if (!row) {
    // already missing or revoked — treat as ok for idempotency if we can find revoked
    const any = await query(
      `select id, tenant_id from platform.invoice_shares where token = $1 limit 1`,
      [token],
    )
    if (!any.rows[0]) return { ok: false, status: 404, error: 'Not found.' }
    if (!isAdmin && any.rows[0].tenant_id !== tenantId) {
      return { ok: false, status: 403, error: 'Forbidden.' }
    }
    return { ok: true, status: 200, body: { revoked: true } }
  }
  if (!isAdmin && row.tenant_id !== tenantId) {
    return { ok: false, status: 403, error: 'Forbidden.' }
  }
  await query(
    `update platform.invoice_shares set revoked_at = now() where token = $1`,
    [token],
  )
  return { ok: true, status: 200, body: { revoked: true } }
}
