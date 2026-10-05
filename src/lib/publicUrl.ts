import { getTenantById, getTenantBySlug } from '@/lib/tenantsStore'

/** Public asset under Vite `base` (`/` by default; `/platform/` when VITE_BASE_PATH is set for EC2). */
export function publicUrl(path: string): string {
  const base = import.meta.env.BASE_URL || '/'
  const normalized = path.replace(/^\/+/, '')
  return `${base}${normalized}`
}

/** Absolute URL for a public app path, including Vite `base`. */
export function absolutePublicUrl(path: string): string {
  const relative = publicUrl(path)
  if (typeof window === 'undefined') return relative
  return new URL(relative, window.location.origin).toString()
}

export function partnerClientFormPath(partnerId: string): string {
  return `join/${encodeURIComponent(partnerId)}`
}

export function partnerClientFormUrl(partnerId: string): string {
  return absolutePublicUrl(partnerClientFormPath(partnerId))
}

function agencyPublicSlug(tenantIdOrSlug: string): string {
  const tenant =
    getTenantById(tenantIdOrSlug) ?? getTenantBySlug(tenantIdOrSlug)
  return tenant?.slug ?? tenantIdOrSlug
}

/** Public intake with no sub agent — client belongs to the agency tenant. */
export function agencyClientFormPath(tenantIdOrSlug: string): string {
  return `client-registration/${encodeURIComponent(agencyPublicSlug(tenantIdOrSlug))}`
}

export function agencyClientFormUrl(tenantIdOrSlug: string): string {
  return absolutePublicUrl(agencyClientFormPath(tenantIdOrSlug))
}
