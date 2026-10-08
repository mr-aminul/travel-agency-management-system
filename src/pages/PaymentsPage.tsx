import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Banknote, Plus, Receipt, Users, Wallet } from 'lucide-react'
import { StatCards } from '@/components/StatCards'
import { useCases } from '@/lib/casesStore'
import { getClientById, useClients } from '@/lib/clientsStore'
import { formatBdt } from '@/lib/dashboardMetrics'
import {
  validateOptionalText,
  validateRequiredMoney,
  validateRequiredSelect,
} from '@/lib/fieldValidation'
import { formatDisplayDate } from '@/lib/formatDate'
import {
  createPayment,
  formatPaymentAmount,
  usePayments,
} from '@/lib/paymentsStore'
import { useTouchedFields } from '@/lib/useTouchedFields'
import { workDetailPath } from '@/lib/workPaths'
import {
  Button,
  EmptyState,
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

type PaymentStatId = 'all' | 'collected' | 'clients' | 'due'

function isOpenService(status: string): boolean {
  return status !== 'Completed' && status !== 'Cancelled'
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

function paymentDateKey(value: string): string {
  return value.slice(0, 10)
}

export default function PaymentsPage() {
  const payments = usePayments()
  const cases = useCases()
  const clients = useClients()
  const [selectedStat, setSelectedStat] = useState<PaymentStatId>('all')
  const [recording, setRecording] = useState(false)
  const [clientId, setClientId] = useState('')
  const [caseId, setCaseId] = useState('')
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('Cash')
  const [txnId, setTxnId] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | undefined>()
  const { markAllTouched, showError, blur, markTouched } = useTouchedFields<
    'clientId' | 'caseId' | 'amount' | 'note' | 'txnId'
  >()

  const casesById = useMemo(
    () => new Map(cases.map((item) => [item.id, item])),
    [cases],
  )

  const today = todayKey()
  const todayPayments = useMemo(
    () => payments.filter((item) => paymentDateKey(item.createdAt) === today),
    [payments, today],
  )
  const todayTotal = todayPayments.reduce((sum, item) => sum + item.amount, 0)

  const stats = useMemo(() => {
    let collected = 0
    const payingClients = new Set<string>()
    for (const payment of payments) {
      collected += payment.amount
      payingClients.add(payment.clientId)
    }
    let outstanding = 0
    for (const item of cases) {
      if (isOpenService(item.status)) outstanding += item.balance
    }
    return {
      total: payments.length,
      collected,
      payingClients: payingClients.size,
      outstanding,
    }
  }, [payments, cases])

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

  const needsTxnId = method === 'bKash' || method === 'Nagad'
  const clientFieldError = validateRequiredSelect(clientId, 'client')
  const caseFieldError = validateRequiredSelect(caseId, 'service')
  const amountError = validateRequiredMoney(amount)
  const noteError = validateOptionalText(note, 'Note', 200)
  const txnError =
    needsTxnId && !txnId.trim()
      ? 'Add the transaction ID from the receipt.'
      : undefined

  const filtered = payments.filter((payment) => {
    if (selectedStat !== 'due') return true
    const caseItem = casesById.get(payment.caseId)
    return Boolean(
      caseItem && isOpenService(caseItem.status) && caseItem.balance > 0,
    )
  })

  const selectStat = (id: string) => {
    const next = id as PaymentStatId
    setSelectedStat(next === selectedStat ? 'all' : next)
  }

  const beginRecording = () => {
    setError(undefined)
    setRecording(true)
  }

  const endRecording = () => {
    setRecording(false)
    setError(undefined)
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    markAllTouched(['clientId', 'caseId', 'amount', 'note', 'txnId'])
    if (clientFieldError || caseFieldError || amountError || noteError || txnError) {
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
      endRecording()
      setAmount('')
      setNote('')
      setTxnId('')
      setCaseId('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not record payment.')
    }
  }

  return (
    <div className="pd-page pd-ops" aria-label="Payments">
      <div className="pd-ops__toolbar">
        <p className="pd-ops__meta" role="status">
          Today&apos;s collections · {formatBdt(todayTotal)} ·{' '}
          {todayPayments.length}{' '}
          {todayPayments.length === 1 ? 'payment' : 'payments'}
        </p>
        <Button size="sm" onClick={beginRecording}>
          <Plus size={14} strokeWidth={2.25} aria-hidden />
          Record payment
        </Button>
      </div>

      <StatCards
        label="Payment stats"
        selectedId={selectedStat}
        onSelect={selectStat}
        cards={[
          {
            id: 'all',
            label: 'Total payments',
            value: String(stats.total),
            icon: Receipt,
            tone: 'brand',
          },
          {
            id: 'collected',
            label: 'Collected',
            value: formatBdt(stats.collected),
            icon: Banknote,
            tone: 'success',
          },
          {
            id: 'clients',
            label: 'Paying clients',
            value: String(stats.payingClients),
            icon: Users,
            tone: 'info',
          },
          {
            id: 'due',
            label: 'Outstanding',
            value: formatBdt(stats.outstanding),
            icon: Wallet,
            tone: 'warning',
          },
        ]}
      />
      {filtered.length === 0 ? (
        <EmptyState
          title={payments.length === 0 ? 'No payments yet' : 'No matching payments'}
          description={
            payments.length === 0
              ? 'Record a payment from the toolbar or a client file.'
              : 'Try another stat card to see more collections.'
          }
          action={
            payments.length === 0 ? (
              <Button onClick={beginRecording}>
                <Plus size={14} strokeWidth={2.25} aria-hidden />
                Record payment
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Note</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((payment) => {
              const client = getClientById(payment.clientId)
              const caseItem = casesById.get(payment.caseId)
              return (
                <TableRow key={payment.id}>
                  <TableCell>{formatDisplayDate(payment.createdAt)}</TableCell>
                  <TableCell>
                    <Link to={`/clients/${payment.clientId}`}>
                      {client?.name ?? payment.clientId}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link
                      to={workDetailPath({
                        id: payment.caseId,
                        clientId: payment.clientId,
                      })}
                    >
                      {caseItem?.service ?? 'Service'}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {payment.method}
                    {payment.txnId ? ` · ${payment.txnId}` : ''}
                  </TableCell>
                  <TableCell>{formatPaymentAmount(payment.amount)}</TableCell>
                  <TableCell>{payment.note || '—'}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}

      <SideDrawer
        open={recording}
        onClose={endRecording}
        title="Record payment"
        description="Pick a client and service, then enter what you collected."
        className="pd-payments-drawer"
      >
        <form className="pd-payments__form" onSubmit={handleSubmit} noValidate>
          <Select
            label="Client"
            required
            value={clientId}
            onChange={(event) => {
              setClientId(event.target.value)
              setCaseId('')
              markTouched('clientId')
            }}
            onBlur={blur('clientId')}
            options={clientOptions}
            placeholder="Select client"
            error={showError('clientId') ? clientFieldError : undefined}
          />
          <Select
            label="Service"
            required
            value={caseId}
            onChange={(event) => {
              setCaseId(event.target.value)
              markTouched('caseId')
            }}
            onBlur={blur('caseId')}
            options={caseOptions}
            placeholder={clientId ? 'Select service' : 'Choose a client first'}
            disabled={!clientId}
            error={showError('caseId') ? caseFieldError : undefined}
          />
          <Input
            label="Amount (৳)"
            required
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            onBlur={blur('amount')}
            placeholder="e.g. 10000"
            error={showError('amount') ? amountError : undefined}
          />
          <Select
            label="Method"
            value={method}
            onChange={(event) => setMethod(event.target.value)}
            options={[
              { value: 'Cash', label: 'Cash' },
              { value: 'bKash', label: 'bKash' },
              { value: 'Nagad', label: 'Nagad' },
              { value: 'Bank transfer', label: 'Bank transfer' },
              { value: 'Card', label: 'Card' },
            ]}
          />
          {needsTxnId ? (
            <Input
              label="Transaction ID"
              required
              value={txnId}
              onChange={(event) => setTxnId(event.target.value)}
              onBlur={blur('txnId')}
              placeholder="TrxID from the receipt"
              error={showError('txnId') ? txnError : undefined}
            />
          ) : null}
          <Input
            label="Note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            onBlur={blur('note')}
            placeholder="Optional"
            error={showError('note') ? noteError : undefined}
          />
          {error ? (
            <p className="pd-field__error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="pd-payments__form-actions">
            <Button type="submit">Save payment</Button>
            <Button type="button" variant="secondary" onClick={endRecording}>
              Cancel
            </Button>
          </div>
        </form>
      </SideDrawer>
    </div>
  )
}
