import { describe, expect, it } from 'vitest'
import {
  buildExecutivePulse,
  casesByStatus,
  clientsBySubAgent,
  collectionsByMonth,
  computeOwnerKpis,
  formatCollectionRate,
  formatCompactBdt,
  formatDeltaPercent,
  formatSharePercent,
  needsAttention,
  pipelineFunnel,
  recentPayments,
  receivablesAging,
  revenueByService,
  serviceMix,
  topOutstanding,
  toShareSlices,
  upcomingDepartures,
  workloadByAssignee,
} from '@/lib/dashboardInsights'
import type { Case } from '@/types/case'
import type { Client } from '@/types/client'
import type { Employee } from '@/types/employee'
import type { SubAgent } from '@/types/subAgent'
import type { Payment } from '@/types/payment'
import type { StatusUpdateRequest } from '@/types/request'
import { TENANT_IDS } from '@/types/tenant'

const asOf = new Date(2026, 9, 5)

const clients: Client[] = [
  {
    id: 'c-1',
    tenantId: TENANT_IDS.full,
    name: 'Nadia',
    phone: '01711111111',
    subAgentId: 'p-1',
    services: ['Work Permit Visa'],
    balance: 10000,
    activeCases: 1,
    idChecked: true,
    createdAt: '2026-01-01',
  },
  {
    id: 'c-2',
    tenantId: TENANT_IDS.full,
    name: 'Rafi',
    phone: '01722222222',
    subAgentId: 'p-1',
    services: ['Student Visa'],
    balance: 0,
    activeCases: 0,
    idChecked: false,
    createdAt: '2026-02-01',
  },
  {
    id: 'c-3',
    tenantId: TENANT_IDS.full,
    name: 'Lina',
    phone: '01733333333',
    subAgentId: 'p-2',
    services: ['Tour Package'],
    balance: 0,
    activeCases: 0,
    idChecked: true,
    createdAt: '2026-03-01',
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
    assignedTo: 'emp-1',
    departureDate: '2026-11-12',
    createdAt: '2026-01-02',
    updatedAt: '2026-02-01',
  },
  {
    id: 'case-hold',
    tenantId: TENANT_IDS.full,
    caseId: 'SR-3',
    clientId: 'c-2',
    clientName: 'Rafi',
    service: 'Student Visa',
    status: 'On-Hold',
    stage: 'Documents',
    currentStepId: 'docs',
    steps: {},
    documents: [
      {
        id: 'financial',
        name: 'Bank statement',
        detail: 'Open',
        status: 'missing',
        expiry: null,
        required: true,
        icon: 'financial',
      },
    ],
    destination: 'Toronto',
    serviceFee: 80000,
    balance: 40000,
    assignedTo: 'emp-1',
    createdAt: '2026-04-01',
    updatedAt: '2026-08-01',
  },
  {
    id: 'case-done',
    tenantId: TENANT_IDS.full,
    caseId: 'SR-2',
    clientId: 'c-3',
    clientName: 'Lina',
    service: 'Work Permit Visa',
    status: 'Completed',
    stage: 'Closed',
    currentStepId: 'ticket',
    steps: {},
    documents: [],
    serviceFee: 50000,
    balance: 0,
    departureDate: '2026-01-10',
    createdAt: '2026-01-03',
    updatedAt: '2026-03-01',
  },
]

const payments: Payment[] = [
  {
    id: 'pay-old',
    tenantId: TENANT_IDS.full,
    clientId: 'c-3',
    caseId: 'case-done',
    amount: 50000,
    method: 'Bank',
    createdAt: '2026-04-15',
  },
  {
    id: 'pay-recent',
    tenantId: TENANT_IDS.full,
    clientId: 'c-1',
    caseId: 'case-open',
    amount: 5000,
    method: 'Cash',
    createdAt: '2026-09-20',
  },
]

const requests: StatusUpdateRequest[] = [
  {
    id: 'req-1',
    tenantId: TENANT_IDS.full,
    subAgentId: 'p-1',
    clientId: 'c-1',
    caseId: 'case-open',
    fromStatus: 'Pending',
    toStatus: 'In-Progress',
    requestedAt: '2026-10-01T10:00:00.000Z',
    reviewStatus: 'Pending',
  },
  {
    id: 'req-old',
    tenantId: TENANT_IDS.full,
    subAgentId: 'p-1',
    clientId: 'c-1',
    caseId: 'case-open',
    fromStatus: 'In-Progress',
    toStatus: 'Completed',
    requestedAt: '2026-08-01T10:00:00.000Z',
    reviewStatus: 'Approved',
  },
]

const subAgents: SubAgent[] = [
  {
    id: 'p-1',
    tenantId: TENANT_IDS.full,
    name: 'Gulf Link',
    phone: '01800000000',
    status: 'Active',
    createdAt: '2025-01-01',
  },
  {
    id: 'p-2',
    tenantId: TENANT_IDS.full,
    name: 'City Desk',
    phone: '01811111111',
    status: 'Active',
    createdAt: '2025-02-01',
  },
]

const employees: Employee[] = [
  {
    id: 'emp-1',
    tenantId: TENANT_IDS.full,
    name: 'Ayesha',
    phone: '01900000000',
    department: 'Ops',
    designation: 'Officer',
    joined: '2024-01-01',
    salary: 40000,
    status: 'Active',
  },
]

