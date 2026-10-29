import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  Plus,
  Wallet,
} from 'lucide-react'
import { StatCards } from '@/components/StatCards'
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
import {
  Badge,
  Button,
  EmptyState,
  FilterChip,
  FilterChips,
  Input,
  Select,
  SideDrawer,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui'
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
    <div className="pd-page pd-ops pd-money" aria-label="Payments">
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
            variant="secondary"
            onClick={() => {
              setError(undefined)
              setDrawer('payout')
            }}
          >
            <ArrowUpRight size={14} strokeWidth={2.25} aria-hidden />
            Money out
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setError(undefined)
              setDrawer('payment')
            }}
          >
            <Plus size={14} strokeWidth={2.25} aria-hidden />
            Client paid
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
            tone: 'brand',
          },
          {
            id: 'in',
            label: 'Today in',
            value: formatBdt(summary.todayIn),
            icon: ArrowDownLeft,
            tone: 'success',
          },
          {
            id: 'out',
            label: 'Today out',
            value: formatBdt(summary.todayOut),
            icon: ArrowUpRight,
            tone: 'info',
          },
          {
            id: 'due',
            label: 'Clients still owe',
            value: formatBdt(outstanding),
            icon: Banknote,
            tone: 'warning',
          },
        ]}
      />

      <div className="pd-money__filters">
        <FilterChips label="Show">
          <FilterChip
            active={directionFilter === 'all' && selectedStat === 'all'}
            onClick={() => {
              setDirectionFilter('all')
              setSelectedStat('all')
              writeStatQuery('all')
            }}
          >
            All
          </FilterChip>
          <FilterChip
            active={directionFilter === 'in' || selectedStat === 'in'}
            onClick={() => {
              setDirectionFilter('in')
              setSelectedStat('in')
              writeStatQuery('in')
            }}
          >
            Money in
          </FilterChip>
          <FilterChip
            active={directionFilter === 'out' || selectedStat === 'out'}
            onClick={() => {
              setDirectionFilter('out')
              setSelectedStat('out')
              writeStatQuery('out')
            }}
          >
            Money out
          </FilterChip>
        </FilterChips>
        <FilterChips label="Wallet">
          <FilterChip
            active={walletFilter === 'all'}
            onClick={() => setWalletFilter('all')}
          >
            Every wallet
          </FilterChip>
          {(['Cash', 'bKash', 'Nagad', 'Bank'] as LedgerWallet[]).map(
            (wallet) => (
              <FilterChip
                key={wallet}
                active={walletFilter === wallet}
                onClick={() => setWalletFilter(wallet)}
              >
                {wallet}
              </FilterChip>
            ),
          )}
        </FilterChips>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={book.length === 0 ? 'Your money book is empty' : 'Nothing here'}
          description={
            book.length === 0
              ? 'When a client pays, it shows up here. Use Money out when you pay a supplier or other bill.'
              : 'Try another filter to see more movements.'
          }
          action={
            book.length === 0 ? (
              <Button
                onClick={() => {
                  setError(undefined)
                  setDrawer('payment')
                }}
              >
                <Plus size={14} strokeWidth={2.25} aria-hidden />
                Client paid
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>What happened</TableHead>
              <TableHead>Wallet</TableHead>
              <TableHead>In</TableHead>
              <TableHead>Out</TableHead>
              <TableHead>Balance</TableHead>
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
                  <Badge variant="neutral">{row.wallet}</Badge>
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
      )}

      <SideDrawer
        open={drawer === 'payment'}
        onClose={closeDrawer}
        title="Client paid"
        description="Money that came in for a client service. It updates their balance too."
        className="pd-payments-drawer"
      >
        <form
          className="pd-payments__form"
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
            label="Received in"
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
            <p className="pd-field__error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="pd-payments__form-actions">
            <Button type="submit">Save</Button>
            <Button type="button" variant="secondary" onClick={closeDrawer}>
              Cancel
            </Button>
          </div>
        </form>
      </SideDrawer>

      <SideDrawer
        open={drawer === 'payout'}
        onClose={closeDrawer}
        title="Money out"
        description="Pay a supplier, vendor, or other bill from a wallet."
        className="pd-payments-drawer"
      >
        <form
          className="pd-payments__form"
          onSubmit={handlePayoutSubmit}
          noValidate
        >
          <Select
            label="What is this?"
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
            label={payoutKind === 'supplier' ? 'Supplier name' : 'Who / what'}
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
            label="Paid from"
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
            <p className="pd-field__error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="pd-payments__form-actions">
            <Button type="submit">Save</Button>
            <Button type="button" variant="secondary" onClick={closeDrawer}>
              Cancel
            </Button>
          </div>
        </form>
      </SideDrawer>
    </div>
  )
}
