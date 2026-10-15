import { useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { InvoicePageView } from '@/components/invoices/InvoicePageView'
import { InvoicePrintActions } from '@/components/invoices/InvoicePrintActions'
import { PublicInvoicePayPanel } from '@/components/invoices/PublicInvoicePayPanel'
import { layoutConfig } from '@/config/layout'
import { EmptyState } from '@/components/ui'
import type { CaseInvoice } from '@/lib/caseInvoice'
import { overlayInvoice } from '@/lib/invoicePay'
import {
  invoiceForDocument,
  resolvePublicInvoice,
} from '@/lib/invoiceShare'
import '@/styles/layout-invoice.css'
import '@/styles/layout-invoice-pay.css'

function paymentBanner(status: string | null): {
  tone: 'success' | 'warning' | 'danger'
  text: string
} | null {
  if (status === 'success') {
    return { tone: 'success', text: 'Payment received. This invoice is up to date.' }
  }
  if (status === 'pending') {
    return {
      tone: 'warning',
      text: 'Payment is still processing. Refresh in a moment if the balance has not updated.',
    }
  }
  if (status === 'canceled') {
    return { tone: 'warning', text: 'Payment was canceled. You can pay when you are ready.' }
  }
  if (status === 'failed' || status === 'error') {
    return {
      tone: 'danger',
      text: 'Payment did not go through. Try again or contact the agency.',
    }
  }
  return null
}

export default function PublicInvoicePage() {
  const { token = '' } = useParams()
  const [searchParams] = useSearchParams()
  const [invoice, setInvoice] = useState<CaseInvoice | null>(null)
  const [loading, setLoading] = useState(true)
  const paymentStatus = searchParams.get('payment')
  const banner = paymentBanner(paymentStatus)

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
  }, [token, paymentStatus])

  const displayInvoice = useMemo(() => {
    if (!invoice) return null
    return overlayInvoice(invoice, token)
  }, [invoice, token])

  if (loading) {
    return (
      <div className="pd-invoice-page-frame pd-invoice-page-frame--public">
        <div className="pd-page pd-invoice-page" aria-busy="true">
          <EmptyState
            title="Loading invoice…"
            description="Fetching the shared document."
          />
        </div>
      </div>
    )
  }

  if (!displayInvoice) {
    return (
      <div className="pd-invoice-page-frame pd-invoice-page-frame--public">
        <div className="pd-page pd-invoice-page">
          <EmptyState
            title="Invoice not found"
            description="This share link is invalid or incomplete."
          />
        </div>
      </div>
    )
  }

  return (
    <InvoicePageView
      invoice={displayInvoice}
      frameClassName="pd-invoice-page-frame--public"
      hero={
        <>
          {banner ? (
            <p
              className={`pd-invoice-pay-banner pd-invoice-pay-banner--${banner.tone}`}
              role="status"
            >
              {banner.text}
            </p>
          ) : null}
          <PublicInvoicePayPanel invoice={displayInvoice} token={token} />
        </>
      }
      toolbar={
        <>
          <p className="pd-invoice-page__public-label">Shared invoice</p>
          <div className="pd-invoice-page__actions">
            <InvoicePrintActions invoiceNumber={displayInvoice.invoiceNumber} />
          </div>
        </>
      }
    />
  )
}
