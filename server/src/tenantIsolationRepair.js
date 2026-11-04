import { query } from './db.js'
import {
  repairCrossTenantDataCopies,
  clientIdOwnedByOtherTenant,
  caseIdOwnedByOtherTenant,
  paymentIdOwnedByOtherTenant,
} from './tenantDataRepair.js'

function asArray(value) {
  return Array.isArray(value) ? value : []
}

async function readKv(key) {
  const result = await query(
    `select value from platform.kv_store where key = $1`,
    [key],
  )
  return result.rows[0]?.value
}

/**
 * Clear subAgentId when it points at a sub-agent that is not in this agency.
 */
async function clearOrphanSubAgentLinks() {
  const subAgents = asArray(await readKv('pd-sub-agents-created'))
  const byTenant = new Map()
  for (const row of subAgents) {
    if (!row || typeof row !== 'object') continue
    const tenantId = String(row.tenantId || '').trim()
    const id = String(row.id || '').trim()
    if (!tenantId || !id) continue
    if (!byTenant.has(tenantId)) byTenant.set(tenantId, new Set())
    byTenant.get(tenantId).add(id)
  }

  const clients = await query(
    `select tenant_id, id, payload
     from platform.clients
     where coalesce(payload->>'subAgentId', '') <> ''`,
  )
  let cleared = 0
  for (const row of clients.rows) {
    const payload =
      row.payload && typeof row.payload === 'object' ? { ...row.payload } : {}
    const subAgentId = String(payload.subAgentId || '').trim()
    if (!subAgentId) continue
    const owned = byTenant.get(row.tenant_id)
    if (owned && owned.has(subAgentId)) continue
    delete payload.subAgentId
    payload.tenantId = row.tenant_id
    payload.id = row.id
    await query(
      `update platform.clients
       set payload = $3::jsonb, updated_at = now()
       where tenant_id = $1 and id = $2`,
      [row.tenant_id, row.id, JSON.stringify(payload)],
    )
    cleared += 1
  }
  return cleared
}

/**
 * Repair data isolation after cross-tenant client copies.
 * Safe to run repeatedly (idempotent).
 */
export async function repairTenantIsolation() {
  const copies = await repairCrossTenantDataCopies()
  const clearedOrphanSubAgentLinks = await clearOrphanSubAgentLinks()
  return {
    ok: true,
    removedDuplicateIds: copies.clientIdsRemoved,
    removedDuplicatePhones: copies.phonesRemoved,
    removedDuplicateCases: copies.casesRemoved,
    removedDuplicatePayments: copies.paymentsRemoved,
    clearedOrphanSubAgentLinks,
  }
}

export {
  clientIdOwnedByOtherTenant,
  caseIdOwnedByOtherTenant,
  paymentIdOwnedByOtherTenant,
}
