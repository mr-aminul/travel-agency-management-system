import { getCurrentStepLabel } from '@/lib/caseChecklist'
import {
  deriveClientServiceStatus,
  groupCasesByClientId,
} from '@/lib/clientServiceStatus'
import type { Case } from '@/types/case'
import type { Client } from '@/types/client'
import type { Employee } from '@/types/employee'
import type { Payment } from '@/types/payment'
import type { StatusUpdateRequest } from '@/types/request'
import {
  hrEmployeePath,
  workDetailPath,
  workInvoicePath,
} from '@/lib/workPaths'

export type DashboardMetrics = {
  totalClients: number
  openCases: number
  completedCases: number
  collected: number
  outstanding: number
  employees: number
  pendingRequests: number
  serviceCounts: Record<string, number>
}

export type DashboardMetricFilter =
  | 'all'
  | 'clients'
  | 'open-services'
  | 'collected'
  | 'outstanding'
  | 'employees'
  | 'pending-requests'
  | 'completed-services'

export type DashboardFilter = DashboardMetricFilter | `svc:${string}`

export type DashboardRow = {
  id: string
  filters: Exclude<DashboardMetricFilter, 'all'>[]
  serviceName?: string
  typeLabel: string
  name: string
  detail: string
  status: string
  checklist: string
  amount: string
  date: string
  href: string
}

export function serviceDashboardFilter(service: string): `svc:${string}` {
  return `svc:${service}`
}

export function isServiceDashboardFilter(
  filter: DashboardFilter,
): filter is `svc:${string}` {
  return filter.startsWith('svc:')
}

function isOpenCase(item: Case): boolean {
  return item.status !== 'Completed' && item.status !== 'Cancelled'
}

export function computeDashboardMetrics(
  clients: Client[],
  cases: Case[],
  payments: Payment[],
  employees: Employee[],
  requests: StatusUpdateRequest[],
): DashboardMetrics {
  const openCases = cases.filter(isOpenCase)
  const serviceCounts: Record<string, number> = {}
  for (const item of cases) {
    serviceCounts[item.service] = (serviceCounts[item.service] ?? 0) + 1
  }
  return {
    totalClients: clients.length,
    openCases: openCases.length,
    completedCases: cases.filter((item) => item.status === 'Completed').length,
    collected: payments.reduce((sum, item) => sum + item.amount, 0),
    outstanding: openCases.reduce((sum, item) => sum + item.balance, 0),
    employees: employees.length,
    pendingRequests: requests.filter((item) => item.reviewStatus === 'Pending')
      .length,
    serviceCounts,
  }
}

export function formatBdt(amount: number): string {
  return `৳${amount.toLocaleString('en-BD')}`
}

function formatAmount(amount: number): string {
  if (!amount) return '—'
  return formatBdt(amount)
}

function documentChecklistSummary(item: Case): string {
  if (item.documents.length === 0) return 'No checklist'
  const done = item.documents.filter(
    (doc) => doc.status === 'approved' || doc.status === 'under_review',
  ).length
  return `${done}/${item.documents.length} docs`
}

