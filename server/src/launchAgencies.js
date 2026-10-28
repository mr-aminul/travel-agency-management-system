/**
 * Launch-agency maintenance on API boot.
 * Retired demo agencies are stripped from the tenant catalog so they do not
 * reappear after an admin cleanup. Live customer tenants are left untouched.
 */

/** Retired launch / demo tenant ids — removed from pd-tenants-created on boot. */
const RETIRED_LAUNCH_TENANT_IDS = new Set([
  'tenant-leisure',
  'tenant-manpower',
  'tenant-full', // ABC Travel Agency demo
])

import { query } from './db.js'

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

function itemTenantId(item) {
  if (!item || typeof item !== 'object') return null
  if (typeof item.tenantId === 'string' && item.tenantId.trim()) {
    return item.tenantId.trim()
  }
  // Tenant catalog rows use `id`
  if (typeof item.id === 'string' && item.id.trim()) return item.id.trim()
  return null
}

function stripRetiredFromArray(value) {
  return asArray(value).filter((item) => {
    const tenantId = itemTenantId(item)
    return !tenantId || !RETIRED_LAUNCH_TENANT_IDS.has(tenantId)
  })
}

function stripRetiredFromMap(value) {
  const next = { ...asObject(value) }
  for (const id of RETIRED_LAUNCH_TENANT_IDS) delete next[id]
  return next
}

export async function ensureLaunchAgencies() {
  const existingTenants = asArray(await readKv('pd-tenants-created'))
  const nextTenants = existingTenants.filter(
    (t) =>
      t &&
      typeof t === 'object' &&
      typeof t.id === 'string' &&
      !RETIRED_LAUNCH_TENANT_IDS.has(t.id),
  )
  await writeKv('pd-tenants-created', nextTenants)

  await writeKv(
    'pd-agency-profiles',
    stripRetiredFromMap(await readKv('pd-agency-profiles')),
  )
  await writeKv(
    'pd-agency-appearance',
    stripRetiredFromMap(await readKv('pd-agency-appearance')),
  )
  await writeKv(
    'pd-onboarding-state',
    stripRetiredFromMap(await readKv('pd-onboarding-state')),
  )
  await writeKv(
    'pd-tenant-entitlements',
    stripRetiredFromMap(await readKv('pd-tenant-entitlements')),
  )
  await writeKv(
    'pd-tenant-names',
    stripRetiredFromMap(await readKv('pd-tenant-names')),
  )
  await writeKv(
    'pd-tenant-statuses',
    stripRetiredFromMap(await readKv('pd-tenant-statuses')),
  )

  for (const key of [
    'pd-employees-created',
    'pd-sub-agents-created',
    'pd-tenant-members-created',
    'pd-clients-created',
    'pd-cases-created',
    'pd-payments-created',
  ]) {
    const current = await readKv(key)
    if (current === undefined) continue
    await writeKv(key, stripRetiredFromArray(current))
  }

  return {
    tenants: nextTenants.length,
    retired: [...RETIRED_LAUNCH_TENANT_IDS],
  }
}
