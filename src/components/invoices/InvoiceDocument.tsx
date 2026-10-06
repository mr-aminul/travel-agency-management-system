import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui'
import {
  formatInvoiceAmount,
  formatInvoiceDate,
  formatInvoiceWebsite,
  type CaseInvoice,
} from '@/lib/caseInvoice'

type InvoiceDocumentProps = {
  invoice: CaseInvoice
}

export function InvoiceDocument({ invoice }: InvoiceDocumentProps) {
  return (
    <article className="pd-invoice" data-invoice-document>
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
          <div className="pd-invoice__brand-details">
            <p className="pd-invoice__agency-name">{invoice.agencyName}</p>
            {invoice.agencyAddress ? (
              <p className="pd-invoice__muted">{invoice.agencyAddress}</p>
            ) : null}
            {invoice.agencyMobile ? (
              <p className="pd-invoice__muted">{invoice.agencyMobile}</p>
            ) : null}
            {invoice.agencyWebsite ? (
              <p className="pd-invoice__muted">
                {formatInvoiceWebsite(invoice.agencyWebsite)}
              </p>
            ) : null}
          </div>
        </div>
        <div className="pd-invoice__meta">
          <h1 className="pd-invoice__title">Invoice</h1>
          <p className="pd-invoice__number">{invoice.invoiceNumber}</p>
          <p className="pd-invoice__issued">
            <span>Issued</span>
            {formatInvoiceDate(invoice.issuedOn)}
          </p>
        </div>
      </header>

      <section className="pd-invoice__parties">
        <div className="pd-invoice__party">
          <h2 className="pd-invoice__section-label">Billed To</h2>
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
          Service Charges
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
                <TableRow key={payment.id} className="pd-invoice__row">
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
