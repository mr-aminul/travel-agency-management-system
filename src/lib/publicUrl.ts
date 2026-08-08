/** Public asset under Vite `base` (`/` by default; `/platform/` when VITE_BASE_PATH is set for EC2). */
export function publicUrl(path: string): string {
  const base = import.meta.env.BASE_URL || '/'
  const normalized = path.replace(/^\/+/, '')
  return `${base}${normalized}`
}
