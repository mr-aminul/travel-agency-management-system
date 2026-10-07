import { describe, expect, it } from 'vitest'
import {
  cashFlowByMonth,
  departureOutlook,
  paperworkSummary,
  passportsExpiringSoon,
  referralSplit,
  stageFlow,
} from '@/lib/dashboardOperations'
import type { Case, CaseDocument } from '@/types/case'
import type { Client } from '@/types/client'
import type { Payment } from '@/types/payment'
import { TENANT_IDS } from '@/types/tenant'

const asOf = new Date(2026, 9, 6)

function buildDocument(
  id: string,
  status: CaseDocument['status'],
  required = true,
): CaseDocument {
  return { id, name: id, detail: '', status, expiry: null, required, icon: 'other' }
}

function buildCase(overrides: Partial<Case> & Pick<Case, 'id'>): Case {
  return {
    tenantId: TENANT_IDS.full,
    caseId: overrides.id,
    clientId: 'c-1',
    clientName: 'Nadia',
    service: 'Tourist Visa',
    status: 'In-Progress',
    stage: 'Processing',
    currentStepId: 'applied',
    steps: {},
    documents: [],
    serviceFee: 10000,
    balance: 0,
    createdAt: '2026-09-01',
    updatedAt: '2026-09-01',
    ...overrides,
  }
}

function buildClient(overrides: Partial<Client> & Pick<Client, 'id'>): Client {
  return {
    tenantId: TENANT_IDS.full,
    name: overrides.id,
    phone: '01700000000',
    services: [],
    balance: 0,
    activeCases: 1,
    idChecked: true,
    createdAt: '2026-01-01',
    ...overrides,
  }
}

describe('stageFlow', () => {
  it('places open files on their journey stage and completed files in Closed', () => {
    const cases = [
      buildCase({ id: 'a', currentStepId: 'registered', balance: 3000 }),
      buildCase({ id: 'b', currentStepId: 'visa', balance: 2000 }),
      buildCase({ id: 'c', currentStepId: 'visa' }),
      buildCase({ id: 'd', status: 'Completed', currentStepId: 'travelled' }),
      buildCase({ id: 'e', status: 'Cancelled' }),
    ]
    expect(stageFlow(cases).map((row) => [row.stage, row.count])).toEqual([
      ['Intake', 1],
      ['Processing', 0],
      ['Documents', 2],
      ['Travel', 0],
      ['Closed', 1],
    ])
  })
})

describe('paperworkSummary', () => {
  it('measures required documents in hand against those already due', () => {
    const cases = [
      buildCase({
        id: 'a',
        documents: [
          buildDocument('passport', 'approved'),
          buildDocument('photo', 'under_review'),
          buildDocument('bank', 'missing'),
          buildDocument('ticket', 'not_due'),
          buildDocument('optional', 'missing', false),
        ],
      }),
      buildCase({
        id: 'done',
        status: 'Completed',
        documents: [buildDocument('passport', 'missing')],
      }),
    ]
    expect(paperworkSummary(cases)).toEqual({
      approved: 1,
      underReview: 1,
      missing: 1,
      notDue: 1,
      inHandRate: 2 / 3,
    })
  })

  it('reports full readiness when nothing is due', () => {
    expect(paperworkSummary([]).inHandRate).toBe(1)
  })
})

describe('departureOutlook', () => {
  const cases = [
    buildCase({
      id: 'missed',
      departureDate: '2026-09-26',
      documents: [buildDocument('visa', 'missing')],
    }),
    buildCase({
      id: 'soon',
      departureDate: '2026-10-16',
      documents: [buildDocument('visa', 'approved'), buildDocument('ticket', 'missing')],
    }),
    buildCase({ id: 'far', departureDate: '2027-03-01' }),
    buildCase({ id: 'closed', status: 'Completed', departureDate: '2026-10-10' }),
  ]

  it('splits missed travel dates from upcoming ones within the horizon', () => {
    const outlook = departureOutlook(cases, 90, asOf)
    expect(outlook.overdue.map((check) => [check.id, check.daysUntil])).toEqual([
      ['missed', -10],
    ])
    expect(outlook.upcoming.map((check) => [check.id, check.daysUntil])).toEqual([
      ['soon', 10],
    ])
  })

  it('counts required documents received for each trip', () => {
    const soon = departureOutlook(cases, 90, asOf).upcoming[0]
    expect([soon?.documentsReady, soon?.documentsRequired]).toEqual([1, 2])
  })
})

describe('cashFlowByMonth', () => {
  it('pairs fees booked by open month with cash collected', () => {
    const cases = [
      buildCase({ id: 'a', createdAt: '2026-09-03', serviceFee: 40000 }),
      buildCase({ id: 'b', createdAt: '2026-10-01', serviceFee: 12000 }),
      buildCase({ id: 'x', createdAt: '2026-10-02', serviceFee: 99000, status: 'Cancelled' }),
    ]
    const payments: Payment[] = [
      {
        id: 'p',
        tenantId: TENANT_IDS.full,
        clientId: 'c-1',
        caseId: 'a',
        amount: 15000,
        method: 'Cash',
        createdAt: '2026-09-20',
      },
    ]
    expect(cashFlowByMonth(cases, payments, 2, asOf)).toEqual([
      { key: '2026-09', label: 'Sep', booked: 40000, collected: 15000 },
      { key: '2026-10', label: 'Oct', booked: 12000, collected: 0 },
    ])
  })
})

describe('client signals', () => {
  it('counts active clients whose passport expires within the window', () => {
    const clients = [
      buildClient({ id: 'expired', passportExpiry: '2026-01-01' }),
      buildClient({ id: 'soon', passportExpiry: '2027-02-01' }),
      buildClient({ id: 'safe', passportExpiry: '2030-01-01' }),
      buildClient({ id: 'inactive', passportExpiry: '2026-11-01', activeCases: 0 }),
    ]
    expect(passportsExpiringSoon(clients, 180, asOf)).toBe(2)
  })

  it('splits clients into sub-agent referrals and direct walk-ins', () => {
    const clients = [
      buildClient({ id: 'a', partnerId: 'p-1' }),
      buildClient({ id: 'b' }),
      buildClient({ id: 'c' }),
    ]
    expect(referralSplit(clients)).toEqual({ referred: 1, direct: 2 })
  })
})
