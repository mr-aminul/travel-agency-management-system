import { describe, expect, it } from 'vitest'
import {
  serviceDetailAriaLabel,
  serviceSwitcherAriaLabel,
  serviceSwitcherMeta,
} from '@/lib/serviceDisplay'
import type { Case } from '@/types/case'

function stub(partial: Partial<Case> & Pick<Case, 'id' | 'caseId' | 'service'>): Case {
  return {
    tenantId: 't1',
    clientId: 'c1',
    clientName: 'Test',
    status: 'Pending',
    stage: 'Intake',
    currentStepId: 'registered',
    steps: {},
    documents: [],
    serviceFee: 0,
    balance: 0,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    ...partial,
  }
}

describe('service switcher labels', () => {
  it('leaves unique service types as a single name', () => {
    const work = stub({
      id: 'a',
      caseId: 'SR-00101',
      service: 'Work Permit Visa',
      destination: 'Riyadh, Saudi Arabia',
    })
    const ticket = stub({
      id: 'b',
      caseId: 'SR-00102',
      service: 'Air Ticket',
      destination: 'Jeddah, Saudi Arabia',
    })
    const services = [work, ticket]

    expect(serviceSwitcherMeta(work, services)).toBeNull()
    expect(serviceSwitcherAriaLabel(work, services)).toBe('Work Permit Visa')
    expect(serviceSwitcherMeta(ticket, services)).toBeNull()
  })

  it('adds id and destination when the same service is opened twice', () => {
    const first = stub({
      id: 'a',
      caseId: 'SR-00110',
      service: 'Work Permit Visa',
      currentStepId: 'registered',
    })
    const second = stub({
      id: 'b',
      caseId: 'SR-00101',
      service: 'Work Permit Visa',
      destination: 'Riyadh, Saudi Arabia',
      currentStepId: 'medical',
    })
    const ticket = stub({
      id: 'c',
      caseId: 'SR-00102',
      service: 'Air Ticket',
    })
    const services = [first, second, ticket]

    expect(serviceSwitcherMeta(first, services)).toBe('SR-00110 · Registered')
    expect(serviceSwitcherMeta(second, services)).toBe(
      'SR-00101 · Riyadh, Saudi Arabia',
    )
    expect(serviceSwitcherMeta(ticket, services)).toBeNull()
    expect(serviceSwitcherAriaLabel(first, services)).toBe(
      'Work Permit Visa, SR-00110 · Registered',
    )
  })

  it('names the open file with its service id', () => {
    expect(
      serviceDetailAriaLabel({ service: 'Work Permit Visa', caseId: 'SR-00101' }),
    ).toBe('Work Permit Visa (SR-00101)')
  })
})