export function buildDashboardRows(
  clients: Client[],
  cases: Case[],
  payments: Payment[],
  employees: Employee[],
  requests: StatusUpdateRequest[],
): DashboardRow[] {
  const clientById = new Map(clients.map((client) => [client.id, client]))
  const caseById = new Map(cases.map((item) => [item.id, item]))
  const casesByClientId = groupCasesByClientId(cases)

  const clientRows: DashboardRow[] = clients.map((client) => ({
    id: `client:${client.id}`,
    filters: ['clients'],
    typeLabel: 'Client',
    name: client.name,
    detail: [client.phone, client.services.join(', ')].filter(Boolean).join(' · '),
    status:
      deriveClientServiceStatus(casesByClientId.get(client.id) ?? []) ?? '—',
    checklist: '—',
    amount: formatAmount(client.balance),
    date: client.createdAt,
    href: `/clients/${client.id}`,
  }))

  const serviceRows: DashboardRow[] = cases.map((item) => {
    const filters: DashboardRow['filters'] = []
    if (isOpenCase(item)) filters.push('open-services')
    if (item.status === 'Completed') filters.push('completed-services')
    if (isOpenCase(item) && item.balance > 0) filters.push('outstanding')
    return {
      id: `service:${item.id}`,
      filters,
      serviceName: item.service,
      typeLabel: 'Service',
      name: item.clientName,
      detail: [item.service, getCurrentStepLabel(item), item.destination]
        .filter(Boolean)
        .join(' · '),
      status: item.status,
      checklist: documentChecklistSummary(item),
      amount: formatAmount(item.balance),
      date: item.updatedAt,
      href: workDetailPath(item),
    }
  })

  const paymentRows: DashboardRow[] = payments.map((payment) => {
    const client = clientById.get(payment.clientId)
    const caseItem = caseById.get(payment.caseId)
    return {
      id: `payment:${payment.id}`,
      filters: ['collected'],
      typeLabel: 'Payment',
      name: client?.name ?? payment.clientId,
      detail: [caseItem?.service, payment.method, payment.note]
        .filter(Boolean)
        .join(' · '),
      status: 'Collected',
      checklist: '—',
      amount: formatBdt(payment.amount),
      date: payment.createdAt,
      href: workInvoicePath({
        id: payment.caseId,
        clientId: payment.clientId,
      }),
    }
  })

  const employeeRows: DashboardRow[] = employees.map((employee) => ({
    id: `employee:${employee.id}`,
    filters: ['employees'],
    typeLabel: 'Employee',
    name: employee.name,
    detail: [employee.designation, employee.department]
      .filter(Boolean)
      .join(' · '),
    status: employee.status,
    checklist: '—',
    amount: formatBdt(employee.salary),
    date: employee.joined,
    href: hrEmployeePath(employee.id),
  }))

  const requestRows: DashboardRow[] = requests.map((request) => {
    const client = clientById.get(request.clientId)
    const caseItem = caseById.get(request.caseId)
    const filters: DashboardRow['filters'] =
      request.reviewStatus === 'Pending' ? ['pending-requests'] : []
    return {
      id: `request:${request.id}`,
      filters,
      typeLabel: 'Request',
      name: client?.name ?? request.clientId,
      detail: `${request.fromStatus} → ${request.toStatus}${
        caseItem ? ` · ${caseItem.service}` : ''
      }`,
      status: request.reviewStatus,
      checklist: '—',
      amount: '—',
      date: request.requestedAt.slice(0, 10),
      href: workDetailPath({
        id: request.caseId,
        clientId: request.clientId,
      }),
    }
  })

  return [
    ...clientRows,
    ...serviceRows,
    ...paymentRows,
    ...employeeRows,
    ...requestRows,
  ]
}

export function filterDashboardRows(
  rows: DashboardRow[],
  filter: DashboardFilter,
): DashboardRow[] {
  if (filter === 'all') return rows
  if (isServiceDashboardFilter(filter)) {
    const service = filter.slice(4)
    return rows.filter((row) => row.serviceName === service)
  }
  return rows.filter((row) => row.filters.includes(filter))
}

export function sortServicesByVolume<T extends { value: string; label: string }>(
  options: T[],
  serviceCounts: Record<string, number>,
): T[] {
  return [...options].sort((left, right) => {
    const byCount =
      (serviceCounts[right.value] ?? 0) - (serviceCounts[left.value] ?? 0)
    if (byCount !== 0) return byCount
    return left.label.localeCompare(right.label)
  })
}

export function dashboardFilterTitle(filter: DashboardFilter): string {
  if (isServiceDashboardFilter(filter)) return filter.slice(4)
  switch (filter) {
    case 'clients':
      return 'Clients'
    case 'open-services':
      return 'Open services'
    case 'collected':
      return 'Collected'
    case 'outstanding':
      return 'Outstanding'
    case 'employees':
      return 'Employees'
    case 'pending-requests':
      return 'Pending requests'
    case 'completed-services':
      return 'Completed services'
    default:
      return 'All in one'
  }
}
