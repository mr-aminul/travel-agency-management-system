import crypto from 'node:crypto'
import { query } from './db.js'

export async function appendAudit({
  tenantId,
  actorUserId,
  actorEmail,
  action,
  entityType,
  entityId,
  summary,
  meta,
}) {
  const id = `aud-${crypto.randomBytes(8).toString('hex')}`
  await query(
    `insert into platform.audit_log
       (id, tenant_id, actor_user_id, actor_email, action, entity_type, entity_id, summary, meta, created_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, now())`,
    [
      id,
      tenantId || null,
      actorUserId || null,
      actorEmail || null,
      String(action || 'unknown').slice(0, 80),
      entityType ? String(entityType).slice(0, 80) : null,
      entityId ? String(entityId).slice(0, 120) : null,
      summary ? String(summary).slice(0, 500) : null,
      JSON.stringify(meta ?? {}),
    ],
  )
  return id
}

export async function listAudit({ tenantId, isAdmin, limit = 100 }) {
  const capped = Math.min(Math.max(Number(limit) || 100, 1), 500)
  if (isAdmin && !tenantId) {
    const result = await query(
      `select id, tenant_id, actor_user_id, actor_email, action, entity_type, entity_id, summary, meta, created_at
       from platform.audit_log
       order by created_at desc
       limit $1`,
      [capped],
    )
    return result.rows
  }
  const result = await query(
    `select id, tenant_id, actor_user_id, actor_email, action, entity_type, entity_id, summary, meta, created_at
     from platform.audit_log
     where tenant_id = $1
     order by created_at desc
     limit $2`,
    [tenantId, capped],
  )
  return result.rows
}
