import { query } from '../db.js'

/**
 * Mirror plan modules into KV so existing SPA module gating keeps working.
 */
export async function syncTenantModules(tenantId, modules) {
  const id = String(tenantId ?? '').trim()
  if (!id) return
  const nextModules = Array.isArray(modules) ? [...modules] : []

  const entitlementsResult = await query(
    `select value from platform.kv_store where key = 'pd-tenant-entitlements'`,
  )
  const entitlements =
    entitlementsResult.rows[0]?.value &&
    typeof entitlementsResult.rows[0].value === 'object' &&
    !Array.isArray(entitlementsResult.rows[0].value)
      ? { ...entitlementsResult.rows[0].value }
      : {}
  entitlements[id] = nextModules
  await query(
    `insert into platform.kv_store (key, value, updated_at)
     values ('pd-tenant-entitlements', $1::jsonb, now())
     on conflict (key) do update
       set value = excluded.value, updated_at = now()`,
    [JSON.stringify(entitlements)],
  )

  const createdResult = await query(
    `select value from platform.kv_store where key = 'pd-tenants-created'`,
  )
  const created = Array.isArray(createdResult.rows[0]?.value)
    ? createdResult.rows[0].value
    : []
  let changed = false
  const nextCreated = created.map((tenant) => {
    if (!tenant || typeof tenant !== 'object' || tenant.id !== id) return tenant
    changed = true
    return { ...tenant, enabledModules: nextModules }
  })
  if (changed) {
    await query(
      `insert into platform.kv_store (key, value, updated_at)
       values ('pd-tenants-created', $1::jsonb, now())
       on conflict (key) do update
         set value = excluded.value, updated_at = now()`,
      [JSON.stringify(nextCreated)],
    )
  }

  const statusesResult = await query(
    `select value from platform.kv_store where key = 'pd-tenant-statuses'`,
  )
  return { entitlements, statuses: statusesResult.rows[0]?.value }
}

export async function syncTenantStatus(tenantId, status) {
  const id = String(tenantId ?? '').trim()
  if (!id || !status) return

  const statusesResult = await query(
    `select value from platform.kv_store where key = 'pd-tenant-statuses'`,
  )
  const statuses =
    statusesResult.rows[0]?.value &&
    typeof statusesResult.rows[0].value === 'object' &&
    !Array.isArray(statusesResult.rows[0].value)
      ? { ...statusesResult.rows[0].value }
      : {}
  statuses[id] = status
  await query(
    `insert into platform.kv_store (key, value, updated_at)
     values ('pd-tenant-statuses', $1::jsonb, now())
     on conflict (key) do update
       set value = excluded.value, updated_at = now()`,
    [JSON.stringify(statuses)],
  )

  const createdResult = await query(
    `select value from platform.kv_store where key = 'pd-tenants-created'`,
  )
  const created = Array.isArray(createdResult.rows[0]?.value)
    ? createdResult.rows[0].value
    : []
  let changed = false
  const nextCreated = created.map((tenant) => {
    if (!tenant || typeof tenant !== 'object' || tenant.id !== id) return tenant
    changed = true
    return { ...tenant, status }
  })
  if (changed) {
    await query(
      `insert into platform.kv_store (key, value, updated_at)
       values ('pd-tenants-created', $1::jsonb, now())
       on conflict (key) do update
         set value = excluded.value, updated_at = now()`,
      [JSON.stringify(nextCreated)],
    )
  }
}
