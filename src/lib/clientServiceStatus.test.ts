import { describe, expect, it } from 'vitest'
import {
  clientMatchesServiceStatusFilters,
  deriveClientServiceStatus,
  deriveSubAgentActivityStatus,
} from '@/lib/clientServiceStatus'
import type { Case } from '@/types/case'
import { TENANT_IDS } from '@/types/tenant'

function stubCase(status: Case['status'], id = status): Case {
  return {
    id,
    tenantId: TENANT_IDS.full,
    caseId: `SR-${id}`,
    clientId: 'c-1',
    clientName: 'Test',
    service: 'Tour Package',
    status,
    stage: 'Intake',
    currentStepId: 'intake',
    steps: {},
    documents: [],
    serviceFee: 0,
    balance: 0,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  }
}

describe('deriveClientServiceStatus', () => {
  it('returns null when the client has no service files', () => {
    expect(deriveClientServiceStatus([])).toBeNull()
  })

  it('prefers the most actionable open status', () => {
    expect(
      deriveClientServiceStatus([
        stubCase('Pending', 'a'),
        stubCase('In-Progress', 'b'),
        stubCase('Completed', 'c'),
      ]),
    ).toBe('In-Progress')
    expect(
      deriveClientServiceStatus([
        stubCase('Pending', 'a'),
        stubCase('On-Hold', 'b'),
      ]),
    ).toBe('On-Hold')
  })

  it('falls back to closed statuses when nothing is open', () => {
    expect(
      deriveClientServiceStatus([
        stubCase('Cancelled', 'a'),
        stubCase('Completed', 'b'),
      ]),
    ).toBe('Completed')
  })
})

describe('clientMatchesServiceStatusFilters', () => {
  it('matches when any file has a selected status', () => {
    const cases = [stubCase('Pending', 'a'), stubCase('Completed', 'b')]
    expect(clientMatchesServiceStatusFilters(cases, [])).toBe(true)
    expect(clientMatchesServiceStatusFilters(cases, ['On-Hold'])).toBe(false)
    expect(clientMatchesServiceStatusFilters(cases, ['Completed'])).toBe(true)
  })
})

describe('deriveSubAgentActivityStatus', () => {
  it('is Active when any referred client has an open service', () => {
    expect(
      deriveSubAgentActivityStatus([
        stubCase('Completed', 'a'),
        stubCase('In-Progress', 'b'),
      ]),
    ).toBe('Active')
  })

  it('is Inactive when there are no open services', () => {
    expect(deriveSubAgentActivityStatus([])).toBe('Inactive')
    expect(
      deriveSubAgentActivityStatus([
        stubCase('Completed', 'a'),
        stubCase('Cancelled', 'b'),
      ]),
    ).toBe('Inactive')
  })
})
