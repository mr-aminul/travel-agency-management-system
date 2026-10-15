import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { Button, EmptyState, RadioGroup } from '@/components/ui'
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
        <EmptyState
          title="Loading payment…"
          description="Fetching the invoice balance."
        />
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="pd-invoice-checkout">
        <EmptyState
          title="Invoice not found"
          description="This share link is invalid or incomplete."
        />
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
          <p className="pd-invoice-checkout__kicker">Secure checkout</p>
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

        <RadioGroup
          legend="Pay with"
          name="invoice-pay-method"
          value={method}
          options={methods}
          disabled={submitting}
          onChange={(value) => setMethod(value as InvoicePayMethod)}
        />

        {error ? (
          <p className="pd-field__error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="pd-invoice-checkout__actions">
          <Button type="submit" size="lg" loading={submitting}>
            Pay {formatInvoiceAmount(amountDue)} with {method}
          </Button>
          <Link
            className="pd-btn pd-btn--ghost pd-btn--md"
            to={publicInvoiceViewPath(token)}
          >
            <span className="pd-btn__label">Back to invoice</span>
          </Link>
        </div>
        <p className="pd-invoice-checkout__secure">
          bKash, Nagad, and cards are processed securely. Cash collections stay
          with the agency.
        </p>
      </form>
    </div>
  )
}
