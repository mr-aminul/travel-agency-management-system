/** Public asset under Vite `base` (`/` by default; `/platform/` when VITE_BASE_PATH is set for EC2). */
export function publicUrl(path: string): string {
  const base = import.meta.env.BASE_URL || '/'
  const normalized = path.replace(/^\/+/, '')
  return `${base}${normalized}`
}

/** Absolute URL for a public app route, including Vite `base`. */
export function publicPageUrl(path: string): string {
  const origin = typeof window === 'undefined' ? '' : window.location.origin
  const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '')
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${origin}${base}${normalized}`
}

export function partnerIntakePath(partnerId: string): string {
  return `/join/${encodeURIComponent(partnerId)}`
}

export function partnerIntakeUrl(partnerId: string): string {
  return publicPageUrl(partnerIntakePath(partnerId))
}
