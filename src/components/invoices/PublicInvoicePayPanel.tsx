import { Link } from 'react-router-dom'
import { formatInvoiceAmount, type CaseInvoice } from '@/lib/caseInvoice'
import {
  INVOICE_PAY_METHODS,
  publicInvoicePayPath,
} from '@/lib/invoicePay'
import '@/styles/layout-invoice-pay.css'

type PublicInvoicePayPanelProps = {
  invoice: CaseInvoice
  token: string
}

export function PublicInvoicePayPanel({
  invoice,
  token,
}: PublicInvoicePayPanelProps) {
  if (invoice.balanceDue <= 0) {
    return (
      <aside className="pd-invoice-pay" aria-label="Invoice payment">
        <div className="pd-invoice-pay__card pd-invoice-pay__card--paid">
          <div className="pd-invoice-pay__copy">
            <p className="pd-invoice-pay__kicker">Payment</p>
            <p className="pd-invoice-pay__paid">Paid in full</p>
            <p className="pd-invoice-pay__hint">
              {formatInvoiceAmount(invoice.paidTotal)} received for{' '}
              {invoice.invoiceNumber}.
            </p>
          </div>
        </div>
      </aside>
    )
  }

  return (
    <aside className="pd-invoice-pay" aria-label="Pay this invoice">
      <div className="pd-invoice-pay__card">
        <div className="pd-invoice-pay__copy">
          <p className="pd-invoice-pay__kicker">Balance due</p>
          <p className="pd-invoice-pay__amount">
            {formatInvoiceAmount(invoice.balanceDue)}
          </p>
          <p className="pd-invoice-pay__hint">
            Pay {invoice.agencyName} with bKash, Nagad, or card.
          </p>
          <ul className="pd-invoice-pay__methods">
            {INVOICE_PAY_METHODS.map((method) => (
              <li key={method.value} className="pd-invoice-pay__method">
                {method.label}
              </li>
            ))}
          </ul>
        </div>
        <div className="pd-invoice-pay__cta">
          <Link
            className="pd-btn pd-btn--primary pd-btn--lg"
            to={publicInvoicePayPath(token)}
          >
            <span className="pd-btn__label">
              Pay {formatInvoiceAmount(invoice.balanceDue)} now
            </span>
          </Link>
        </div>
      </div>
    </aside>
  )
}
