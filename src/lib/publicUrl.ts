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