describe('owner dashboard insights', () => {
  it('computes KPIs from money, pipeline, and active clients', () => {
    const kpis = computeOwnerKpis(clients, cases, payments, requests, asOf)
    expect(kpis).toEqual({
      collected: 55000,
      collectedLast30Days: 5000,
      collectedPrev30Days: 0,
      collectedMomChange: null,
      outstanding: 50000,
      collectionRate: 55000 / 105000,
      bookedRevenue: 145000,
      averageTicket: 145000 / 3,
      openCases: 2,
      completedCases: 1,
      completionRate: 1 / 3,
      holdRate: 0.5,
      pendingRequests: 1,
      activeClients: 1,
      atRiskCount: 2,
      staleOpenCases: 2,
    })
    expect(formatCollectionRate(kpis.collectionRate)).toBe('52%')
    expect(formatCompactBdt(145000)).toBe('৳1.5L')
    expect(formatDeltaPercent(0.2)).toBe('+20%')
  })

  it('buckets collections into the last six months including the current month', () => {
    expect(collectionsByMonth(payments, 6, asOf).map((bucket) => bucket)).toEqual(
      [
        { key: '2026-05', label: 'May', amount: 0, change: null },
        { key: '2026-06', label: 'Jun', amount: 0, change: 0 },
        { key: '2026-07', label: 'Jul', amount: 0, change: 0 },
        { key: '2026-08', label: 'Aug', amount: 0, change: 0 },
        { key: '2026-09', label: 'Sep', amount: 5000, change: null },
        { key: '2026-10', label: 'Oct', amount: 0, change: -1 },
      ],
    )
  })

  it('ranks pipeline status, funnel, service mix, and revenue', () => {
    expect(casesByStatus(cases).map((row) => [row.label, row.count])).toEqual([
      ['In-Progress', 1],
      ['On-Hold', 1],
      ['Completed', 1],
    ])
    expect(pipelineFunnel(cases).map((row) => [row.label, row.count])).toEqual([
      ['In-Progress', 1],
      ['On-Hold', 1],
      ['Completed', 1],
    ])
    expect(serviceMix(cases).map((row) => [row.label, row.count])).toEqual([
      ['Work Permit Visa', 2],
      ['Student Visa', 1],
    ])
    expect(
      revenueByService(cases).map((row) => [row.label, row.amount]),
    ).toEqual([
      ['Student Visa', 80000],
      ['Work Permit Visa', 65000],
    ])
    expect(
      toShareSlices(serviceMix(cases)).map((row) => [
        row.label,
        formatSharePercent(row.percent),
      ]),
    ).toEqual([
      ['Work Permit Visa', '66.7%'],
      ['Student Visa', '33.3%'],
    ])
  })

  it('ages receivables and surfaces attention with severity', () => {
    expect(
      receivablesAging(cases, asOf).map((row) => [row.key, row.amount, row.count]),
    ).toEqual([
      ['current', 0, 0],
      ['30', 0, 0],
      ['60', 0, 0],
      ['90', 50000, 2],
    ])

    const items = needsAttention(cases, requests, clients, 8, asOf)
    expect(items.map((item) => item.id)).toEqual([
      'request:req-1',
      'hold:case-hold',
    ])
    expect(items[0]?.severity).toBe('high')
    expect(items[1]?.reason).toBe('on-hold')
  })

  it('lists recent collections, top outstanding, departures, subAgents, and workload', () => {
    expect(recentPayments(payments, clients, cases, 5).map((row) => row.id)).toEqual(
      ['pay-recent', 'pay-old'],
    )
    expect(topOutstanding(cases).map((row) => [row.id, row.amount])).toEqual([
      ['case-hold', 40000],
      ['case-open', 10000],
    ])
    expect(
      upcomingDepartures(cases, 5, asOf).map((row) => row.id),
    ).toEqual(['case-open'])
    expect(
      clientsBySubAgent(clients, subAgents).map((row) => [
        row.subAgentId,
        row.clientCount,
      ]),
    ).toEqual([
      ['p-1', 2],
      ['p-2', 1],
    ])
    expect(
      workloadByAssignee(cases, employees).map((row) => [
        row.key,
        row.openCases,
        row.outstanding,
      ]),
    ).toEqual([['emp-1', 2, 50000]])
  })

  it('builds an executive pulse from money and risk signals', () => {
    const kpis = computeOwnerKpis(clients, cases, payments, requests, asOf)
    const aging = receivablesAging(cases, asOf)
    const months = collectionsByMonth(payments, 6, asOf)
    const pulse = buildExecutivePulse(kpis, aging, months)
    expect(pulse.length).toBeGreaterThan(0)
    expect(pulse.some((item) => item.id === 'aging' || item.id === 'risk')).toBe(
      true,
    )
  })

  it('returns empty lists when there is nothing to show', () => {
    expect(computeOwnerKpis([], [], [], [], asOf).collectionRate).toBe(0)
    expect(recentPayments([], [], [])).toEqual([])
    expect(upcomingDepartures([], 5, asOf)).toEqual([])
    expect(clientsBySubAgent([], subAgents)).toEqual([])
    expect(workloadByAssignee([], employees)).toEqual([])
    expect(revenueByService([])).toEqual([])
  })
})
