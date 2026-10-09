/** Canonical Platform Admin routes (IA homes). */

export const ADMIN_HOME = '/admin'

export const ADMIN_AGENCIES = '/admin/agencies'

export const ADMIN_PEOPLE = '/admin/people'

export const ADMIN_ACTIVITY = '/admin/activity'

export const ADMIN_PLATFORM = '/admin/platform'

export function adminAgencyPath(
  tenantId: string,
  section:
    | 'overview'
    | 'people'
    | 'product'
    | 'activity' = 'overview',
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
