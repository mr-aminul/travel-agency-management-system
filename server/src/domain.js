import { query } from './db.js'

const CLIENTS_KV = 'pd-clients-created'
const TRASH_KV = 'pd-clients-trash'
const CASES_KV = 'pd-cases-created'
const PAYMENTS_KV = 'pd-payments-created'

export const DOMAIN_KV_KEYS = new Set([
  CLIENTS_KV,
  TRASH_KV,
  CASES_KV,
  PAYMENTS_KV,
])

function asArray(value) {
  return Array.isArray(value) ? value : []
}

function itemTenantId(item) {
  if (!item || typeof item !== 'object') return null
  const id = item.tenantId
  return typeof id === 'string' && id.trim() ? id.trim() : null
}

async function readKv(key) {
  const result = await query(
    `select value from platform.kv_store where key = $1`,
    [key],
  )
  return result.rows[0]?.value
}

/** One-time / idempotent copy from legacy KV blobs into domain tables. */
export async function migrateDomainFromKv() {
  const clients = asArray(await readKv(CLIENTS_KV))
  for (const item of clients) {
    const tenantId = itemTenantId(item)
    const id = typeof item?.id === 'string' ? item.id.trim() : ''
    if (!tenantId || !id) continue
    await upsertClient(tenantId, item)
  }

  const trash = asArray(await readKv(TRASH_KV))
  for (const entry of trash) {
    const client = entry?.client
    const tenantId = itemTenantId(client) || itemTenantId(entry)
    const id = typeof client?.id === 'string' ? client.id.trim() : ''
    if (!tenantId || !id) continue
    await upsertTrash(tenantId, entry)
  }

  const cases = asArray(await readKv(CASES_KV))
  for (const item of cases) {
    const tenantId = itemTenantId(item)
    const id = typeof item?.id === 'string' ? item.id.trim() : ''
    if (!tenantId || !id) continue
    await upsertCase(tenantId, item)
  }

  const payments = asArray(await readKv(PAYMENTS_KV))
  for (const item of payments) {
    const tenantId = itemTenantId(item)
    const id = typeof item?.id === 'string' ? item.id.trim() : ''
    if (!tenantId || !id) continue
    await upsertPayment(tenantId, item)
  }
}

export async function upsertClient(tenantId, item) {
  const id = String(item.id).trim()
  const payload = { ...item, tenantId, id }
  await query(
    `insert into platform.clients
       (tenant_id, id, payload, name, phone, passport, archived_at, updated_at)
     values ($1, $2, $3::jsonb, $4, $5, $6, $7, now())
     on conflict (tenant_id, id) do update set
       payload = excluded.payload,
       name = excluded.name,
       phone = excluded.phone,
       passport = excluded.passport,
       archived_at = excluded.archived_at,
       updated_at = now()`,
    [
      tenantId,
      id,
      JSON.stringify(payload),
      payload.name ?? null,
      payload.phone ?? null,
      payload.passport ?? null,
      payload.archivedAt ?? null,
    ],
  )
}

export async function upsertTrash(tenantId, entry) {
  const client = entry?.client
  const id = String(client?.id || entry?.id || '').trim()
  if (!id) return
  const payload = {
    ...entry,
    client: client ? { ...client, tenantId, id } : client,
  }
  await query(
    `insert into platform.client_trash (tenant_id, id, payload, deleted_at)
     values ($1, $2, $3::jsonb, coalesce($4::timestamptz, now()))
     on conflict (tenant_id, id) do update set
       payload = excluded.payload,
       deleted_at = excluded.deleted_at`,
    [
      tenantId,
      id,
      JSON.stringify(payload),
      entry?.deletedAt ?? null,
    ],
  )
}

export async function upsertCase(tenantId, item) {
  const id = String(item.id).trim()
  const payload = { ...item, tenantId, id }
  await query(
    `insert into platform.cases
       (tenant_id, id, client_id, payload, status, updated_at)
     values ($1, $2, $3, $4::jsonb, $5, now())
     on conflict (tenant_id, id) do update set
       client_id = excluded.client_id,
       payload = excluded.payload,
       status = excluded.status,
       updated_at = now()`,
    [
      tenantId,
      id,
      payload.clientId ?? null,
      JSON.stringify(payload),
      payload.status ?? null,
    ],
  )
}

export async function upsertPayment(tenantId, item) {
  const id = String(item.id).trim()
  const payload = { ...item, tenantId, id }
  await query(
    `insert into platform.payments
       (tenant_id, id, client_id, case_id, payload, amount, created_on, updated_at)
     values ($1, $2, $3, $4, $5::jsonb, $6, $7::date, now())
     on conflict (tenant_id, id) do update set
       client_id = excluded.client_id,
       case_id = excluded.case_id,
       payload = excluded.payload,
       amount = excluded.amount,
       created_on = excluded.created_on,
       updated_at = now()`,
    [
      tenantId,
      id,
      payload.clientId ?? null,
      payload.caseId ?? null,
      JSON.stringify(payload),
      Number.isFinite(payload.amount) ? payload.amount : null,
      payload.createdAt ?? null,
    ],
  )
}

