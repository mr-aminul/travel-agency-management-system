import { describe, expect, it } from 'vitest'
import {
  buildMoneyBook,
  filterMoneyBook,
  rebalanceMoneyBook,
  summarizeMoneyBook,
  walletFromPaymentMethod,
} from '@/lib/moneyBook'
import type { CommissionSettlement } from '@/types/commission'
import type { ManualLedgerEntry } from '@/types/ledger'
import type { Payment } from '@/types/payment'

const payments: Payment[] = [
  {
    id: 'pay-1',
    tenantId: 't1',
    clientId: 'c1',
    caseId: 'case-1',
    amount: 10000,
    method: 'bKash',
    note: 'Deposit',
    createdAt: '2026-10-01',
  },
  {
    id: 'pay-2',
    tenantId: 't1',
    clientId: 'c1',
    caseId: 'case-1',
    amount: 5000,
    method: 'Cash',
    createdAt: '2026-10-02',
  },
]

const settlements: CommissionSettlement[] = [
  {
    id: 'cset-1',
    tenantId: 't1',
    subAgentId: 'sa-1',
    entryIds: ['comm-1'],
    total: 1500,
    settledAt: '2026-10-02T12:00:00.000Z',
    note: 'September settle',
  },
]

const manual: ManualLedgerEntry[] = [
  {
    id: 'led-1',
    tenantId: 't1',
    direction: 'out',
    kind: 'supplier',
    amount: 3000,
    wallet: 'Bank',
    party: 'Biman BD',
    createdAt: '2026-10-03T09:00:00.000Z',
  },
]

describe('moneyBook', () => {
  it('maps payment methods onto wallets', () => {
    expect(walletFromPaymentMethod('Cash')).toBe('Cash')
    expect(walletFromPaymentMethod('Bank transfer')).toBe('Bank')
    expect(walletFromPaymentMethod('Nagad')).toBe('Nagad')
  })

  it('builds a running balance newest-first', () => {
    const rows = buildMoneyBook({
      payments,
      settlements,
      manual,
      clientName: () => 'Rahim',
      subAgentName: () => 'Karim',
      caseLabel: () => 'Umrah',
    })
    expect(rows.map((row) => row.id)).toEqual([
      'led:led-1',
      'cset:cset-1',
      'pay:pay-2',
      'pay:pay-1',
    ])
    // Chronology: +10000, +5000, -1500, -3000 → 10500
    expect(rows[0]?.balanceAfter).toBe(10500)
    expect(rows[0]?.title).toBe('Paid supplier')
    expect(rows[1]?.title).toBe('Paid commission')
    expect(rows[2]?.direction).toBe('in')
    expect(rows[3]?.wallet).toBe('bKash')
  })

  it('filters by direction and wallet', () => {
    const rows = buildMoneyBook({
      payments,
      settlements,
      manual,
      clientName: () => 'Rahim',
      subAgentName: () => 'Karim',
      caseLabel: () => 'Umrah',
    })
    expect(filterMoneyBook(rows, { direction: 'out' })).toHaveLength(2)
    expect(filterMoneyBook(rows, { wallet: 'Cash' })).toHaveLength(2)
  })

  it('rebalances a filtered newest-first list', () => {
    const rows = buildMoneyBook({
      payments,
      settlements,
      manual,
      clientName: () => 'Rahim',
      subAgentName: () => 'Karim',
      caseLabel: () => 'Umrah',
    })
    const cashOnly = rebalanceMoneyBook(
      filterMoneyBook(rows, { wallet: 'Cash' }),
    )
    // +5000 cash receipt then -1500 commission on cash → 3500
    expect(cashOnly[0]?.balanceAfter).toBe(3500)
  })

  it('summarizes in-hand and wallet pockets', () => {
    const rows = buildMoneyBook({
      payments,
      settlements,
      manual,
      clientName: () => 'Rahim',
      subAgentName: () => 'Karim',
      caseLabel: () => 'Umrah',
    })
    const summary = summarizeMoneyBook(rows)
    expect(summary.inHand).toBe(10500)
    expect(summary.byWallet.bKash).toBe(10000)
    expect(summary.byWallet.Cash).toBe(3500)
    expect(summary.byWallet.Bank).toBe(-3000)
  })
})
