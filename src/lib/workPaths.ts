import type { ServiceType } from '@/types/case'
import { serviceToSlug } from '@/types/case'

type ServiceRecordRef = {
  id: string
  clientId: string
}

export type SettingsSectionParam =
  | 'business'
  | 'clientFields'
  | 'services'
  | 'userAccess'
  | 'appearance'

export function hrEmployeesPath(): string {
  return '/hr/employees'
}

export function hrAttendancePath(): string {
  return '/hr/attendance'
}

export function hrPayrollPath(): string {
  return '/hr/payroll'
}

/** Employee profile. Optional tab keeps Attendance, Leave, or Payroll in view. */
export function hrEmployeePath(employeeId: string, tab?: string): string {
  const path = `/hr/employees/${encodeURIComponent(employeeId)}`
  if (!tab || tab === 'attendance') return path
  return `${path}?tab=${encodeURIComponent(tab)}`
}

export function workListPath(service?: ServiceType): string {
  if (!service) return '/services'
  return `/services?service=${serviceToSlug(service)}`
}

export function settingsSectionPath(
  section: SettingsSectionParam = 'business',
): string {
  if (section === 'business') return '/settings'
  return `/settings?section=${section}`
}

export function serviceCatalogPath(): string {
  return settingsSectionPath('services')
}

export function serviceCatalogEditorPath(service: ServiceType): string {
  return `/settings/services/${serviceToSlug(service)}`
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

export function workInvoicePath(item: ServiceRecordRef): string {
  return `${workDetailPath(item)}/invoice`
}