export async function listClients(tenantId) {
  const result = await query(
    `select payload from platform.clients
     where tenant_id = $1
     order by updated_at desc`,
    [tenantId],
  )
  return result.rows.map((row) => row.payload)
}

export async function listTrash(tenantId) {
  const result = await query(
    `select payload from platform.client_trash
     where tenant_id = $1
     order by deleted_at desc`,
    [tenantId],
  )
  return result.rows.map((row) => row.payload)
}

export async function listCases(tenantId) {
  const result = await query(
    `select payload from platform.cases
     where tenant_id = $1
     order by updated_at desc`,
    [tenantId],
  )
  return result.rows.map((row) => row.payload)
}

export async function listPayments(tenantId) {
  const result = await query(
    `select payload from platform.payments
     where tenant_id = $1
     order by created_on desc nulls last, updated_at desc`,
    [tenantId],
  )
  return result.rows.map((row) => row.payload)
}

export async function listAllClientsAdmin() {
  const result = await query(
    `select payload from platform.clients order by tenant_id, updated_at desc`,
  )
  return result.rows.map((row) => row.payload)
}

export async function listAllTrashAdmin() {
  const result = await query(
    `select payload from platform.client_trash order by tenant_id, deleted_at desc`,
  )
  return result.rows.map((row) => row.payload)
}

export async function listAllCasesAdmin() {
  const result = await query(
    `select payload from platform.cases order by tenant_id, updated_at desc`,
  )
  return result.rows.map((row) => row.payload)
}

export async function listAllPaymentsAdmin() {
  const result = await query(
    `select payload from platform.payments order by tenant_id, updated_at desc`,
  )
  return result.rows.map((row) => row.payload)
}

/**
 * Replace a tenant's collection with the provided items (row upsert + delete missing).
 * Avoids cross-tenant clobber; within-tenant is a full sync for that collection.
 */
export async function replaceClients(tenantId, items) {
  const list = asArray(items)
  const ids = []
  for (const item of list) {
    const id = typeof item?.id === 'string' ? item.id.trim() : ''
    if (!id) continue
    ids.push(id)
    await upsertClient(tenantId, { ...item, tenantId, id })
  }
  if (ids.length === 0) {
    await query(`delete from platform.clients where tenant_id = $1`, [tenantId])
    return
  }
  await query(
    `delete from platform.clients
     where tenant_id = $1 and not (id = any($2::text[]))`,
    [tenantId, ids],
  )
}

export async function replaceTrash(tenantId, items) {
  const list = asArray(items)
  const ids = []
  for (const entry of list) {
    const id = String(entry?.client?.id || entry?.id || '').trim()
    if (!id) continue
    ids.push(id)
    await upsertTrash(tenantId, entry)
  }
  if (ids.length === 0) {
    await query(`delete from platform.client_trash where tenant_id = $1`, [
      tenantId,
    ])
    return
  }
  await query(
    `delete from platform.client_trash
     where tenant_id = $1 and not (id = any($2::text[]))`,
    [tenantId, ids],
  )
}

export async function replaceCases(tenantId, items) {
  const list = asArray(items)
  const ids = []
  for (const item of list) {
    const id = typeof item?.id === 'string' ? item.id.trim() : ''
    if (!id) continue
    ids.push(id)
    await upsertCase(tenantId, { ...item, tenantId, id })
  }
  if (ids.length === 0) {
    await query(`delete from platform.cases where tenant_id = $1`, [tenantId])
    return
  }
  await query(
    `delete from platform.cases
     where tenant_id = $1 and not (id = any($2::text[]))`,
    [tenantId, ids],
  )
}

export async function replacePayments(tenantId, items) {
  const list = asArray(items)
  const ids = []
  for (const item of list) {
    const id = typeof item?.id === 'string' ? item.id.trim() : ''
    if (!id) continue
    ids.push(id)
    await upsertPayment(tenantId, { ...item, tenantId, id })
  }
  if (ids.length === 0) {
    await query(`delete from platform.payments where tenant_id = $1`, [
      tenantId,
    ])
    return
  }
  await query(
    `delete from platform.payments
     where tenant_id = $1 and not (id = any($2::text[]))`,
    [tenantId, ids],
  )
}

