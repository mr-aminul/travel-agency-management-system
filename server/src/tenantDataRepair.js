import { query } from './db.js'

function createdStamp(payload, fallback) {
  const raw =
    (payload && typeof payload === 'object' && payload.createdAt) || fallback
  const t = raw ? new Date(raw).getTime() : Number.NaN
  return Number.isFinite(t) ? t : Number.MAX_SAFE_INTEGER
}

function phoneDigits(payload) {
  const phone =
    payload && typeof payload === 'object' ? String(payload.phone || '') : ''
  return phone.replace(/\D/g, '')
}

async function deleteClientBundle(tenantId, clientId) {
  await query(
    `delete from platform.payments where tenant_id = $1 and client_id = $2`,
    [tenantId, clientId],
  )
  await query(
    `delete from platform.cases where tenant_id = $1 and client_id = $2`,
    [tenantId, clientId],
  )
  await query(
    `delete from platform.client_trash where tenant_id = $1 and id = $2`,
    [tenantId, clientId],
  )
  await query(
    `delete from platform.clients where tenant_id = $1 and id = $2`,
    [tenantId, clientId],
  )
}

/**
 * Shadow copies from view-as / stale admin cache reuse the same client id
 * across tenants. Keep the oldest row; remove the rest + their cases/payments.
 */
async function repairDuplicateClientIds() {
  const dupes = await query(
    `select id
     from platform.clients
     group by id
     having count(distinct tenant_id) > 1`,
  )
  let removed = 0
  for (const row of dupes.rows) {
    const id = String(row.id || '').trim()
    if (!id) continue
    const copies = await query(
      `select tenant_id, payload, updated_at
       from platform.clients
       where id = $1`,
      [id],
    )
    const ranked = copies.rows
      .map((item) => ({
        tenantId: item.tenant_id,
        payload: item.payload,
        score: createdStamp(item.payload, item.updated_at),
      }))
      .sort((a, b) => a.score - b.score)
    const keep = ranked[0]
    for (const copy of ranked.slice(1)) {
      if (copy.tenantId === keep.tenantId) continue
      await deleteClientBundle(copy.tenantId, id)
      removed += 1
    }
  }
  return removed
}

/**
 * Same phone in two agencies usually means intake/id collision copy.
 * Keep the oldest; delete newer copies in other tenants.
 */
async function repairDuplicatePhonesAcrossTenants() {
  const rows = await query(
    `select tenant_id, id, payload, updated_at,
            regexp_replace(coalesce(phone, payload->>'phone', ''), '\\D', '', 'g') as digits
     from platform.clients
     where coalesce(phone, payload->>'phone', '') <> ''`,
  )
  const byPhone = new Map()
  for (const row of rows.rows) {
    const digits = String(row.digits || '').trim()
    if (digits.length < 8) continue
    const list = byPhone.get(digits) ?? []
    list.push({
      tenantId: row.tenant_id,
      id: row.id,
      payload: row.payload,
      score: createdStamp(row.payload, row.updated_at),
    })
    byPhone.set(digits, list)
  }

  let removed = 0
  for (const list of byPhone.values()) {
    const tenants = new Set(list.map((item) => item.tenantId))
    if (tenants.size < 2) continue
    const ranked = [...list].sort((a, b) => a.score - b.score)
    const keep = ranked[0]
    const seen = new Set([`${keep.tenantId}:${keep.id}`])
    for (const copy of ranked.slice(1)) {
      const key = `${copy.tenantId}:${copy.id}`
      if (seen.has(key)) continue
      seen.add(key)
      // Same tenant duplicate phones are a different problem — leave them.
      if (copy.tenantId === keep.tenantId) continue
      await deleteClientBundle(copy.tenantId, copy.id)
      removed += 1
    }
  }
  return removed
}

async function repairDuplicateCaseIds() {
  const dupes = await query(
    `select id
     from platform.cases
     group by id
     having count(distinct tenant_id) > 1`,
  )
  let removed = 0
  for (const row of dupes.rows) {
    const id = String(row.id || '').trim()
    if (!id) continue
    const copies = await query(
      `select tenant_id, payload, updated_at
       from platform.cases where id = $1`,
      [id],
    )
    const ranked = copies.rows
      .map((item) => ({
        tenantId: item.tenant_id,
        score: createdStamp(item.payload, item.updated_at),
      }))
      .sort((a, b) => a.score - b.score)
    for (const copy of ranked.slice(1)) {
      await query(
        `delete from platform.payments where tenant_id = $1 and case_id = $2`,
        [copy.tenantId, id],
      )
      await query(
        `delete from platform.cases where tenant_id = $1 and id = $2`,
        [copy.tenantId, id],
      )
      removed += 1
    }
  }
  return removed
}

async function repairDuplicatePaymentIds() {
  const dupes = await query(
    `select id
     from platform.payments
     group by id
     having count(distinct tenant_id) > 1`,
  )
  let removed = 0
  for (const row of dupes.rows) {
    const id = String(row.id || '').trim()
    if (!id) continue
    const copies = await query(
      `select tenant_id, payload, updated_at
       from platform.payments where id = $1`,
      [id],
    )
    const ranked = copies.rows
      .map((item) => ({
        tenantId: item.tenant_id,
        score: createdStamp(item.payload, item.updated_at),
      }))
      .sort((a, b) => a.score - b.score)
    for (const copy of ranked.slice(1)) {
      await query(
        `delete from platform.payments where tenant_id = $1 and id = $2`,
        [copy.tenantId, id],
      )
      removed += 1
    }
  }
  return removed
}

/**
 * Remove cross-agency shadow copies created by view-as / colliding ids.
 * Safe to run repeatedly (idempotent).
 */
export async function repairCrossTenantDataCopies() {
  const clientIdsRemoved = await repairDuplicateClientIds()
  const phonesRemoved = await repairDuplicatePhonesAcrossTenants()
  const casesRemoved = await repairDuplicateCaseIds()
  const paymentsRemoved = await repairDuplicatePaymentIds()
  return {
    clientIdsRemoved,
    phonesRemoved,
    casesRemoved,
    paymentsRemoved,
    total:
      clientIdsRemoved + phonesRemoved + casesRemoved + paymentsRemoved,
  }
}

/** True when this client id already belongs to a different agency. */
export async function clientIdOwnedByOtherTenant(clientId, tenantId) {
  const id = String(clientId || '').trim()
  const tid = String(tenantId || '').trim()
  if (!id || !tid) return false
  const result = await query(
    `select 1 from platform.clients
     where id = $1 and tenant_id <> $2
     limit 1`,
    [id, tid],
  )
  return result.rowCount > 0
}

export async function caseIdOwnedByOtherTenant(caseId, tenantId) {
  const id = String(caseId || '').trim()
  const tid = String(tenantId || '').trim()
  if (!id || !tid) return false
  const result = await query(
    `select 1 from platform.cases
     where id = $1 and tenant_id <> $2
     limit 1`,
    [id, tid],
  )
  return result.rowCount > 0
}

export async function paymentIdOwnedByOtherTenant(paymentId, tenantId) {
  const id = String(paymentId || '').trim()
  const tid = String(tenantId || '').trim()
  if (!id || !tid) return false
  const result = await query(
    `select 1 from platform.payments
     where id = $1 and tenant_id <> $2
     limit 1`,
    [id, tid],
  )
  return result.rowCount > 0
}

// silence unused in case callers only need repair
void phoneDigits
