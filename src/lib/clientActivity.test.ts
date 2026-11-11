import { describe, expect, it } from 'vitest'
import { buildClientActivity } from '@/lib/clientActivity'
import { TENANT_IDS } from '@/types/tenant'
import type { Case } from '@/types/case'
import type { Payment } from '@/types/payment'

function caseStub(overrides: Partial<Case>): Case {
  return {
    id: 'case-1',
    tenantId: TENANT_IDS.demo,
    caseId: 'SR-1',
    clientId: 'c-1',
    clientName: 'Rahim',
    service: 'Tourist Visa',
    status: 'Pending',
    stage: 'Intake',
    currentStepId: 'registered',
    steps: {},
    documents: [],
    serviceFee: 1000,
    balance: 1000,
    createdAt: '2026-08-01',
    updatedAt: '2026-08-01',
    ...overrides,
  }
}

describe('buildClientActivity', () => {
  it('includes service open and update rows', () => {
    const rows = buildClientActivity({
      cases: [
        caseStub({
          createdAt: '2026-08-01',
          updatedAt: '2026-08-10',
        }),
      ],
      payments: [],
      messages: [],
      requests: [],
    })
    expect(rows.map((row) => row.summary)).toEqual([
      'Service updated — Tourist Visa',
      'Service opened — Tourist Visa',
    ])
    expect(rows[0]?.type).toBe('Services')
  })

  it('merges payments newest first', () => {
    const payment = {
      id: 'pay-1',
      tenantId: TENANT_IDS.demo,
      clientId: 'c-1',
      caseId: 'case-1',
      amount: 500,
      method: 'Cash',
      createdAt: '2026-08-12',
    } as Payment
    const rows = buildClientActivity({
      cases: [caseStub({})],
      payments: [payment],
      messages: [],
      requests: [],
      limit: 10,
    })
    expect(rows[0]?.type).toBe('Payments')
    expect(rows[0]?.reference).toBe('SR-1')
  })
})
