import type { ServiceType } from '@/types/case'
import { serviceToSlug } from '@/types/case'

type ServiceRecordRef = {
  id: string
  clientId: string
}

export function workListPath(service?: ServiceType): string {
  if (!service) return '/services'
  return `/services?service=${serviceToSlug(service)}`
}

/** Client profile. Optional tab keeps the same person in view. */
export function clientPath(clientId: string, tab?: string): string {
  if (!tab || tab === 'overview') return `/clients/${clientId}`
  return `/clients/${clientId}?tab=${encodeURIComponent(tab)}`
}

/** Service file nested under the client who owns it. */
export function workDetailPath(item: ServiceRecordRef): string {
  return `/clients/${item.clientId}/services/${item.id}`
}

export function workInvoicePath(
  item: ServiceRecordRef,
  paymentId?: string,
): string {
  const path = `${workDetailPath(item)}/invoice`
  if (!paymentId) return path
  return `${path}?payment=${encodeURIComponent(paymentId)}`
}
