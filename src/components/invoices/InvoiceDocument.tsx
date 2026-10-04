import {
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  type BadgeVariant,
} from '@/components/ui'
import {
  formatInvoiceAmount,
  formatInvoiceDate,
  type CaseInvoice,
} from '@/lib/caseInvoice'

function statusLabel(status: CaseInvoice['status']): string {
  if (status === 'paid') return 'Paid in full'
  if (status === 'partial') return 'Partially paid'
  return 'Unpaid'
}

function statusVariant(status: CaseInvoice['status']): BadgeVariant {
  if (status === 'paid') return 'completed'
  if (status === 'partial') return 'in-progress'
  return 'pending'
}

type InvoiceDocumentProps = {
  invoice: CaseInvoice
  highlightedPaymentId?: string
}

export function InvoiceDocument({
  invoice,
  highlightedPaymentId,
}: InvoiceDocumentProps) {
  return (
    <article className="pd-invoice">
      <header className="pd-invoice__header">
        <div className="pd-invoice__brand">
          {invoice.agencyLogoUrl ? (
            <img
              className={
                invoice.agencyLogoIsCustom
                  ? 'pd-invoice__logo pd-invoice__logo--photo'
                  : 'pd-invoice__logo'
              }
              src={invoice.agencyLogoUrl}
              alt=""
              decoding="async"
            />
          ) : null}
          <p className="pd-invoice__agency-name">{invoice.agencyName}</p>
        </div>
        <div className="pd-invoice__meta">
          <h1 className="pd-invoice__title">Invoice</h1>
          <div className="pd-invoice__meta-row">
            <p className="pd-invoice__number">{invoice.invoiceNumber}</p>
            <Badge variant={statusVariant(invoice.status)}>
              {statusLabel(invoice.status)}
            </Badge>
          </div>
          <p className="pd-invoice__issued">
            <span>Issued</span>
            {formatInvoiceDate(invoice.issuedOn)}
          </p>
        </div>
      </header>

      <section className="pd-invoice__parties">
        <div className="pd-invoice__party">
          <h2 className="pd-invoice__section-label">From</h2>
          <p className="pd-invoice__party-name">{invoice.agencyName}</p>
          {invoice.agencyAddress ? (
            <p className="pd-invoice__muted">{invoice.agencyAddress}</p>
          ) : null}
          {invoice.agencyMobile ? (
            <p className="pd-invoice__muted">{invoice.agencyMobile}</p>
          ) : null}
          {invoice.agencyWebsite ? (
            <p className="pd-invoice__muted">{invoice.agencyWebsite}</p>
          ) : null}
        </div>
        <div className="pd-invoice__party pd-invoice__party--to">
          <h2 className="pd-invoice__section-label">To</h2>
          <p className="pd-invoice__party-name">{invoice.clientName}</p>
          {invoice.clientAddress ? (
            <p className="pd-invoice__muted">{invoice.clientAddress}</p>
          ) : null}
          {invoice.clientPhone ? (
            <p className="pd-invoice__muted">{invoice.clientPhone}</p>
          ) : null}
          {invoice.clientEmail ? (
            <p className="pd-invoice__muted">{invoice.clientEmail}</p>
          ) : null}
          {invoice.clientPassport ? (
            <p className="pd-invoice__muted">
              Passport {invoice.clientPassport}
            </p>
          ) : null}
        </div>
      </section>

      <section aria-labelledby="invoice-charges">
        <h2 id="invoice-charges" className="pd-invoice__section-label">
          Charges
        </h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Description</TableHead>
              <TableHead>Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>{invoice.lineDescription}</TableCell>
              <TableCell className="pd-invoice__amount">
                {formatInvoiceAmount(invoice.packageTotal)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </section>

      <section aria-labelledby="invoice-payments">
        <h2 id="invoice-payments" className="pd-invoice__section-label">
          Payments received
        </h2>
        {invoice.payments.length === 0 ? (
          <p className="pd-invoice__muted">No payments recorded yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Note</TableHead>
                <TableHead>Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.payments.map((payment) => (
                <TableRow
                  key={payment.id}
                  className={
                    payment.id === highlightedPaymentId
                      ? 'pd-invoice__row is-highlight'
                      : 'pd-invoice__row'
                  }
                >
                  <TableCell>{formatInvoiceDate(payment.date)}</TableCell>
                  <TableCell>{payment.method}</TableCell>
                  <TableCell>{payment.note || '—'}</TableCell>
                  <TableCell className="pd-invoice__amount">
                    {formatInvoiceAmount(payment.amount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      <section className="pd-invoice__totals" aria-label="Totals">
        <dl>
          <div>
            <dt>Service fee</dt>
            <dd>{formatInvoiceAmount(invoice.packageTotal)}</dd>
          </div>
          <div>
            <dt>Paid</dt>
            <dd>{formatInvoiceAmount(invoice.paidTotal)}</dd>
          </div>
          <div className="pd-invoice__due">
            <dt>Balance due</dt>
            <dd>{formatInvoiceAmount(invoice.balanceDue)}</dd>
          </div>
        </dl>
      </section>
      <footer className="pd-invoice__footnote">
        This is a computer generated invoice and does not require a signature
      </footer>
    </article>
  )
}
