/**
 * Tenant-aware KV access for the JSON blob store.
 * Agency users only see/merge their tenant's slice; platform admins see all.
 */

/** Array blobs filtered/merged by item.tenantId */
export const TENANT_ARRAY_KEYS = new Set([
  'pd-clients-created',
  'pd-clients-trash',
  'pd-clients-removed',
  'pd-sub-agents-created',
  'pd-partners-created',
  'pd-cases-created',
  'pd-payments-created',
  'pd-employees-created',
  'pd-attendance-created',
  'pd-requests-created',
  'pd-user-page-access',
  'pd-tenant-members-created',
  'pd-audit-log',
  'pd-commissions-created',
  'pd-commission-settlements',
  'pd-client-messages',
  'pd-service-templates',
  'pd-document-print-templates',
  'pd-client-profile-fields',
  'pd-custom-services',
  'pd-hidden-services',
  'pd-service-icon-overrides',
])

/** Object maps keyed by tenantId — agency gets only own entry */
export const TENANT_MAP_KEYS = new Set([
  'pd-agency-profiles',
  'pd-onboarding-state',
])

/** Platform-admin write only (global IAM / tenancy) */
export const PLATFORM_ADMIN_KV_KEYS = new Set([
  'pd-tenants-created',
  'pd-tenant-entitlements',
  'pd-tenant-names',
  'pd-tenant-statuses',
  'pd-tenant-members-created',
  'pd-provisioned-logins',
])

export function isPlatformAdmin(auth) {
  return auth?.user?.role === 'platform_admin'
}

export function canWriteKvKey(auth, key) {
  if (isPlatformAdmin(auth)) return true
  if (PLATFORM_ADMIN_KV_KEYS.has(key)) return false
  return true
}

function itemTenantId(item) {
  if (!item || typeof item !== 'object') return null
  const id = item.tenantId
  return typeof id === 'string' && id.trim() ? id.trim() : null
}

export function filterValueForTenant(key, value, tenantId) {
  if (TENANT_ARRAY_KEYS.has(key)) {
    if (!Array.isArray(value)) return []
    if (key === 'pd-clients-removed') {
      // removed ids are global strings — leave as-is for owner; admin sees all
      return value
    }
    return value.filter((item) => itemTenantId(item) === tenantId)
  }
  if (TENANT_MAP_KEYS.has(key)) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
    if (Object.prototype.hasOwnProperty.call(value, tenantId)) {
      return { [tenantId]: value[tenantId] }
    }
    return {}
  }
  if (PLATFORM_ADMIN_KV_KEYS.has(key)) {
    return undefined // omit from agency hydrate
  }
  return value
}

export function filterEntriesForAuth(entries, auth) {
  if (isPlatformAdmin(auth)) return entries
  const tenantId = auth?.tenantId
  if (!tenantId) return {}
  const out = {}
  for (const [key, value] of Object.entries(entries)) {
    const filtered = filterValueForTenant(key, value, tenantId)
    if (filtered === undefined) continue
    out[key] = filtered
  }
  return out
}

/**
 * Merge an agency PUT into the stored blob so other tenants are preserved.
 */
export function mergeValueForTenant(key, existing, incoming, tenantId) {
  if (isPlatformAdmin({ user: { role: 'platform_admin' } }) && false) {
    return incoming
  }
  if (TENANT_ARRAY_KEYS.has(key)) {
    const prior = Array.isArray(existing) ? existing : []
    const nextIncoming = Array.isArray(incoming) ? incoming : []
    if (key === 'pd-clients-removed') {
      // Agency-owned id list — replace wholesale for simplicity (ids are opaque)
      return nextIncoming
    }
    const others = prior.filter((item) => itemTenantId(item) !== tenantId)
    const owned = nextIncoming.filter((item) => {
      const tid = itemTenantId(item)
      return tid == null || tid === tenantId
    })
    // Stamp tenantId on owned items missing it
    const stamped = owned.map((item) =>
      item && typeof item === 'object'
        ? { ...item, tenantId: itemTenantId(item) || tenantId }
        : item,
    )
    return [...others, ...stamped]
  }
  if (TENANT_MAP_KEYS.has(key)) {
    const prior =
      existing && typeof existing === 'object' && !Array.isArray(existing)
        ? { ...existing }
        : {}
    const slice =
      incoming && typeof incoming === 'object' && !Array.isArray(incoming)
        ? incoming[tenantId] !== undefined
          ? incoming[tenantId]
          : incoming
        : incoming
    prior[tenantId] = slice
    return prior
  }
  return incoming
}

export function mergeForWrite(key, existing, incoming, auth) {
  if (isPlatformAdmin(auth)) return incoming
  const tenantId = auth?.tenantId
  if (!tenantId) throw new Error('Missing tenant')
  return mergeValueForTenant(key, existing, incoming, tenantId)
}
