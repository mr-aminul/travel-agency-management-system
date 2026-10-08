import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Eye, FileText, Plus, Wallet } from 'lucide-react'
import { getCaseById } from '@/lib/casesStore'
import { workInvoicePath } from '@/lib/workPaths'
import { formatDisplayDate } from '@/lib/formatDate'
import { Button, EmptyState, Input, Select, SideDrawer, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui'
import {
  validateOptionalText,
  validateRequiredMoney,
  validateRequiredSelect,
} from '@/lib/fieldValidation'
import {
  createPayment,
  formatPaymentAmount,
  usePaymentsByCaseId,
  usePaymentsByClientId,
} from '@/lib/paymentsStore'
import { useTouchedFields } from '@/lib/useTouchedFields'
import type { Case } from '@/types/case'

function formatDate(value: string): string {
  return formatDisplayDate(value)
}

function highestDueCaseId(items: Case[]): string {
  let bestId = ''
  let bestBalance = -1
  for (const item of items) {
    if (item.balance > bestBalance) {
      bestBalance = item.balance
      bestId = item.id
    }
  }
  return bestId
}

type PaymentsListProps = {
  clientId: string
  caseId?: string
  /** Cases available when recording a payment (client-level). */
  cases?: Case[]
  /** Open the record-payment drawer on mount / when this flips true. */
  startRecording?: boolean
  onRecordingChange?: (recording: boolean) => void
}

export function PaymentsList({
  clientId,
  caseId,
  cases = [],
  startRecording = false,
  onRecordingChange,
}: PaymentsListProps) {
  const byClient = usePaymentsByClientId(clientId)
  const byCase = usePaymentsByCaseId(caseId ?? '')
  const payments = caseId ? byCase : byClient
  const [recording, setRecording] = useState(startRecording)
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('Cash')
  const [txnId, setTxnId] = useState('')
  const [note, setNote] = useState('')
  const [selectedCaseId, setSelectedCaseId] = useState(caseId ?? '')
  const [error, setError] = useState<string | undefined>()
  const { markAllTouched, showError, blur, markTouched } = useTouchedFields<
    'caseId' | 'amount' | 'note' | 'txnId'
  >()
  const caseFieldError = caseId
    ? undefined
    : validateRequiredSelect(selectedCaseId, 'service')
  const amountError = validateRequiredMoney(amount)
  const noteError = validateOptionalText(note, 'Note', 200)
  const needsTxnId =
    method === 'bKash' || method === 'Nagad' || method === 'Bank transfer'
  const txnError =
    needsTxnId && !txnId.trim()
      ? 'Add the transaction / reference ID.'
      : validateOptionalText(txnId, 'Txn ID', 80)

  const openCases = cases.filter(
    (item) => item.status !== 'Completed' && item.status !== 'Cancelled',
  )
  const dueCases = (caseId
    ? cases.filter((item) => item.id === caseId)
    : openCases
  ).filter((item) => item.balance > 0)
  const dueTotal = dueCases.reduce((sum, item) => sum + item.balance, 0)
  const caseOptions = (caseId
    ? cases.filter((item) => item.id === caseId)
    : openCases.length > 0
      ? openCases
      : cases
  ).map((item) => ({
    value: item.id,
    label: `${item.service}${item.destination ? ` · ${item.destination}` : ''} (${formatPaymentAmount(item.balance)} due)`,
  }))

  const pickCaseForRecording = () => {
    if (caseId) {
      setSelectedCaseId(caseId)
      return
    }
    setSelectedCaseId((current) =>
      current ||
      highestDueCaseId(dueCases.length > 0 ? dueCases : openCases),
    )
  }

  const beginRecording = () => {
    setError(undefined)
    pickCaseForRecording()
    setRecording(true)
    onRecordingChange?.(true)
  }

  const endRecording = () => {
    setRecording(false)
    onRecordingChange?.(false)
  }

  useEffect(() => {
    if (!startRecording) return
    setError(undefined)
    pickCaseForRecording()
    setRecording(true)
  }, [startRecording])

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    markAllTouched(['caseId', 'amount', 'note', 'txnId'])
    if (caseFieldError || amountError || noteError || txnError) return
    const targetCaseId = caseId || selectedCaseId
    const parsed = Number(amount.replace(/,/g, ''))
    try {
      createPayment({
        clientId,
        caseId: targetCaseId,
        amount: parsed,
        method,
        note,
        txnId: txnId.trim() || undefined,
      })
      endRecording()
      setAmount('')
      setNote('')
      setTxnId('')
      setError(undefined)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not record payment.')
    }
  }

  const canRecord = caseOptions.length > 0

  return (
    <div className="pd-payments">
      {dueTotal > 0 ? (
        <div className="pd-payments__due" role="status">
          <div className="pd-payments__due-copy">
            <p className="pd-payments__due-label">Still due</p>
            <p className="pd-payments__due-amount">
              {formatPaymentAmount(dueTotal)}
            </p>
          </div>
          <Button size="sm" onClick={beginRecording} disabled={!canRecord}>
            <Wallet size={14} strokeWidth={2.25} aria-hidden />
            Collect payment
          </Button>
        </div>
      ) : null}

      <div className="pd-payments__toolbar">
        <h2 className="pd-payments__heading">
          Payment History ({payments.length})
        </h2>
        <div className="pd-payments__actions">
          {caseId ? (
            <Link
              to={workInvoicePath({ id: caseId, clientId })}
              className="pd-btn pd-btn--secondary pd-btn--sm"
            >
              <FileText size={14} strokeWidth={2.25} aria-hidden />
              View invoice
            </Link>
          ) : null}
          {dueTotal > 0 ? null : (
            <Button
              size="sm"
              variant="secondary"
              onClick={beginRecording}
              disabled={!canRecord}
            >
              <Plus size={14} strokeWidth={2.25} aria-hidden />
              Record payment
            </Button>
          )}
        </div>
      </div>

      {payments.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="No payments yet"
          description={
            dueTotal > 0
              ? 'Collect a payment against a service to reduce the balance due.'
              : 'Record a payment against a service when money comes in.'
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              {!caseId ? <TableHead>Service</TableHead> : null}
              <TableHead>Method</TableHead>
              <TableHead>Note</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Invoice</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((payment) => {
              const linked = getCaseById(payment.caseId)
              return (
                <TableRow key={payment.id}>
                  <TableCell>{formatDate(payment.createdAt)}</TableCell>
                  {!caseId ? (
                    <TableCell>
                      {linked ? linked.service : 'Service'}
                    </TableCell>
                  ) : null}
                  <TableCell>{payment.method}</TableCell>
                  <TableCell>{payment.note || '—'}</TableCell>
                  <TableCell className="pd-cases__balance">
                    {formatPaymentAmount(payment.amount)}
                  </TableCell>
                  <TableCell>
                    <Link
                      to={workInvoicePath({
                        id: payment.caseId,
                        clientId: payment.clientId,
                      })}
                      className="pd-btn pd-btn--secondary pd-btn--sm pd-payments__view-btn"
                    >
                      <Eye size={14} strokeWidth={2.25} aria-hidden />
                      View
                    </Link>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}

      <SideDrawer
        open={recording}
        onClose={endRecording}
        title="Collect payment"
        description={
          dueTotal > 0
            ? `${formatPaymentAmount(dueTotal)} still due`
            : 'Record what you received against a service.'
        }
        className="pd-payments-drawer"
      >
        <form className="pd-payments__form" onSubmit={handleSubmit} noValidate>
          {!caseId ? (
            <Select
              label="Service"
              required
              value={selectedCaseId}
              onChange={(event) => {
                setSelectedCaseId(event.target.value)
                markTouched('caseId')
              }}
              onBlur={blur('caseId')}
              options={caseOptions}
              placeholder="Select service"
              error={showError('caseId') ? caseFieldError : undefined}
            />
          ) : null}
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
              label="Txn / reference ID"
              required
              value={txnId}
              onChange={(event) => setTxnId(event.target.value)}
              onBlur={blur('txnId')}
              placeholder="bKash / Nagad / bank ref"
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
