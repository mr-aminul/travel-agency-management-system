import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { Wallet } from 'lucide-react'
import { Button } from '@/components/shadcn/button'
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/shadcn/empty'
import { Label } from '@/components/shadcn/label'
import { cn } from '@/lib/utils'
import { formatInvoiceAmount } from '@/lib/caseInvoice'
import {
  completeMockInvoiceCheckout,
  INVOICE_PAY_METHODS,
  invoicePayErrorMessage,
  overlayInvoice,
  publicInvoiceViewPath,
  startInvoiceCheckout,
  type InvoicePayMethod,
} from '@/lib/invoicePay'
import {
  invoiceForDocument,
  resolvePublicInvoice,
} from '@/lib/invoiceShare'
import { layoutConfig } from '@/config/layout'
import '@/styles/layout-invoice-pay.css'

export default function PublicInvoicePayPage() {
  const { token = '' } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [method, setMethod] = useState<InvoicePayMethod>('bKash')
  const [invoice, setInvoice] = useState(() => null as ReturnType<
    typeof overlayInvoice
  > | null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void resolvePublicInvoice(token).then((resolved) => {
      if (cancelled) return
      setInvoice(
        resolved
          ? overlayInvoice(
              invoiceForDocument(resolved, layoutConfig.brand.logoUrl ?? ''),
              token,
            )
          : null,
      )
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [token])

  const amountDue = invoice?.balanceDue ?? 0
  const methods = useMemo(
    () => INVOICE_PAY_METHODS.map((item) => ({ ...item })),
    [],
  )

  if (loading) {
    return (
      <div className="pd-invoice-checkout">
        <Empty className="bg-card shadow-sm">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Wallet aria-hidden />
            </EmptyMedia>
            <EmptyTitle>Loading Payment…</EmptyTitle>
          </EmptyHeader>
        </Empty>
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="pd-invoice-checkout">
        <Empty className="bg-card shadow-sm">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Wallet aria-hidden />
            </EmptyMedia>
            <EmptyTitle>Invoice Not Found</EmptyTitle>
          </EmptyHeader>
        </Empty>
      </div>
    )
  }

  if (amountDue <= 0) {
    return <Navigate to={publicInvoiceViewPath(token, 'success')} replace />
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const checkout = await startInvoiceCheckout(token, amountDue)
      if (checkout.redirectUrl) {
        window.location.href = checkout.redirectUrl
        return
      }
      await completeMockInvoiceCheckout({
        token,
        checkoutId: checkout.checkoutId,
        amountBdt: checkout.amountBdt || amountDue,
        method,
      })
      navigate(publicInvoiceViewPath(token, 'success'), { replace: true })
    } catch (caught) {
      setError(
        invoicePayErrorMessage(caught, 'Could not start payment. Try again.'),
      )
      setSubmitting(false)
    }
  }

  return (
    <div className="pd-invoice-checkout">
      <form className="pd-invoice-checkout__card" onSubmit={handleSubmit}>
        <header>
          <h1 className="pd-invoice-checkout__title">Pay {invoice.agencyName}</h1>
          <p className="pd-invoice-checkout__lede">
            {invoice.invoiceNumber} · {invoice.clientName}
          </p>
        </header>

        <dl className="pd-invoice-checkout__amount">
          <div>
            <dt>Amount due</dt>
            <dd>{formatInvoiceAmount(amountDue)}</dd>
          </div>
        </dl>

        <dl className="pd-invoice-checkout__meta">
          <div>
            <dt>Service</dt>
            <dd>{invoice.service}</dd>
          </div>
          <div>
            <dt>Already paid</dt>
            <dd>{formatInvoiceAmount(invoice.paidTotal)}</dd>
          </div>
        </dl>

        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0" disabled={submitting}>
          <legend className="mb-1 text-sm font-medium">Pay With</legend>
          <div className="flex flex-col gap-2" role="radiogroup" aria-label="Pay With">
            {methods.map((option) => {
              const selected = method === option.value
              return (
                <Label
                  key={option.value}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-sm font-normal',
                    selected && 'border-primary bg-primary/5',
                    submitting && 'pointer-events-none opacity-60',
                  )}
                >
                  <input
                    type="radio"
                    name="invoice-pay-method"
                    value={option.value}
                    checked={selected}
                    disabled={submitting}
                    className="size-4 accent-[var(--color-theme)]"
                    onChange={() => setMethod(option.value as InvoicePayMethod)}
                  />
                  <span>{option.label}</span>
                </Label>
              )
            })}
          </div>
        </fieldset>

        {error ? (
          <p className="m-0 text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <div className="pd-invoice-checkout__actions">
          <Button
            type="submit"
            size="lg"
            className="h-9 rounded-lg"
            disabled={submitting}
          >
            {submitting
              ? 'Starting…'
              : `Pay ${formatInvoiceAmount(amountDue)} with ${method}`}
          </Button>
          <Button
            asChild
            type="button"
            variant="outline"
            className="h-9 rounded-lg"
          >
            <Link to={publicInvoiceViewPath(token)}>Back To Invoice</Link>
          </Button>
        </div>
        <p className="pd-invoice-checkout__secure">
          bKash, Nagad, and cards are processed securely. Cash collections stay
          with the agency.
        </p>
      </form>
    </div>
  )
}
