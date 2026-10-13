const DEFAULT_APP_ORIGIN = 'https://app.inventivelab.bd'
const DEFAULT_MARKETING_ORIGIN = 'https://onetrack.inventivelab.bd'

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '')
}

/** Product SPA origin (login, track, authenticated app). */
export function appOrigin(): string {
  const fromEnv = String(import.meta.env.VITE_APP_ORIGIN || '').trim()
  return stripTrailingSlash(fromEnv || DEFAULT_APP_ORIGIN)
}

/** Public marketing site origin. */
export function marketingOrigin(): string {
  const fromEnv = String(import.meta.env.VITE_MARKETING_ORIGIN || '').trim()
  return stripTrailingSlash(fromEnv || DEFAULT_MARKETING_ORIGIN)
}

function hostnameOf(origin: string): string | null {
  try {
    return new URL(origin).hostname
  } catch {
    return null
  }
}

function isLocalHostname(host: string): boolean {
  return host === 'localhost' || host === '127.0.0.1'
}

/** Absolute URL on the app host (relative when already on that host / localhost). */
export function appUrl(path = '/'): string {
  const normalized = path.startsWith('/') ? path : `/${path}`
  if (typeof window !== 'undefined') {
    const host = window.location.hostname
    if (isLocalHostname(host)) return normalized
    const appHost = hostnameOf(appOrigin())
    if (appHost && host === appHost) return normalized
  }
  return `${appOrigin()}${normalized}`
}

/** Home URL for the public marketing site (relative on marketing / localhost). */
export function marketingHomeUrl(): string {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname
    if (isLocalHostname(host)) return '/'
    const marketingHost = hostnameOf(marketingOrigin())
    if (marketingHost && host === marketingHost) return '/'
  }
  return `${marketingOrigin()}/`
}

/**
 * True when this bundle should render the marketing landing.
 * Localhost is always the app unless `VITE_FORCE_MARKETING=1`.
 */
export function isMarketingHost(): boolean {
  if (String(import.meta.env.VITE_FORCE_MARKETING || '').trim() === '1') {
    return true
  }
  if (typeof window === 'undefined') return false
  const host = window.location.hostname
  if (host === 'localhost' || host === '127.0.0.1') return false
  const marketingHost = hostnameOf(marketingOrigin())
  return Boolean(marketingHost && host === marketingHost)
}
