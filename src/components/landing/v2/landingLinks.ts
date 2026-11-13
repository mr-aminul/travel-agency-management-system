import { appUrl } from '@/lib/siteOrigins'

export function subscribeUrl(planId = 'growth'): string {
  return appUrl(`/subscribe?plan=${encodeURIComponent(planId)}`)
}

export function formatTaka(amount: number): string {
  return `৳${amount.toLocaleString('en-IN')}`
}

/** Host + path as people would type it, e.g. `app.inventivelab.bd/track`. */
export function displayAppUrl(path: string): string {
  const url = new URL(appUrl(path), window.location.href)
  return `${url.host}${url.pathname === '/' ? '' : url.pathname}`
}
