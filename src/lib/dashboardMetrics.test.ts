import { describe, expect, it } from 'vitest'
import {
  buildDashboardRows,
  computeDashboardMetrics,
  dashboardFilterTitle,
  filterDashboardRows,
  sortServicesByVolume,
} from '@/lib/dashboardMetrics'
import type { Case } from '@/types/case'
import type { Client } from '@/types/client'
import type { Employee } from '@/types/employee'
import type { Payment } from '@/types/payment'
import type { StatusUpdateRequest } from '@/types/request'
import { TENANT_IDS } from '@/types/tenant'

const clients: Client[] = [
  {
    id: 'c-1',
    tenantId: TENANT_IDS.full,
    name: 'Nadia',
    phone: '01711111111',
    services: ['Work Permit Visa'],
    balance: 10000,
    activeCases: 1,
    status: 'Active',
    idChecked: true,
    createdAt: '2026-01-01',
  },
]

const cases: Case[] = [
  {
    id: 'case-open',
    tenantId: TENANT_IDS.full,
    caseId: 'SR-1',
    clientId: 'c-1',
    clientName: 'Nadia',
    service: 'Work Permit Visa',
    status: 'In-Progress',
    stage: 'Processing',
    currentStepId: 'medical',
    steps: {},
    documents: [
      {
        id: 'passport',
        name: 'Passport',
        detail: 'On file',
        status: 'approved',
        expiry: null,
        required: true,
        icon: 'passport',
      },
      {
        id: 'medical',
        name: 'Medical',
        detail: 'Open',
        status: 'missing',
        expiry: null,
        required: true,
        icon: 'medical',
      },
    ],
    destination: 'Riyadh',
    serviceFee: 15000,
    balance: 10000,
    createdAt: '2026-01-02',
    updatedAt: '2026-02-01',
  },
  {
    id: 'case-done',
    tenantId: TENANT_IDS.full,
    caseId: 'SR-2',
    clientId: 'c-1',
    clientName: 'Nadia',
    service: 'Air Ticket',
    status: 'Completed',
    stage: 'Closed',
    currentStepId: 'ticket',
    steps: {},
    documents: [],
    serviceFee: 0,
    balance: 0,
    createdAt: '2026-01-03',
    updatedAt: '2026-03-01',
  },
]

const payments: Payment[] = [
  {
    id: 'pay-1',
    tenantId: TENANT_IDS.full,
    clientId: 'c-1',
    caseId: 'case-open',
    amount: 5000,
    method: 'Cash',
    createdAt: '2026-02-02',
  },
]

const employees: Employee[] = [
  {
    id: 'EMP-1',
    tenantId: TENANT_IDS.full,
    name: 'Karim',
    phone: '01700000000',
    department: 'HR',
    designation: 'Manager',
    joined: '2022-01-05',
    salary: 45000,
    status: 'Active',
  },
]

const requests: StatusUpdateRequest[] = [
  {
    id: 'req-1',
    tenantId: TENANT_IDS.full,
    partnerId: 'p-1',
    clientId: 'c-1',
    caseId: 'case-open',
    fromStatus: 'Pending',
    toStatus: 'In-Progress',
    requestedAt: '2026-02-03T10:00:00.000Z',
    reviewStatus: 'Pending',
  },
]

describe('dashboard overview table', () => {
  it('counts the same records the metric cards use', () => {
    expect(
      computeDashboardMetrics(clients, cases, payments, employees, requests),
    ).toEqual({
      totalClients: 1,
      openCases: 1,
      completedCases: 1,
      collected: 5000,
      outstanding: 10000,
      employees: 1,
      pendingRequests: 1,
      serviceCounts: { 'Work Permit Visa': 1, 'Air Ticket': 1 },
    })
  })

  it('returns every record in the all-in-one view', () => {
    const rows = buildDashboardRows(
      clients,
      cases,
      payments,
      employees,
      requests,
    )
    expect(filterDashboardRows(rows, 'all')).toHaveLength(6)
    expect(dashboardFilterTitle('all')).toBe('All in one')
  })

  it('filters rows to the clicked metric card', () => {
    const rows = buildDashboardRows(
      clients,
      cases,
      payments,
      employees,
      requests,
    )
    expect(filterDashboardRows(rows, 'clients').map((row) => row.id)).toEqual([
      'client:c-1',
    ])
    expect(
      filterDashboardRows(rows, 'open-services').map((row) => row.id),
    ).toEqual(['service:case-open'])
    expect(
      filterDashboardRows(rows, 'svc:Work Permit Visa').map((row) => row.id),
    ).toEqual(['service:case-open'])
    expect(rows.find((row) => row.id === 'service:case-open')?.checklist).toBe(
      '1/2 docs',
    )
    expect(filterDashboardRows(rows, 'collected').map((row) => row.id)).toEqual([
      'payment:pay-1',
    ])
    expect(
      filterDashboardRows(rows, 'outstanding').map((row) => row.id),
    ).toEqual(['service:case-open'])
    expect(filterDashboardRows(rows, 'employees').map((row) => row.id)).toEqual([
      'employee:EMP-1',
    ])
    expect(
      filterDashboardRows(rows, 'pending-requests').map((row) => row.id),
    ).toEqual(['request:req-1'])
    expect(
      filterDashboardRows(rows, 'completed-services').map((row) => row.id),
    ).toEqual(['service:case-done'])
  })

  it('orders service cards by volume, then name', () => {
    expect(
      sortServicesByVolume(
        [
          { value: 'Tour Package', label: 'Tour Package' },
          { value: 'Work Permit Visa', label: 'Work Permit Visa' },
          { value: 'Student Visa', label: 'Student Visa' },
          { value: 'Air Ticket', label: 'Air Ticket' },
        ],
        { 'Work Permit Visa': 2, 'Student Visa': 1, 'Tour Package': 1, 'Air Ticket': 0 },
      ).map((option) => option.value),
    ).toEqual(['Work Permit Visa', 'Student Visa', 'Tour Package', 'Air Ticket'])
  })
})
