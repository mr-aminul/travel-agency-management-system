import { describe, expect, it } from 'vitest'
import {
  caseHasRecommendedGaps,
  listCaseInfoGaps,
} from '@/lib/caseServiceRules'

describe('caseServiceRules', () => {
  it('requires only client + service at create (documented via gaps never blocking)', () => {
    const gaps = listCaseInfoGaps({
      serviceCountry: undefined,
      destination: undefined,
      assignedTo: undefined,
    })

    expect(gaps.map((gap) => gap.id)).toEqual(['country', 'assignee'])
    expect(gaps.every((gap) => gap.blocksProgress === false)).toBe(true)
  })

  it('clears recommended gaps when country and assignee are set', () => {
    expect(
      listCaseInfoGaps({
        serviceCountry: 'Saudi Arabia',
        destination: 'Riyadh',
        assignedTo: 'EMP-7001',
      }),
    ).toEqual([])
    expect(
      caseHasRecommendedGaps({
        serviceCountry: 'Saudi Arabia',
        assignedTo: 'EMP-7001',
      }),
    ).toBe(false)
  })

  it('treats destination alone as enough for the country recommendation', () => {
    expect(
      listCaseInfoGaps({
        destination: 'Montreal, Canada',
        assignedTo: 'EMP-7001',
      }).map((gap) => gap.id),
    ).toEqual([])
  })

  it('never treats fee or notes as setup gaps', () => {
    const ids = listCaseInfoGaps({
      serviceCountry: 'Canada',
      assignedTo: 'EMP-1',
    }).map((gap) => gap.id)

    expect(ids).not.toContain('serviceFee')
    expect(ids).not.toContain('description')
  })
})
