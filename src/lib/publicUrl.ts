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

export function subAgentClientFormPath(subAgentId: string): string {
  return `join/${encodeURIComponent(subAgentId)}`
}

export function subAgentClientFormUrl(subAgentId: string): string {
  return absolutePublicUrl(subAgentClientFormPath(subAgentId))
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

/** Public tracking page. Passport prefills the lookup used on `/track`. */
export function clientTrackingPath(passport?: string): string {
  const trimmed = passport?.trim() ?? ''
  if (!trimmed) return 'track'
  return `track?passport=${encodeURIComponent(trimmed)}`
}

export function clientTrackingUrl(passport?: string): string {
  return absolutePublicUrl(clientTrackingPath(passport))
}
