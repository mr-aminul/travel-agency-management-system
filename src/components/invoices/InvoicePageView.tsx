import type { ReactNode } from 'react'
import { InvoiceDocument } from '@/components/invoices/InvoiceDocument'
import type { CaseInvoice } from '@/lib/caseInvoice'
import '@/styles/layout-invoice.css'

/* Match AuthenticatedLayout weights so shared and in-app invoices look identical. */
import '@fontsource/inter/latin-600.css'
import '@fontsource/inter/latin-700.css'

type InvoicePageViewProps = {
  invoice: CaseInvoice
  toolbar: ReactNode
  /** Outer chrome only (e.g. public page background). Must not change invoice layout. */
  frameClassName?: string
}

export function InvoicePageView({
  invoice,
  toolbar,
  frameClassName,
}: InvoicePageViewProps) {
  const frameClass = ['pd-invoice-page-frame', frameClassName]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={frameClass}>
      <div
        className="pd-page pd-invoice-page"
        aria-label={`Invoice ${invoice.invoiceNumber}`}
      >
        <div className="pd-invoice-page__toolbar">{toolbar}</div>
        <div className="pd-invoice-page__stage">
          <InvoiceDocument invoice={invoice} />
        </div>
      </div>
    </div>
  )
}
