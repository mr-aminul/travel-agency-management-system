import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  Plus,
  Wallet,
} from 'lucide-react'
import { StatCards } from '@/components/StatCards'
import { Badge } from '@/components/shadcn/badge'
import { Button } from '@/components/shadcn/button'
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/shadcn/empty'
import { Input, Select } from '@/components/clients/clientShadcnFields'
import {
  chromeHeadClass,
  elevatedPageClass,
  floatingSheetClass,
  tableShellClass,
  filterChipClass,
} from '@/components/clients/shadcnChrome'
import { cn } from '@/lib/utils'
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/shadcn/sheet'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/shadcn/table'
import { useCases } from '@/lib/casesStore'
import { getClientById, useClients } from '@/lib/clientsStore'
import { useAllCommissionSettlements } from '@/lib/commissionsStore'
import { formatBdt } from '@/lib/dashboardMetrics'
import {
  validateOptionalText,
  validateRequiredMoney,
  validateRequiredSelect,
  validateRequiredText,
} from '@/lib/fieldValidation'
import { formatDisplayDate } from '@/lib/formatDate'
import {
  createManualLedgerEntry,
  useManualLedgerEntries,
} from '@/lib/ledgerStore'
import {
  buildMoneyBook,
  filterMoneyBook,
  summarizeMoneyBook,
} from '@/lib/moneyBook'
import {
  createPayment,
  formatPaymentAmount,
  usePayments,
} from '@/lib/paymentsStore'
import { getSubAgentById } from '@/lib/subAgentsStore'
import { useTouchedFields } from '@/lib/useTouchedFields'
import type { LedgerWallet, ManualLedgerKind } from '@/types/ledger'
import { LEDGER_WALLETS } from '@/types/ledger'
import '@/styles/layout-ops.css'
import '@/styles/layout-clients.css'

type MoneyStatId = 'hand' | 'in' | 'out' | 'due'
type DirectionFilter = 'all' | 'in' | 'out'
type DrawerMode = 'payment' | 'payout' | null

function isOpenService(status: string): boolean {
  return status !== 'Completed' && status !== 'Cancelled'
}

function walletOptions() {
  return LEDGER_WALLETS.filter((wallet) => wallet !== 'Other').map(
    (wallet) => ({
      value: wallet,
      label: wallet,
    }),
  )
}

function moneyStatFromSearch(value: string | null): MoneyStatId | 'all' | null {
  if (value === 'hand' || value === 'in' || value === 'out' || value === 'due') {
    return value
  }
  if (value === 'all') return 'all'
  return null
}

function FilterChipButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        filterChipClass(active),
        'inline-flex items-center justify-center text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-theme)]/40',
      )}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

