import { query } from './db.js'

function asArray(value) {
  return Array.isArray(value) ? value : []
}

function randomSubAgentId(existing) {
  const used = new Set(existing.map((id) => String(id || '').trim()).filter(Boolean))
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const id = `AGT-${crypto.randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()}`
    if (!used.has(id)) return id
  }
  return `AGT-${Date.now().toString(36).toUpperCase()}`
}

async function readKv(key) {
  const result = await query(
    `select value from platform.kv_store where key = $1`,
    [key],
  )
  return result.rows[0]?.value
}

async function writeKv(key, value) {
  await query(
    `insert into platform.kv_store (key, value, updated_at)
     values ($1, $2::jsonb, now())
     on conflict (key) do update set value = excluded.value, updated_at = now()`,
    [key, JSON.stringify(value)],
  )
}

async function remapClientPayloads(tenantId, oldId, newId) {
  const result = await query(
    `select id, payload from platform.clients
     where tenant_id = $1
       and coalesce(payload->>'subAgentId', '') = $2`,
    [tenantId, oldId],
  )
  for (const row of result.rows) {
    const payload = {
      ...(row.payload && typeof row.payload === 'object' ? row.payload : {}),
      tenantId,
      id: row.id,
      subAgentId: newId,
    }
    await query(
      `update platform.clients
       set payload = $3::jsonb, updated_at = now()
       where tenant_id = $1 and id = $2`,
      [tenantId, row.id, JSON.stringify(payload)],
    )
  }
}

async function remapUserSubAgentIds(tenantId, oldId, newId) {
  await query(
    `update platform.users
     set sub_agent_id = $3
     where tenant_id = $1 and sub_agent_id = $2`,
    [tenantId, oldId, newId],
  )
}

async function remapKvArrayField(key, tenantId, oldId, newId, field = 'subAgentId') {
  const list = asArray(await readKv(key))
  let changed = false
  const next = list.map((row) => {
    if (!row || typeof row !== 'object') return row
    if (String(row.tenantId || '') !== tenantId) return row
    if (String(row[field] || '') !== oldId) return row
    changed = true
    return { ...row, [field]: newId }
  })
  if (changed) await writeKv(key, next)
}

/**
 * Sub-agent ids must be unique across every agency. Older AGT-T0001 style
 * collided when each agency only saw its own list. Rename duplicates and
 * rewrite client / login / commission refs inside that tenant.
 */
export async function ensureSubAgentIdsGloballyUnique() {
  const list = asArray(await readKv('pd-sub-agents-created'))
  const seen = new Map()
  const remaps = []
  const nextList = list.map((row) => {
    if (!row || typeof row !== 'object') return row
    const id = String(row.id || '').trim()
    const tenantId = String(row.tenantId || '').trim()
    if (!id || !tenantId) return row
    if (!seen.has(id)) {
      seen.set(id, tenantId)
      return row
    }
    const existing = Array.from(seen.keys())
    const newId = randomSubAgentId([...existing, ...remaps.map((item) => item.newId)])
    seen.set(newId, tenantId)
    remaps.push({ tenantId, oldId: id, newId })
    return { ...row, id: newId }
  })

  if (remaps.length === 0) return { remaps: [] }

  await writeKv('pd-sub-agents-created', nextList)

  for (const remap of remaps) {
    await remapClientPayloads(remap.tenantId, remap.oldId, remap.newId)
    await remapUserSubAgentIds(remap.tenantId, remap.oldId, remap.newId)
    await remapKvArrayField('pd-sub-agent-logins', remap.tenantId, remap.oldId, remap.newId)
    await remapKvArrayField(
      'pd-commissions-created',
      remap.tenantId,
      remap.oldId,
      remap.newId,
    )
    await remapKvArrayField(
      'pd-commission-settlements',
      remap.tenantId,
      remap.oldId,
      remap.newId,
    )
    await remapKvArrayField(
      'pd-sub-agent-pending-changes',
      remap.tenantId,
      remap.oldId,
      remap.newId,
    )
  }

  return { remaps }
}

/** Drop rows that belong to another tenant before an agency write. */
export function filterDomainItemsForTenant(key, value, tenantId) {
  const list = asArray(value)
  if (key === 'pd-clients-trash') {
    return list.filter((entry) => {
      if (!entry || typeof entry !== 'object') return false
      const client = entry.client
      const tid =
        (client && typeof client === 'object' && typeof client.tenantId === 'string'
          ? client.tenantId.trim()
          : '') ||
        (typeof entry.tenantId === 'string' ? entry.tenantId.trim() : '')
      return tid === tenantId
    })
  }
  return list.filter((item) => {
    if (!item || typeof item !== 'object') return false
    const tid = typeof item.tenantId === 'string' ? item.tenantId.trim() : ''
    return tid === tenantId
  })
}
