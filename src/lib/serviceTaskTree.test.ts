import { describe, expect, it } from 'vitest'
import { buildServiceTaskTree } from '@/lib/serviceTaskTree'
import type { Case } from '@/types/case'

function studentCase(overrides: Partial<Case> = {}): Case {
  return {
    id: 'case-tree-1',
    tenantId: 't1',
    caseId: 'SV-1',
    clientId: 'c-1',
    clientName: 'Test',
    service: 'Student Visa',
    status: 'In-Progress',
    stage: 'Intake',
    currentStepId: 'registered',
    steps: {},
    documents: [
      {
        id: 'passport',
        name: 'Passport',
        detail: '',
        status: 'missing',
        expiry: null,
        required: true,
        icon: 'passport',
        unlockStepId: 'registered',
      },
      {
        id: 'financial',
        name: 'Financial Proof',
        detail: '',
        status: 'not_due',
        expiry: null,
        required: true,
        icon: 'financial',
        unlockStepId: 'applied',
      },
      {
        id: 'offer',
        name: 'University Offer Letter',
        detail: '',
        status: 'not_due',
        expiry: null,
        required: true,
        icon: 'offer',
        unlockStepId: 'offer',
      },
    ],
    destination: 'Canada',
    serviceCountry: 'Canada',
    serviceFee: 0,
    balance: 0,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('buildServiceTaskTree', () => {
  it('nests documents under their collecting stages', () => {
    const tree = buildServiceTaskTree(studentCase())
    const registered = tree.stages.find((stage) => stage.id === 'registered')
    const offer = tree.stages.find((stage) => stage.id === 'offer')
    const visa = tree.stages.find((stage) => stage.id === 'visa')
    const allConditions = tree.stages.flatMap((stage) => stage.conditions)

    expect(registered?.state).toBe('current')
    expect(registered?.conditions.some((c) => c.id === 'passport')).toBe(true)
    // Offer letter / financial follow step upload collectors when present.
    expect(offer?.conditions.some((c) => c.id === 'offer')).toBe(true)
    expect(visa?.conditions.some((c) => c.id === 'financial')).toBe(true)
    expect(allConditions.map((c) => c.id).sort()).toEqual(
      ['financial', 'offer', 'passport'].sort(),
    )
  })

  it('marks completed stages before the current step', () => {
    const tree = buildServiceTaskTree(
      studentCase({
        currentStepId: 'applied',
        steps: {
          registered: { completedAt: '2024-01-02T00:00:00.000Z' },
          counselled: { completedAt: '2024-01-03T00:00:00.000Z' },
        },
      }),
    )
    expect(tree.stages.find((s) => s.id === 'registered')?.state).toBe('done')
    expect(tree.stages.find((s) => s.id === 'applied')?.state).toBe('current')
  })
})
