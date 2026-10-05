import { Printer } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { Button, EmptyState } from '@/components/ui'
import { InvoicePageView } from '@/components/invoices/InvoicePageView'
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
    ? invoiceForDocument(decoded, layoutConfig.brand.logoUrl)
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
          <Button size="sm" variant="secondary" onClick={() => window.print()}>
            <Printer size={14} strokeWidth={2.25} aria-hidden />
            Print invoice
          </Button>
        </>
      }
    />
  )
}
