import { useParams } from 'react-router-dom'
import { EmptyState } from '@/components/ui'
import { InvoicePageView } from '@/components/invoices/InvoicePageView'
import { InvoicePrintActions } from '@/components/invoices/InvoicePrintActions'
import { layoutConfig } from '@/config/layout'
import {
  decodeInvoiceShare,
  invoiceForDocument,
} from '@/lib/invoiceShare'
import '@/styles/layout-invoice.css'

export default function PublicInvoicePage() {
  const { token = '' } = useParams()
  const decoded = decodeInvoiceShare(token)
  const invoice = decoded
    ? invoiceForDocument(decoded, layoutConfig.brand.logoUrl ?? '')
    : null

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
