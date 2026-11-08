/** Canonical Platform Admin routes (IA homes). */

export const ADMIN_HOME = '/admin'

export const ADMIN_AGENCIES = '/admin/agencies'

export const ADMIN_PEOPLE = '/admin/people'

export const ADMIN_ACTIVITY = '/admin/activity'

/** @deprecated Use ADMIN_PLANS or ADMIN_ADMINS. Kept for legacy redirects. */
export const ADMIN_PLATFORM = '/admin/platform'

export const ADMIN_PLANS = '/admin/plans'

export const ADMIN_ADMINS = '/admin/admins'

export const ADMIN_ANNOUNCEMENTS = '/admin/announcements'

export function adminAgencyPath(
  tenantId: string,
  section:
    | 'all'
    | 'overview'
    | 'people'
    | 'product'
    | 'messaging'
    | 'activity' = 'all',
): string {
  return `${ADMIN_AGENCIES}/${tenantId}/${section}`
}

/** sessionStorage key for Support Mode / View-as exit return. */
export const SUPPORT_RETURN_KEY = 'pd-support-return'

export function setSupportReturnPath(path: string): void {
  try {
    sessionStorage.setItem(SUPPORT_RETURN_KEY, path)
  } catch {
    /* private mode */
  }
}

export function takeSupportReturnPath(fallback = ADMIN_HOME): string {
  try {
    const path = sessionStorage.getItem(SUPPORT_RETURN_KEY)
    sessionStorage.removeItem(SUPPORT_RETURN_KEY)
    if (path && path.startsWith('/admin')) return path
  } catch {
    /* ignore */
  }
  return fallback
}

/**
 * In-app path for Support Mode / View as. Relative only; blocks // and /admin
 * loops.
 */
export function safeSupportNextPath(raw: string | null | undefined): string | null {
  if (!raw) return null
  const path = raw.trim()
  if (!path.startsWith('/') || path.startsWith('//')) return null
  if (path === '/admin' || path.startsWith('/admin/')) return null
  return path
}

/** Admin deep link: start View as on this agency, then open `next`. */
export function adminViewAsAgencyPath(
  tenantId: string,
  nextPath = '/',
): string {
  const params = new URLSearchParams()
  params.set('viewAs', '1')
  const safeNext = safeSupportNextPath(nextPath)
  if (safeNext && safeNext !== '/') {
    params.set('next', safeNext)
  }
  return `${adminAgencyPath(tenantId, 'all')}?${params.toString()}`
}
