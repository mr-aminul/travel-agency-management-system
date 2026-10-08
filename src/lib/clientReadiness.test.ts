import { describe, expect, it } from 'vitest'
import {
  buildReadinessBoard,
  buildReadinessQueue,
  currentStepStartedAt,
  toReadinessItem,
} from '@/lib/clientReadiness'
import type { Case, CaseDocument } from '@/types/case'
import { TENANT_IDS } from '@/types/tenant'

const asOf = new Date(2026, 9, 7) // 7 Oct 2026

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
    clientName: 'Md. Rahim Uddin',
    service: 'Work Permit Visa',
    status: 'In-Progress',
    stage: 'Documents',
    currentStepId: 'medical',
    steps: {},
    documents: [],
    serviceFee: 50000,
    balance: 35000,
    destination: 'Riyadh, Saudi Arabia',
    createdAt: '2026-01-01',
    updatedAt: '2026-08-01',
    ...overrides,
  }
}

describe('toReadinessItem', () => {
  it('marks open medical files as actionable with next step and progress', () => {
    const item = toReadinessItem(
      buildCase({
        id: 'case-101',
        caseId: 'SR-00101',
        documents: [buildDocument('medical', 'under_review')],
        steps: {
          selected: { completedAt: '2026-09-20T10:00:00.000Z' },
        },
      }),
      asOf,
    )
    expect(item).toMatchObject({
      clientName: 'Md. Rahim Uddin',
      stepId: 'medical',
      stepLabel: 'Medical',
      destination: 'Riyadh, Saudi Arabia',
      state: 'actionable',
      focus: 'pipeline',
      nextStepLabel: 'Visa',
      stepNumber: 5,
      stepCount: 9,
      daysWaiting: 17,
    })
  })

  it('flags missing required docs as blocked', () => {
    const item = toReadinessItem(
      buildCase({
        id: 'a',
        documents: [buildDocument('demand', 'missing')],
      }),
      asOf,
    )
    expect(item?.state).toBe('blocked')
    expect(item?.focus).toBe('documents')
    expect(item?.missingDocs).toBe(1)
  })

  it('ignores completed and cancelled files', () => {
    expect(toReadinessItem(buildCase({ id: 'a', status: 'Completed' }))).toBeNull()
    expect(toReadinessItem(buildCase({ id: 'b', status: 'Cancelled' }))).toBeNull()
  })
})

describe('currentStepStartedAt', () => {
  it('uses the previous step completion when available', () => {
    expect(
      currentStepStartedAt(
        buildCase({
          id: 'a',
          steps: {
            selected: { completedAt: '2026-09-01T12:00:00.000Z' },
          },
        }),
      ),
    ).toBe('2026-09-01T12:00:00.000Z')
  })
})

describe('buildReadinessQueue', () => {
  it('lists next actions sorted by blocked, departure, then wait time', () => {
    const queue = buildReadinessQueue(
      [
        buildCase({
          id: 'ready',
          clientName: 'Ready Client',
          currentStepId: 'visa',
          departureDate: '2026-11-01',
          steps: {
            medical: { completedAt: '2026-10-01T10:00:00.000Z' },
          },
          updatedAt: '2026-10-01',
        }),
        buildCase({
          id: 'blocked',
          clientName: 'Blocked Client',
          documents: [buildDocument('demand', 'missing')],
          departureDate: '2026-10-20',
          steps: {
            selected: { completedAt: '2026-09-01T10:00:00.000Z' },
          },
        }),
        buildCase({
          id: 'hold',
          clientName: 'Hold Client',
          status: 'On-Hold',
          currentStepId: 'ticket',
        }),
        buildCase({ id: 'done', status: 'Completed', currentStepId: 'departed' }),
      ],
      {},
      asOf,
    )

    expect(queue.openCount).toBe(3)
    expect(queue.items.map((item) => item.clientName)).toEqual([
      'Blocked Client',
      'Ready Client',
      'Hold Client',
    ])
    expect(queue.items[1].nextStepLabel).toBe('Clearance')
    expect(queue.items[1].stepLabel).toBe('Visa')
  })
})

describe('buildReadinessBoard', () => {
  it('groups clients by current step so ops can scan medical vs visa', () => {
    const board = buildReadinessBoard(
      [
        buildCase({
          id: 'a',
          clientName: 'Md. Rahim Uddin',
          currentStepId: 'medical',
          updatedAt: '2026-08-02',
        }),
        buildCase({
          id: 'b',
          clientName: 'Karim Ali',
          currentStepId: 'medical',
          destination: 'Jeddah, Saudi Arabia',
          updatedAt: '2026-08-01',
        }),
        buildCase({
          id: 'c',
          clientName: 'Farhana Akter',
          service: 'Student Visa',
          currentStepId: 'visa',
          destination: 'Montreal, Canada',
          stage: 'Documents',
        }),
        buildCase({ id: 'd', status: 'Completed', currentStepId: 'departed' }),
      ],
      {},
      asOf,
    )

    expect(board.openCount).toBe(3)
    expect(board.columns.map((col) => [col.stepId, col.count])).toEqual([
      ['medical', 2],
      ['visa', 1],
    ])
  })

  it('filters by service and readiness state', () => {
    const cases = [
      buildCase({
        id: 'a',
        currentStepId: 'medical',
        documents: [buildDocument('demand', 'missing')],
      }),
      buildCase({
        id: 'b',
        service: 'Hajj/Umrah Visa',
        currentStepId: 'medical',
        destination: 'Makkah, Saudi Arabia',
      }),
      buildCase({
        id: 'c',
        status: 'On-Hold',
        currentStepId: 'visa',
      }),
    ]

    const medicalOnly = buildReadinessBoard(
      cases,
      {
        services: ['Work Permit Visa'],
        stepIds: ['medical'],
      },
      asOf,
    )
    expect(medicalOnly.openCount).toBe(1)
    expect(medicalOnly.columns[0]?.items[0].state).toBe('blocked')

    const actionable = buildReadinessBoard(cases, { states: ['actionable'] }, asOf)
    expect(actionable.openCount).toBe(1)
    expect(actionable.columns[0]?.stepId).toBe('medical')
    expect(actionable.columns[0]?.items[0].service).toBe('Hajj/Umrah Visa')
  })
})
