import { describe, expect, it } from 'vitest'
import { caseBalanceDue, caseServiceFee, parseMoneyInput } from '@/lib/caseMoney'

describe('case money', () => {
  it('uses the stored service fee when present', () => {
    expect(caseServiceFee({ serviceFee: 50000, balance: 35000 }, 15000)).toBe(
      50000,
    )
  })

  it('falls back to paid plus remaining due when no fee was stored', () => {
    expect(caseServiceFee({ balance: 35000 }, 15000)).toBe(50000)
  })

  it('derives balance due from the fee minus payments', () => {
    expect(caseBalanceDue({ serviceFee: 50000, balance: 999 }, 15000)).toBe(
      35000,
    )
  })

  it('parses comma-formatted money', () => {
    expect(parseMoneyInput('50,000')).toBe(50000)
    expect(parseMoneyInput('')).toBe(0)
  })
})
