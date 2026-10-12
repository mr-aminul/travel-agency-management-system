import { serviceToSlug, type ServiceType } from '@/types/case'

type ServiceRecordRef = {
  id: string
  clientId: string
}

export type SettingsSectionParam =
  | 'business'
  | 'clientFields'
  | 'smsTemplates'
  | 'services'
  | 'servicesV2'
  | 'userAccess'
  /** @deprecated Use `userAccess`. Sub-agent controls live there now. */
  | 'subAgentAccess'
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

export type ServicesView = 'list' | 'board'

export function workListPath(service?: ServiceType): string {
  if (!service) return '/services'
  return `/services?service=${serviceToSlug(service)}`
}

/** Kanban view of open service files (same page as the list). */
export function workBoardPath(service?: ServiceType): string {
  if (!service) return '/services?view=board'
  return `/services?view=board&service=${serviceToSlug(service)}`
}

export function parseServicesView(value: string | null): ServicesView {
  return value === 'board' ? 'board' : 'list'
}

export function settingsSectionPath(
  section: SettingsSectionParam = 'business',
): string {
  if (section === 'business') return '/settings'
  // Sub-agent approval settings moved into Access Management.
  if (section === 'subAgentAccess') return '/settings?section=userAccess'
  return `/settings?section=${section}`
}

export function serviceCatalogPath(): string {
  return settingsSectionPath('services')
}

export function serviceCatalogEditorPath(service: ServiceType): string {
  return `/settings/services/${serviceToSlug(service)}`
}

export function serviceCatalogPathV2(): string {
  return settingsSectionPath('servicesV2')
}

export function serviceCatalogEditorPathV2(service: ServiceType): string {
  return `/settings/services-v2/${serviceToSlug(service)}`
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
