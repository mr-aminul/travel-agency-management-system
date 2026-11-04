import { describe, expect, it } from 'vitest'
import {
  decisionFieldKey,
  defaultYesNoDecision,
  matchDecisionNextStepId,
  stepDecisionsSkipDocuments,
  validateStepDecisions,
} from '@/lib/stepDecisions'
import type { ServiceStepConfig } from '@/types/serviceTemplate'

describe('step decisions', () => {
  const step: ServiceStepConfig = {
    id: 'shortlisted',
    label: 'Shortlisted',
    requiredDocumentIds: ['passport'],
    decisions: [
      {
        key: 'finger',
        label: 'Finger',
        options: [
          { value: 'Yes' },
          { value: 'No', nextStepId: 'interview', skipDocuments: true },
        ],
      },
    ],
  }

  it('skips documents when the chosen option says so', () => {
    expect(
      stepDecisionsSkipDocuments(step, {
        [decisionFieldKey('finger')]: 'No',
      }),
    ).toBe(true)
    expect(
      stepDecisionsSkipDocuments(step, {
        [decisionFieldKey('finger')]: 'Yes',
      }),
    ).toBe(false)
  })

  it('routes to the option next step', () => {
    expect(
      matchDecisionNextStepId(
        step,
        { [decisionFieldKey('finger')]: 'No' },
        new Set(['shortlisted', 'interview', 'visa']),
      ),
    ).toBe('interview')
    expect(
      matchDecisionNextStepId(
        step,
        { [decisionFieldKey('finger')]: 'Yes' },
        new Set(['shortlisted', 'interview', 'visa']),
      ),
    ).toBeNull()
  })

  it('builds a default Yes/No decision', () => {
    const decision = defaultYesNoDecision('Finger', [])
    expect(decision.key).toBe('finger')
    expect(decision.options.map((option) => option.value)).toEqual([
      'Yes',
      'No',
    ])
    expect(decision.options[1]?.skipDocuments).toBe(true)
  })

  it('rejects a decision that points at the same step', () => {
    const error = validateStepDecisions([
      {
        id: 'shortlisted',
        label: 'Shortlisted',
        decisions: [
          {
            key: 'finger',
            label: 'Finger',
            options: [
              { value: 'Yes' },
              { value: 'No', nextStepId: 'shortlisted' },
            ],
          },
        ],
      },
    ])
    expect(error).toMatch(/cannot point back/i)
  })
})
