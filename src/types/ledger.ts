/** Wallet / pocket money sits in for the agency cash book. */
export type LedgerWallet =
  | 'Cash'
  | 'bKash'
  | 'Nagad'
  | 'Bank'
  | 'Card'
  | 'Other'

export type LedgerDirection = 'in' | 'out'

/** Manual money-book rows (supplier payouts, other in/out). Receipts & commission settlements are derived. */
export type ManualLedgerKind =
  | 'supplier'
  | 'expense'
  | 'other_in'
  | 'other_out'

export type ManualLedgerEntry = {
  id: string
  tenantId: string
  direction: LedgerDirection
  kind: ManualLedgerKind
  amount: number
  wallet: LedgerWallet
  /** Person or business the money moved with (supplier, landlord, …). */
  party?: string
  note?: string
  txnId?: string
  createdAt: string
}

export type CreateManualLedgerInput = {
  direction: LedgerDirection
  kind: ManualLedgerKind
  amount: number
  wallet: LedgerWallet
  party?: string
  note?: string
  txnId?: string
  /** Optional ISO date (defaults to now). */
  createdAt?: string
}

export type MoneyBookSource = 'payment' | 'commission' | 'manual'

export type MoneyBookRow = {
  id: string
  source: MoneyBookSource
  createdAt: string
  direction: LedgerDirection
  /** Short human title, e.g. "Client paid" / "Paid supplier". */
  title: string
  party?: string
  partyHref?: string
  wallet: LedgerWallet
  amount: number
  note?: string
  txnId?: string
  /** Running cash-book balance after this row (oldest → newest). */
  balanceAfter: number
}

export const LEDGER_WALLETS: LedgerWallet[] = [
  'Cash',
  'bKash',
  'Nagad',
  'Bank',
  'Card',
  'Other',
]
