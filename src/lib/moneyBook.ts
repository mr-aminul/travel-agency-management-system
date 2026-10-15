import type { CommissionSettlement } from '@/types/commission'
import type { Payment } from '@/types/payment'
import type {
  LedgerDirection,
  LedgerWallet,
  ManualLedgerEntry,
  MoneyBookRow,
} from '@/types/ledger'

export function walletFromPaymentMethod(method: string): LedgerWallet {
  const normalized = method.trim().toLowerCase()
  if (normalized === 'cash') return 'Cash'
  if (normalized === 'bkash') return 'bKash'
  if (normalized === 'nagad') return 'Nagad'
  if (normalized.includes('bank')) return 'Bank'
  if (normalized === 'card') return 'Card'
  return 'Other'
}

function sortKey(iso: string): string {
  // Date-only seeds sort before same-day ISO timestamps.
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return `${iso}T00:00:00.000Z`
  return iso
}

function manualTitle(entry: ManualLedgerEntry): string {
  if (entry.kind === 'supplier') return 'Paid supplier'
  if (entry.kind === 'expense') return 'Paid expense'
  if (entry.kind === 'other_in') return 'Other money in'
  return 'Other money out'
}

type BuildMoneyBookInput = {
  payments: Payment[]
  settlements: CommissionSettlement[]
  manual: ManualLedgerEntry[]
  clientName: (clientId: string) => string | undefined
  subAgentName: (subAgentId: string) => string | undefined
  caseLabel: (caseId: string) => string | undefined
}

type UnsignedRow = Omit<MoneyBookRow, 'balanceAfter'>

function toUnsignedRows(input: BuildMoneyBookInput): UnsignedRow[] {
  const rows: UnsignedRow[] = []

  for (const payment of input.payments) {
    const client = input.clientName(payment.clientId)
    const service = input.caseLabel(payment.caseId)
    rows.push({
      id: `pay:${payment.id}`,
      source: 'payment',
      createdAt: payment.createdAt,
      direction: 'in',
      title: 'Client paid',
      party: client,
      partyHref: `/clients/${payment.clientId}`,
      wallet: walletFromPaymentMethod(payment.method),
      amount: payment.amount,
      note: [service, payment.note].filter(Boolean).join(' · ') || undefined,
      txnId: payment.txnId,
    })
  }

  for (const settlement of input.settlements) {
    const agent = input.subAgentName(settlement.subAgentId)
    rows.push({
      id: `cset:${settlement.id}`,
      source: 'commission',
      createdAt: settlement.settledAt,
      direction: 'out',
      title: 'Paid commission',
      party: agent,
      partyHref: `/sub-agents/${settlement.subAgentId}`,
      wallet: 'Cash',
      amount: settlement.total,
      note: settlement.note,
    })
  }

  for (const entry of input.manual) {
    rows.push({
      id: `led:${entry.id}`,
      source: 'manual',
      createdAt: entry.createdAt,
      direction: entry.direction,
      title: manualTitle(entry),
      party: entry.party,
      wallet: entry.wallet,
      amount: entry.amount,
      note: entry.note,
      txnId: entry.txnId,
    })
  }

  return rows
}

/**
 * Build the agency cash book: oldest → newest running balance, returned newest first.
 */
export function buildMoneyBook(input: BuildMoneyBookInput): MoneyBookRow[] {
  const chronological = toUnsignedRows(input).sort((a, b) =>
    sortKey(a.createdAt).localeCompare(sortKey(b.createdAt)),
  )

  let balance = 0
  const withBalance: MoneyBookRow[] = chronological.map((row) => {
    balance += row.direction === 'in' ? row.amount : -row.amount
    return { ...row, balanceAfter: balance }
  })

  return withBalance.reverse()
}

export function filterMoneyBook(
  rows: MoneyBookRow[],
  filters: {
    direction?: LedgerDirection | 'all'
    wallet?: LedgerWallet | 'all'
  },
): MoneyBookRow[] {
  return rows.filter((row) => {
    if (
      filters.direction &&
      filters.direction !== 'all' &&
      row.direction !== filters.direction
    ) {
      return false
    }
    if (
      filters.wallet &&
      filters.wallet !== 'all' &&
      row.wallet !== filters.wallet
    ) {
      return false
    }
    return true
  })
}

/** Recompute running balance for a filtered newest-first list. */
export function rebalanceMoneyBook(rowsNewestFirst: MoneyBookRow[]): MoneyBookRow[] {
  const chronological = [...rowsNewestFirst].reverse()
  let balance = 0
  const withBalance = chronological.map((row) => {
    balance += row.direction === 'in' ? row.amount : -row.amount
    return { ...row, balanceAfter: balance }
  })
  return withBalance.reverse()
}

export function summarizeMoneyBook(rows: MoneyBookRow[]): {
  inHand: number
  todayIn: number
  todayOut: number
  byWallet: Record<LedgerWallet, number>
} {
  const today = new Date().toISOString().slice(0, 10)
  const byWallet: Record<LedgerWallet, number> = {
    Cash: 0,
    bKash: 0,
    Nagad: 0,
    Bank: 0,
    Card: 0,
    Other: 0,
  }
  let inHand = 0
  let todayIn = 0
  let todayOut = 0

  // Summaries from chronological sense: use unsigned amounts from rows
  // (balanceAfter already encodes order; wallet totals from each row).
  for (const row of rows) {
    const signed = row.direction === 'in' ? row.amount : -row.amount
    inHand += signed
    byWallet[row.wallet] += signed
    const day = row.createdAt.slice(0, 10)
    if (day === today) {
      if (row.direction === 'in') todayIn += row.amount
      else todayOut += row.amount
    }
  }

  return { inHand, todayIn, todayOut, byWallet }
}

export function moneyBookDayKey(iso: string): string {
  return iso.slice(0, 10)
}