export default function PaymentsPage() {
  const payments = usePayments()
  const cases = useCases()
  const clients = useClients()
  const settlements = useAllCommissionSettlements()
  const manual = useManualLedgerEntries()
  const [searchParams, setSearchParams] = useSearchParams()

  const [selectedStat, setSelectedStat] = useState<MoneyStatId | 'all'>('all')
  const [directionFilter, setDirectionFilter] =
    useState<DirectionFilter>('all')
  const [walletFilter, setWalletFilter] = useState<LedgerWallet | 'all'>('all')
  const [drawer, setDrawer] = useState<DrawerMode>(null)

  const [clientId, setClientId] = useState('')
  const [caseId, setCaseId] = useState('')
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('Cash')
  const [txnId, setTxnId] = useState('')
  const [note, setNote] = useState('')
  const [payoutKind, setPayoutKind] = useState<ManualLedgerKind>('supplier')
  const [payoutWallet, setPayoutWallet] = useState<LedgerWallet>('Cash')
  const [party, setParty] = useState('')
  const [error, setError] = useState<string | undefined>()

  const paymentFields = useTouchedFields<
    'clientId' | 'caseId' | 'amount' | 'note' | 'txnId'
  >()
  const payoutFields = useTouchedFields<
    'amount' | 'party' | 'note' | 'txnId'
  >()

  const casesById = useMemo(
    () => new Map(cases.map((item) => [item.id, item])),
    [cases],
  )

  const book = useMemo(
    () =>
      buildMoneyBook({
        payments,
        settlements,
        manual,
        clientName: (id) => getClientById(id)?.name,
        subAgentName: (id) => getSubAgentById(id)?.name,
        caseLabel: (id) => {
          const item = casesById.get(id)
          if (!item) return undefined
          return item.destination
            ? `${item.service} · ${item.destination}`
            : item.service
        },
      }),
    [payments, settlements, manual, casesById],
  )

  const summary = useMemo(() => summarizeMoneyBook(book), [book])

  const outstanding = useMemo(() => {
    let total = 0
    for (const item of cases) {
      if (isOpenService(item.status)) total += item.balance
    }
    return total
  }, [cases])

  const filtered = useMemo(() => {
    let direction: DirectionFilter = directionFilter
    if (selectedStat === 'in') direction = 'in'
    if (selectedStat === 'out') direction = 'out'
    // Keep full-book running balances so filters never invent a negative start.
    return filterMoneyBook(book, {
      direction,
      wallet: walletFilter,
    })
  }, [book, directionFilter, walletFilter, selectedStat])

  const clientOptions = useMemo(
    () =>
      clients
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((client) => ({ value: client.id, label: client.name })),
    [clients],
  )

  const caseOptions = useMemo(() => {
    if (!clientId) return []
    return cases
      .filter((item) => item.clientId === clientId)
      .filter((item) => isOpenService(item.status) || item.balance > 0)
      .map((item) => ({
        value: item.id,
        label: `${item.service}${item.destination ? ` · ${item.destination}` : ''} (${formatPaymentAmount(item.balance)} due)`,
      }))
  }, [cases, clientId])

  const needsTxnId =
    drawer === 'payment'
      ? method === 'bKash' || method === 'Nagad'
      : payoutWallet === 'bKash' || payoutWallet === 'Nagad'

  const clientFieldError = validateRequiredSelect(clientId, 'client')
  const caseFieldError = validateRequiredSelect(caseId, 'service')
  const amountError = validateRequiredMoney(amount)
  const noteError = validateOptionalText(note, 'Note', 200)
  const partyError =
    drawer === 'payout' && payoutKind === 'supplier'
      ? validateRequiredText(party, 'Supplier name')
      : validateOptionalText(party, 'Who', 80)
  const txnError =
    needsTxnId && !txnId.trim()
      ? 'Add the transaction ID from the receipt.'
      : undefined

  const writeStatQuery = (stat: MoneyStatId | 'all') => {
    const next = new URLSearchParams(searchParams)
    if (stat === 'all') next.delete('stat')
    else next.set('stat', stat)
    setSearchParams(next, { replace: true })
  }

  useEffect(() => {
    const fromUrl = moneyStatFromSearch(searchParams.get('stat'))
    if (!fromUrl) return
    setSelectedStat(fromUrl)
    if (fromUrl === 'in') setDirectionFilter('in')
    else if (fromUrl === 'out') setDirectionFilter('out')
    else setDirectionFilter('all')
  }, [searchParams])

  const selectStat = (id: string) => {
    const next = id as MoneyStatId | 'all'
    if (next === selectedStat) {
      setSelectedStat('all')
      setDirectionFilter('all')
      writeStatQuery('all')
      return
    }
    setSelectedStat(next)
    if (next === 'in') setDirectionFilter('in')
    else if (next === 'out') setDirectionFilter('out')
    else setDirectionFilter('all')
    writeStatQuery(next)
  }

  const closeDrawer = () => {
    setDrawer(null)
    setError(undefined)
  }

  const resetSharedFields = () => {
    setAmount('')
    setNote('')
    setTxnId('')
    setParty('')
    setCaseId('')
  }

  const handlePaymentSubmit = (event: FormEvent) => {
    event.preventDefault()
    paymentFields.markAllTouched([
      'clientId',
      'caseId',
      'amount',
      'note',
      'txnId',
    ])
    if (
      clientFieldError ||
      caseFieldError ||
      amountError ||
      noteError ||
      txnError
    ) {
      return
    }
    const parsed = Number(amount.replace(/,/g, ''))
    try {
      createPayment({
        clientId,
        caseId,
        amount: parsed,
        method,
        note,
        txnId: txnId.trim() || undefined,
      })
      closeDrawer()
      resetSharedFields()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not record payment.')
    }
  }

  const handlePayoutSubmit = (event: FormEvent) => {
    event.preventDefault()
    payoutFields.markAllTouched(['amount', 'party', 'note', 'txnId'])
    if (amountError || partyError || noteError || txnError) return
    const parsed = Number(amount.replace(/,/g, ''))
    try {
      createManualLedgerEntry({
        direction: 'out',
        kind: payoutKind,
        amount: parsed,
        wallet: payoutWallet,
        party,
        note,
        txnId: txnId.trim() || undefined,
      })
      closeDrawer()
      resetSharedFields()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not record payout.')
    }
  }

  const pocketHint = useMemo(() => {
    const parts = (Object.entries(summary.byWallet) as [LedgerWallet, number][])
      .filter(([, value]) => value !== 0)
      .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
      .slice(0, 3)
      .map(([wallet, value]) => `${wallet} ${formatBdt(value)}`)
    return parts.length > 0 ? parts.join(' · ') : 'No money recorded yet'
  }, [summary.byWallet])

  return (
    <div
      className={cn(elevatedPageClass, 'pd-page pd-page--elevated pd-ops pd-money')}
      data-elevated-canvas
      aria-label="Payments"
    >
      <div className="pd-ops__toolbar">
        <div className="pd-money__intro">
          <h1 className="pd-money__title">Money book</h1>
          <p className="pd-ops__meta" role="status">
            Today · in {formatBdt(summary.todayIn)} · out{' '}
            {formatBdt(summary.todayOut)}
          </p>
        </div>
        <div className="pd-money__actions">
          <Button
            size="sm"
            variant="outline"
            className="h-9 rounded-lg"
            onClick={() => {
              setError(undefined)
              setDrawer('payout')
            }}
          >
            <ArrowUpRight size={14} strokeWidth={2.25} aria-hidden />
            Money Out
          </Button>
          <Button
            size="sm"
            className="h-9 rounded-lg"
            onClick={() => {
              setError(undefined)
              setDrawer('payment')
            }}
          >
            <Plus size={14} strokeWidth={2.25} aria-hidden />
            Client Paid
          </Button>
        </div>
      </div>

      <StatCards
        label="Money book stats"
        selectedId={selectedStat}
        onSelect={selectStat}
        cards={[
          {
            id: 'hand',
            label: 'In hand',
            value: formatBdt(summary.inHand),
            hint: pocketHint,
            icon: Wallet,
          },
          {
            id: 'in',
            label: 'Today in',
            value: formatBdt(summary.todayIn),
            icon: ArrowDownLeft,
          },
          {
            id: 'out',
            label: 'Today out',
            value: formatBdt(summary.todayOut),
            icon: ArrowUpRight,
          },
          {
            id: 'due',
            label: 'Clients still owe',
            value: formatBdt(outstanding),
            icon: Banknote,
          },
        ]}
      />

      <div className="pd-money__filters">
        <nav className="flex flex-wrap items-center gap-2" aria-label="Show">
          <FilterChipButton
            active={directionFilter === 'all' && selectedStat === 'all'}
            onClick={() => {
              setDirectionFilter('all')
              setSelectedStat('all')
              writeStatQuery('all')
            }}
          >
            All
          </FilterChipButton>
          <FilterChipButton
            active={directionFilter === 'in' || selectedStat === 'in'}
            onClick={() => {
              setDirectionFilter('in')
              setSelectedStat('in')
              writeStatQuery('in')
            }}
          >
            Money In
          </FilterChipButton>
          <FilterChipButton
            active={directionFilter === 'out' || selectedStat === 'out'}
            onClick={() => {
              setDirectionFilter('out')
              setSelectedStat('out')
              writeStatQuery('out')
            }}
          >
            Money Out
          </FilterChipButton>
        </nav>
        <nav className="flex flex-wrap items-center gap-2" aria-label="Wallet">
          <FilterChipButton
            active={walletFilter === 'all'}
            onClick={() => setWalletFilter('all')}
          >
            Every Wallet
          </FilterChipButton>
          {(['Cash', 'bKash', 'Nagad', 'Bank'] as LedgerWallet[]).map(
            (wallet) => (
              <FilterChipButton
                key={wallet}
                active={walletFilter === wallet}
                onClick={() => setWalletFilter(wallet)}
              >
                {wallet}
              </FilterChipButton>
            ),
          )}
        </nav>
      </div>

      {filtered.length === 0 ? (
        <Empty className="bg-card shadow-sm">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Wallet aria-hidden />
            </EmptyMedia>
            <EmptyTitle>
              {book.length === 0 ? 'No Payments Yet' : 'Nothing Here'}
            </EmptyTitle>
          </EmptyHeader>
          {book.length === 0 ? (
            <div className="mt-2">
              <Button
                className="h-9 rounded-lg"
                onClick={() => {
                  setError(undefined)
                  setDrawer('payment')
                }}
              >
                <Plus size={14} strokeWidth={2.25} aria-hidden />
                Client Paid
              </Button>
            </div>
          ) : null}
        </Empty>
      ) : (
        <div className={tableShellClass}>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-0">
                <TableHead className={chromeHeadClass}>When</TableHead>
                <TableHead className={chromeHeadClass}>What Happened</TableHead>
                <TableHead className={chromeHeadClass}>Wallet</TableHead>
                <TableHead className={chromeHeadClass}>In</TableHead>
                <TableHead className={chromeHeadClass}>Out</TableHead>
                <TableHead className={chromeHeadClass}>Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{formatDisplayDate(row.createdAt)}</TableCell>
                  <TableCell>
                    <div className="pd-money__what">
                      <span className="pd-money__what-title">{row.title}</span>
                      {row.party ? (
                        row.partyHref ? (
                          <Link
                            className="pd-money__what-party"
                            to={row.partyHref}
                          >
                            {row.party}
                          </Link>
                        ) : (
                          <span className="pd-money__what-party">{row.party}</span>
                        )
                      ) : null}
                      {row.note ? (
                        <span className="pd-money__what-note">{row.note}</span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{row.wallet}</Badge>
                    {row.txnId ? (
                      <span className="pd-money__txn">{row.txnId}</span>
                    ) : null}
                  </TableCell>
                  <TableCell className="pd-money__amount pd-money__amount--in">
                    {row.direction === 'in'
                      ? formatPaymentAmount(row.amount)
                      : '—'}
                  </TableCell>
                  <TableCell className="pd-money__amount pd-money__amount--out">
                    {row.direction === 'out'
                      ? formatPaymentAmount(row.amount)
                      : '—'}
                  </TableCell>
                  <TableCell className="pd-money__balance">
                    {formatPaymentAmount(row.balanceAfter)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Sheet
        open={drawer === 'payment'}
        onOpenChange={(open) => {
          if (!open) closeDrawer()
        }}
      >
        <SheetContent className={floatingSheetClass}>
          <SheetHeader className="border-b border-border px-5 py-4 pr-12">
            <SheetTitle className="text-base font-semibold">Client Paid</SheetTitle>
          </SheetHeader>
          <form
            id="money-book-payment-form"
            className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-4"
            onSubmit={handlePaymentSubmit}
            noValidate
          >
            <Select
              label="Client"
              required
              value={clientId}
              onChange={(event) => {
                setClientId(event.target.value)
                setCaseId('')
                paymentFields.markTouched('clientId')
              }}
              onBlur={paymentFields.blur('clientId')}
              options={clientOptions}
              placeholder="Select client"
              error={
                paymentFields.showError('clientId')
                  ? clientFieldError
                  : undefined
              }
            />
            <Select
              label="Service"
              required
              value={caseId}
              onChange={(event) => {
                setCaseId(event.target.value)
                paymentFields.markTouched('caseId')
              }}
              onBlur={paymentFields.blur('caseId')}
              options={caseOptions}
              placeholder={clientId ? 'Select service' : 'Choose a client first'}
              disabled={!clientId}
              error={
                paymentFields.showError('caseId') ? caseFieldError : undefined
              }
            />
            <Input
              label="Amount (৳)"
              required
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              onBlur={paymentFields.blur('amount')}
              placeholder="e.g. 10000"
              error={
                paymentFields.showError('amount') ? amountError : undefined
              }
            />
            <Select
              label="Received In"
              value={method}
              onChange={(event) => setMethod(event.target.value)}
              options={[
                { value: 'Cash', label: 'Cash' },
                { value: 'bKash', label: 'bKash' },
                { value: 'Nagad', label: 'Nagad' },
                { value: 'Bank transfer', label: 'Bank' },
                { value: 'Card', label: 'Card' },
              ]}
            />
            {needsTxnId ? (
              <Input
                label="Transaction ID"
                required
                value={txnId}
                onChange={(event) => setTxnId(event.target.value)}
                onBlur={paymentFields.blur('txnId')}
                placeholder="TrxID from the receipt"
                error={
                  paymentFields.showError('txnId') ? txnError : undefined
                }
              />
            ) : null}
            <Input
              label="Note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              onBlur={paymentFields.blur('note')}
              placeholder="Optional"
              error={paymentFields.showError('note') ? noteError : undefined}
            />
            {error ? (
              <p className="m-0 text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
          </form>
          <SheetFooter className="border-t border-border px-5 py-4 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="h-9 rounded-lg"
              onClick={closeDrawer}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="money-book-payment-form"
              className="h-9 rounded-lg"
            >
              Save
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet
        open={drawer === 'payout'}
        onOpenChange={(open) => {
          if (!open) closeDrawer()
        }}
      >
        <SheetContent className={floatingSheetClass}>
          <SheetHeader className="border-b border-border px-5 py-4 pr-12">
            <SheetTitle className="text-base font-semibold">Money Out</SheetTitle>
          </SheetHeader>
          <form
            id="money-book-payout-form"
            className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-4"
            onSubmit={handlePayoutSubmit}
            noValidate
          >
            <Select
              label="What Is This?"
              value={payoutKind}
              onChange={(event) =>
                setPayoutKind(event.target.value as ManualLedgerKind)
              }
              options={[
                { value: 'supplier', label: 'Supplier / vendor payment' },
                { value: 'expense', label: 'Office or travel expense' },
                { value: 'other_out', label: 'Other money out' },
              ]}
            />
            <Input
              label={payoutKind === 'supplier' ? 'Supplier Name' : 'Who / What'}
              required={payoutKind === 'supplier'}
              value={party}
              onChange={(event) => setParty(event.target.value)}
              onBlur={payoutFields.blur('party')}
              placeholder={
                payoutKind === 'supplier'
                  ? 'e.g. Biman Bangladesh'
                  : 'Optional'
              }
              error={payoutFields.showError('party') ? partyError : undefined}
            />
            <Input
              label="Amount (৳)"
              required
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              onBlur={payoutFields.blur('amount')}
              placeholder="e.g. 40000"
              error={payoutFields.showError('amount') ? amountError : undefined}
            />
            <Select
              label="Paid From"
              value={payoutWallet}
              onChange={(event) =>
                setPayoutWallet(event.target.value as LedgerWallet)
              }
              options={walletOptions()}
            />
            {needsTxnId ? (
              <Input
                label="Transaction ID"
                required
                value={txnId}
                onChange={(event) => setTxnId(event.target.value)}
                onBlur={payoutFields.blur('txnId')}
                placeholder="TrxID from the receipt"
                error={payoutFields.showError('txnId') ? txnError : undefined}
              />
            ) : null}
            <Input
              label="Note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              onBlur={payoutFields.blur('note')}
              placeholder="Optional"
              error={payoutFields.showError('note') ? noteError : undefined}
            />
            {error ? (
              <p className="m-0 text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
          </form>
          <SheetFooter className="border-t border-border px-5 py-4 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="h-9 rounded-lg"
              onClick={closeDrawer}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="money-book-payout-form"
              className="h-9 rounded-lg"
            >
              Save
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}
