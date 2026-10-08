import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { InvoicePageView } from '@/components/invoices/InvoicePageView'
import { InvoicePrintActions } from '@/components/invoices/InvoicePrintActions'
import { layoutConfig } from '@/config/layout'
import { EmptyState } from '@/components/ui'
import type { CaseInvoice } from '@/lib/caseInvoice'
import {
  invoiceForDocument,
  resolvePublicInvoice,
} from '@/lib/invoiceShare'
import '@/styles/layout-invoice.css'

export default function PublicInvoicePage() {
  const { token = '' } = useParams()
  const [invoice, setInvoice] = useState<CaseInvoice | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void resolvePublicInvoice(token).then((resolved) => {
      if (cancelled) return
      setInvoice(
        resolved
          ? invoiceForDocument(resolved, layoutConfig.brand.logoUrl ?? '')
          : null,
      )
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [token])

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

  if (!invoice) {
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
      invoice={invoice}
      frameClassName="pd-invoice-page-frame--public"
      toolbar={
        <>
          <p className="pd-invoice-page__public-label">Shared invoice</p>
          <div className="pd-invoice-page__actions">
            <InvoicePrintActions invoiceNumber={invoice.invoiceNumber} />
          </div>
        </>
      }
    />
  )
}
