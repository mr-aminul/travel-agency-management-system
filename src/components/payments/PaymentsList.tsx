import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Eye, FileText, Plus, Wallet } from 'lucide-react'
import { getCaseById } from '@/lib/casesStore'
import { workInvoicePath } from '@/lib/workPaths'
import { formatDisplayDate } from '@/lib/formatDate'
import { Badge } from '@/components/shadcn/badge'
import { Button } from '@/components/shadcn/button'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/shadcn/empty'
import { Input, Select } from '@/components/clients/clientShadcnFields'
import {
  chromeHeadClass,
  floatingSheetClass,
  tableShellClass,
} from '@/components/clients/shadcnChrome'
import {
  Sheet,
  SheetContent,
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
import { cn } from '@/lib/utils'
import type { Case } from '@/types/case'

function formatDate(value: string): string {
  return formatDisplayDate(value)
}

const sectionHeaderActionClass =
  'h-9 gap-1.5 rounded-lg border-transparent bg-primary px-3 text-sm text-primary-foreground shadow-xs hover:bg-primary/80'

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

  const paidTotal = payments.reduce((sum, payment) => sum + payment.amount, 0)

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div
          className={
            dueTotal > 0
              ? 'flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[color-mix(in_srgb,var(--color-red)_30%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-red)_7%,var(--color-surface))] px-4 py-3.5'
              : 'flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3.5 shadow-sm'
          }
          role="status"
        >
          <div className="flex min-w-0 flex-col gap-0.5">
            <p
              className={
                dueTotal > 0
                  ? 'm-0 text-[0.625rem] font-medium uppercase tracking-wide text-[var(--color-red)]'
                  : 'm-0 text-[0.625rem] font-medium uppercase tracking-wide text-muted-foreground'
              }
            >
              Still Due
            </p>
            <p className="m-0 text-xl font-semibold leading-tight text-foreground">
              {formatPaymentAmount(dueTotal)}
            </p>
          </div>
          <Button
            className="h-9 rounded-lg"
            variant={dueTotal > 0 ? 'default' : 'outline'}
            onClick={beginRecording}
            disabled={!canRecord}
          >
            <Wallet size={14} strokeWidth={2.25} aria-hidden />
            {dueTotal > 0 ? 'Collect Payment' : 'Record Payment'}
          </Button>
        </div>
        <div className="flex flex-col justify-center gap-0.5 rounded-xl border border-border bg-card px-4 py-3.5 shadow-sm">
          <p className="m-0 text-[0.625rem] font-medium uppercase tracking-wide text-muted-foreground">
            Collected
          </p>
          <p className="m-0 text-xl font-semibold leading-tight text-foreground">
            {formatPaymentAmount(paidTotal)}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3.5 py-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <span
              className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-[var(--color-theme-subtle)] text-[var(--color-theme-ink)]"
              aria-hidden
            >
              <Wallet size={15} strokeWidth={2.25} />
            </span>
            <h2 className="m-0 text-sm font-semibold">Payment History</h2>
            <Badge
              variant="secondary"
              className="h-5 min-w-5 justify-center rounded-full px-1.5 tabular-nums"
            >
              {payments.length}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {caseId ? (
              <Link
                to={workInvoicePath({ id: caseId, clientId })}
                className={cn(
                  'inline-flex items-center no-underline',
                  sectionHeaderActionClass,
                )}
              >
                <FileText size={14} strokeWidth={2.25} aria-hidden />
                Invoice
              </Link>
            ) : null}
            {dueTotal > 0 ? null : (
              <Button
                type="button"
                size="sm"
                className={sectionHeaderActionClass}
                onClick={beginRecording}
                disabled={!canRecord}
                aria-label="Record Payment"
              >
                <Plus data-icon="inline-start" aria-hidden />
                Record
              </Button>
            )}
          </div>
        </div>

      {payments.length === 0 ? (
        <div className="px-4 py-10">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Wallet />
              </EmptyMedia>
              <EmptyTitle>No Payments Yet</EmptyTitle>
            </EmptyHeader>
          </Empty>
        </div>
      ) : (
        <div className={cn(tableShellClass, 'rounded-none border-0 shadow-none')}>
        <Table>
          <TableHeader>
            <TableRow className="border-0 hover:bg-transparent">
              <TableHead className={chromeHeadClass}>Date</TableHead>
              {!caseId ? <TableHead className={chromeHeadClass}>Service</TableHead> : null}
              <TableHead className={chromeHeadClass}>Method</TableHead>
              <TableHead className={chromeHeadClass}>Note</TableHead>
              <TableHead className={chromeHeadClass}>Amount</TableHead>
              <TableHead className={chromeHeadClass}>Invoice</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((payment) => {
              const linked = getCaseById(payment.caseId)
              return (
                <TableRow key={payment.id}>
                  <TableCell className="px-[0.85rem] py-2.5 whitespace-nowrap text-sm tabular-nums text-muted-foreground">
                    {formatDate(payment.createdAt)}
                  </TableCell>
                  {!caseId ? (
                    <TableCell className="px-[0.85rem] py-2.5 font-medium">
                      {linked ? linked.service : 'Service'}
                    </TableCell>
                  ) : null}
                  <TableCell className="px-[0.85rem] py-2.5 text-sm">
                    {payment.method}
                  </TableCell>
                  <TableCell className="max-w-[16rem] truncate px-[0.85rem] py-2.5 text-sm text-muted-foreground">
                    {payment.note || '—'}
                  </TableCell>
                  <TableCell className="px-[0.85rem] py-2.5 tabular-nums font-medium">
                    {formatPaymentAmount(payment.amount)}
                  </TableCell>
                  <TableCell className="px-[0.85rem] py-2.5">
                    <Link
                      to={workInvoicePath({
                        id: payment.caseId,
                        clientId: payment.clientId,
                      })}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-[var(--color-surface)] px-2.5 text-xs font-medium text-foreground no-underline shadow-xs transition-colors hover:bg-muted/40"
                      aria-label="View invoice"
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
        </div>
      )}
      </div>

      <Sheet open={recording} onOpenChange={(open) => { if (!open) endRecording() }}>
        <SheetContent className={floatingSheetClass}>
          <SheetHeader className="border-b border-border px-5 py-4 pr-12">
            <SheetTitle className="text-base font-semibold">Collect Payment</SheetTitle>
          </SheetHeader>
        <form className="flex flex-col gap-4 p-5" onSubmit={handleSubmit} noValidate>
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
            <p className="m-0 text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Button type="submit" className="h-9 rounded-lg">Save Payment</Button>
            <Button type="button" variant="outline" className="h-9 rounded-lg" onClick={endRecording}>
              Cancel
            </Button>
          </div>
        </form>
        </SheetContent>
      </Sheet>
    </div>
  )
}
