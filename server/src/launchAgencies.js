/**
 * Promote the three launch agencies (OneTrack, Coastal Leisure, Horizon Manpower)
 * into real platform tenants + domain rows — same path as agencies created via signup.
 * Idempotent: upserts by id; never deletes Ismail or other created tenants.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { query } from './db.js'
import { upsertCase, upsertClient, upsertPayment } from './domain.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

function loadData() {
  const raw = readFileSync(join(__dirname, 'launchAgencyData.json'), 'utf8')
  return JSON.parse(raw)
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
     on conflict (key) do update set
       value = excluded.value,
       updated_at = now()`,
    [key, JSON.stringify(value)],
  )
}

function asArray(value) {
  return Array.isArray(value) ? value : []
}

function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value
    : {}
}

/** Merge items by id into an existing array (incoming wins on conflict). */
function mergeById(existing, incoming) {
  const map = new Map()
  for (const item of asArray(existing)) {
    if (item && typeof item === 'object' && typeof item.id === 'string') {
      map.set(item.id, item)
    }
  }
  for (const item of asArray(incoming)) {
    if (item && typeof item === 'object' && typeof item.id === 'string') {
      map.set(item.id, item)
    }
  }
  return [...map.values()]
}

export async function ensureLaunchAgencies() {
  const data = loadData()
  const launchIds = new Set(data.tenants.map((t) => t.id))

  // 1) Tenants — same store as Ismail (pd-tenants-created)
  const existingTenants = asArray(await readKv('pd-tenants-created'))
  const others = existingTenants.filter(
    (t) => t && typeof t === 'object' && !launchIds.has(t.id),
  )
  const nextTenants = [...data.tenants, ...others]
  await writeKv('pd-tenants-created', nextTenants)

  // 2) Agency profiles (contact / branding)
  const profiles = asObject(await readKv('pd-agency-profiles'))
  await writeKv('pd-agency-profiles', { ...profiles, ...data.profiles })

  // 3) Domain tables — clients / cases / payments
  for (const client of data.clients) {
    await upsertClient(client.tenantId, client)
  }
  for (const item of data.cases) {
    const { stepDetails: _stepDetails, ...payload } = item
    await upsertCase(item.tenantId, payload)
  }
  for (const payment of data.payments) {
    await upsertPayment(payment.tenantId, payment)
  }

  // 4) Supporting KV arrays (employees, sub-agents, members)
  await writeKv(
    'pd-employees-created',
    mergeById(await readKv('pd-employees-created'), data.employees),
  )
  await writeKv(
    'pd-sub-agents-created',
    mergeById(await readKv('pd-sub-agents-created'), data.subAgents),
  )
  await writeKv(
    'pd-tenant-members-created',
    mergeById(await readKv('pd-tenant-members-created'), data.members),
  )

  return {
    tenants: data.tenants.length,
    clients: data.clients.length,
    cases: data.cases.length,
    payments: data.payments.length,
  }
}
