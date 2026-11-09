import { describe, expect, it } from 'vitest'
import {
  deriveClientActiveCases,
  deriveClientBalance,
  deriveClientServices,
  summarizeClientFromCases,
} from '@/lib/clientDerived'
import type { Case } from '@/types/case'
import { TENANT_IDS } from '@/types/tenant'

function buildCase(overrides: Partial<Case> & Pick<Case, 'id' | 'status'>): Case {
  return {
    tenantId: TENANT_IDS.demo,
    caseId: overrides.id,
    clientId: 'c-1',
    clientName: 'Nadia',
    service: 'Tourist Visa',
    stage: 'Intake',
    currentStepId: 'intake',
    steps: {},
    documents: [],
    serviceFee: 10000,
    balance: 0,
    createdAt: '2026-09-01',
    updatedAt: '2026-09-01',
    ...overrides,
  }
}

describe('clientDerived', () => {
  it('counts only open service files', () => {
    const cases = [
      buildCase({ id: 'a', status: 'Pending', balance: 1000 }),
      buildCase({ id: 'b', status: 'Completed', balance: 0 }),
      buildCase({ id: 'c', status: 'Cancelled', balance: 500 }),
      buildCase({
        id: 'd',
        status: 'In-Progress',
        service: 'Air Ticket',
        balance: 2000,
      }),
    ]
    expect(deriveClientActiveCases(cases)).toBe(2)
    expect(deriveClientBalance(cases)).toBe(3000)
    expect(deriveClientServices(cases)).toEqual(['Tourist Visa', 'Air Ticket'])
    expect(summarizeClientFromCases(cases)).toEqual({
      activeCases: 2,
      balance: 3000,
      services: ['Tourist Visa', 'Air Ticket'],
    })
  })

  it('returns empty rollups when there are no files', () => {
    expect(summarizeClientFromCases([])).toEqual({
      activeCases: 0,
      balance: 0,
      services: [],
    })
  })
})