/** Build domain slices for hydrate (agency = one tenant; admin = all). */
export async function domainEntriesForAuth(auth) {
  const isAdmin = auth?.user?.role === 'platform_admin'
  if (isAdmin) {
    return {
      [CLIENTS_KV]: await listAllClientsAdmin(),
      [TRASH_KV]: await listAllTrashAdmin(),
      [CASES_KV]: await listAllCasesAdmin(),
      [PAYMENTS_KV]: await listAllPaymentsAdmin(),
    }
  }
  const tenantId = auth?.tenantId
  if (!tenantId) return {}
  return {
    [CLIENTS_KV]: await listClients(tenantId),
    [TRASH_KV]: await listTrash(tenantId),
    [CASES_KV]: await listCases(tenantId),
    [PAYMENTS_KV]: await listPayments(tenantId),
  }
}

export async function writeDomainKey(key, value, auth) {
  const isAdmin = auth?.user?.role === 'platform_admin'
  if (isAdmin) {
    // Platform admin may write multi-tenant arrays — group by tenantId.
    const list = asArray(value)
    const byTenant = new Map()
    for (const item of list) {
      const tenantId =
        key === TRASH_KV
          ? itemTenantId(item?.client) || itemTenantId(item)
          : itemTenantId(item)
      if (!tenantId) continue
      if (!byTenant.has(tenantId)) byTenant.set(tenantId, [])
      byTenant.get(tenantId).push(item)
    }
    for (const [tenantId, items] of byTenant) {
      if (key === CLIENTS_KV) await replaceClients(tenantId, items)
      else if (key === TRASH_KV) await replaceTrash(tenantId, items)
      else if (key === CASES_KV) await replaceCases(tenantId, items)
      else if (key === PAYMENTS_KV) await replacePayments(tenantId, items)
    }
    return
  }

  const tenantId = auth?.tenantId
  if (!tenantId) throw new Error('Missing tenant')
  if (key === CLIENTS_KV) await replaceClients(tenantId, value)
  else if (key === TRASH_KV) await replaceTrash(tenantId, value)
  else if (key === CASES_KV) await replaceCases(tenantId, value)
  else if (key === PAYMENTS_KV) await replacePayments(tenantId, value)
  else throw new Error(`Unknown domain key ${key}`)
}

/** Public passport lookup against domain table (safe fields only). */
export async function trackByPassport(passport, tenantSlug) {
  const normalized = String(passport || '')
    .trim()
    .toUpperCase()
  if (!normalized || normalized.length < 5) {
    return { ok: false, status: 400, error: 'Enter a valid passport number.' }
  }

  let tenantIdFilter = null
  if (tenantSlug) {
    const tenants = asArray(await readKv('pd-tenants-created'))
    const match = tenants.find(
      (t) =>
        t &&
        typeof t === 'object' &&
        String(t.slug || '').toLowerCase() === String(tenantSlug).toLowerCase(),
    )
    if (match?.id) tenantIdFilter = match.id
  }

  const clientResult = tenantIdFilter
    ? await query(
        `select payload from platform.clients
         where upper(coalesce(passport, '')) = $1 and tenant_id = $2
         limit 1`,
        [normalized, tenantIdFilter],
      )
    : await query(
        `select payload from platform.clients
         where upper(coalesce(passport, '')) = $1
         limit 1`,
        [normalized],
      )

  let client = clientResult.rows[0]?.payload
  if (!client) {
    // Fallback: legacy KV during transition
    const kvClients = asArray(await readKv(CLIENTS_KV))
    client = kvClients.find((c) => {
      if (!c || typeof c !== 'object') return false
      const p = String(c.passport || '')
        .trim()
        .toUpperCase()
      if (p !== normalized) return false
      if (tenantIdFilter && c.tenantId !== tenantIdFilter) return false
      return true
    })
  }
  if (!client) {
    return { ok: false, status: 404, error: 'No file found for that passport.' }
  }

  const casesResult = await query(
    `select payload from platform.cases
     where tenant_id = $1 and client_id = $2`,
    [client.tenantId, client.id],
  )
  let cases = casesResult.rows.map((row) => row.payload)
  if (cases.length === 0) {
    const kvCases = asArray(await readKv(CASES_KV))
    cases = kvCases.filter(
      (item) =>
        item &&
        typeof item === 'object' &&
        item.clientId === client.id &&
        item.tenantId === client.tenantId,
    )
  }

  return {
    ok: true,
    status: 200,
    body: {
      client: {
        name: client.name,
        passport: client.passport,
        services: Array.isArray(client.services) ? client.services : [],
      },
      services: cases.map((item) => ({
        id: item.id,
        type: item.type || item.serviceType || item.service || item.title,
        status: item.status,
        currentStep: item.currentStep || item.currentStepId,
        balance: typeof item.balance === 'number' ? item.balance : undefined,
      })),
    },
  }
}
