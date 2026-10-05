import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Eye, FileText, Plus, Wallet } from 'lucide-react'
import {
  Button,
  EmptyState,
  Input,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui'
import { getCaseById } from '@/lib/casesStore'
import { workInvoicePath } from '@/lib/workPaths'
import { formatDisplayDate } from '@/lib/formatDate'
import {
  createPayment,
  formatPaymentAmount,
  usePaymentsByCaseId,
  usePaymentsByClientId,
} from '@/lib/paymentsStore'
import type { Case } from '@/types/case'

function formatDate(value: string): string {
  return formatDisplayDate(value)
}

type PaymentsListProps = {
  clientId: string
  caseId?: string
  /** Cases available when recording a payment (client-level). */
  cases?: Case[]
}

export function PaymentsList({ clientId, caseId, cases = [] }: PaymentsListProps) {
  const byClient = usePaymentsByClientId(clientId)
  const byCase = usePaymentsByCaseId(caseId ?? '')
  const payments = caseId ? byCase : byClient
  const [recording, setRecording] = useState(false)
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('Cash')
  const [note, setNote] = useState('')
  const [selectedCaseId, setSelectedCaseId] = useState(caseId ?? '')
  const [error, setError] = useState<string | undefined>()

  const openCases = cases.filter(
    (item) => item.status !== 'Completed' && item.status !== 'Cancelled',
  )
  const caseOptions = (caseId
    ? cases.filter((item) => item.id === caseId)
    : openCases.length > 0
      ? openCases
      : cases
  ).map((item) => ({
    value: item.id,
    label: `${item.service}${item.destination ? ` · ${item.destination}` : ''} (${formatPaymentAmount(item.balance)} due)`,
  }))

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const targetCaseId = caseId || selectedCaseId
    const parsed = Number(amount.replace(/,/g, ''))
    if (!targetCaseId) {
      setError('Select a service for this payment.')
      return
    }
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError('Enter a valid amount.')
      return
    }
    try {
      createPayment({
        clientId,
        caseId: targetCaseId,
        amount: parsed,
        method,
        note,
      })
      setRecording(false)
      setAmount('')
      setNote('')
      setError(undefined)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not record payment.')
    }
  }

  return (
    <div className="pd-payments">
      <div className="pd-payments__toolbar">
        <p className="pd-payments__hint">Linked to this service balance.</p>
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
          <Button
            size="sm"
            variant={recording ? 'secondary' : 'primary'}
            onClick={() => {
              setRecording((value) => !value)
              setError(undefined)
              if (caseId) setSelectedCaseId(caseId)
            }}
            disabled={caseOptions.length === 0}
          >
            <Plus size={14} strokeWidth={2.25} aria-hidden />
            {recording ? 'Cancel' : 'Record payment'}
          </Button>
        </div>
      </div>

      {recording ? (
        <form className="pd-payments__form" onSubmit={handleSubmit} noValidate>
          {!caseId ? (
            <Select
              label="Case"
              required
              value={selectedCaseId}
              onChange={(event) => setSelectedCaseId(event.target.value)}
              options={caseOptions}
              placeholder="Select case"
            />
          ) : null}
          <Input
            label="Amount (৳)"
            required
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="e.g. 10000"
          />
          <Select
            label="Method"
            value={method}
            onChange={(event) => setMethod(event.target.value)}
            options={[
              { value: 'Cash', label: 'Cash' },
              { value: 'bKash', label: 'bKash' },
              { value: 'Bank transfer', label: 'Bank transfer' },
              { value: 'Card', label: 'Card' },
            ]}
          />
          <Input
            label="Note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Optional"
          />
          {error ? (
            <p className="pd-field__error" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit">Save payment</Button>
        </form>
      ) : null}

      {payments.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="No payments yet"
          description="Record a payment against a service to reduce the balance due."
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
    </div>
  )
}
