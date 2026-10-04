import { useParams } from 'react-router-dom'
import { Printer } from 'lucide-react'
import { Button, EmptyState } from '@/components/ui'
import { InvoiceDocument } from '@/components/invoices/InvoiceDocument'
import { layoutConfig } from '@/config/layout'
import { decodeInvoiceShare } from '@/lib/invoiceShare'
import '@/styles/layout-invoice.css'

export default function PublicInvoicePage() {
  const { token = '' } = useParams()
  const decoded = decodeInvoiceShare(token)
  const invoice = decoded
    ? {
        ...decoded,
        agencyLogoUrl: decoded.agencyLogoUrl ?? layoutConfig.brand.logoUrl,
        agencyLogoIsCustom: Boolean(
          decoded.agencyLogoIsCustom && decoded.agencyLogoUrl,
        ),
      }
    : null

  if (!invoice) {
    return (
      <div className="pd-page pd-invoice-page pd-invoice-page--public">
        <EmptyState
          title="Invoice not found"
          description="This share link is invalid or incomplete."
        />
      </div>
    )
  }

  return (
    <div
      className="pd-page pd-invoice-page pd-invoice-page--public"
      aria-label={`Invoice ${invoice.invoiceNumber}`}
    >
      <div className="pd-invoice-page__toolbar">
        <p className="pd-invoice-page__public-label">Shared invoice</p>
        <Button size="sm" variant="secondary" onClick={() => window.print()}>
          <Printer size={14} strokeWidth={2.25} aria-hidden />
          Print invoice
        </Button>
      </div>
      <div className="pd-invoice-page__stage">
        <InvoiceDocument invoice={invoice} />
      </div>
    </div>
  )
}
