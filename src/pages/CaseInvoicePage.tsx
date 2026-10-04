import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Printer } from 'lucide-react'
import {
  Badge,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  type BadgeVariant,
} from '@/components/ui'
import {
  buildCaseInvoice,
  formatInvoiceAmount,
  formatInvoiceDate,
} from '@/lib/caseInvoice'
import { getCaseById, useCases } from '@/lib/casesStore'
import { getClientById } from '@/lib/clientsStore'
import { usePaymentsByCaseId } from '@/lib/paymentsStore'
import { useAgencyProfile } from '@/layout/useAgencyProfile'
import '@/styles/layout-invoice.css'

function statusLabel(status: 'paid' | 'partial' | 'unpaid'): string {
  if (status === 'paid') return 'Paid in full'
  if (status === 'partial') return 'Partially paid'
  return 'Unpaid'
}

function statusVariant(status: 'paid' | 'partial' | 'unpaid'): BadgeVariant {
  if (status === 'paid') return 'completed'
  if (status === 'partial') return 'in-progress'
  return 'pending'
}

export default function CaseInvoicePage() {
  const { id = '' } = useParams()
  const [searchParams] = useSearchParams()
  const highlightedPaymentId = searchParams.get('payment') ?? undefined
  useCases()
  const caseItem = getCaseById(id)
  const payments = usePaymentsByCaseId(id)
  const client = caseItem ? getClientById(caseItem.clientId) : undefined
  const profile = useAgencyProfile()

  if (!caseItem) {
    return <Navigate to="/cases" replace />
  }

  const invoice = buildCaseInvoice({
    caseItem,
    payments,
    client,
    profile,
  })

  return (
    <div className="pd-page pd-invoice-page" aria-label={`Invoice ${invoice.invoiceNumber}`}>
      <div className="pd-invoice-page__toolbar">
        <Link to={`/cases/${caseItem.id}`} className="pd-case-detail__back">
          <ArrowLeft size={14} strokeWidth={2.25} aria-hidden />
          Back to case
        </Link>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => window.print()}
        >
          <Printer size={14} strokeWidth={2.25} aria-hidden />
          Print invoice
        </Button>
      </div>

      <article className="pd-invoice">
        <header className="pd-invoice__header">
          <div className="pd-invoice__brand">
            {invoice.agencyLogoUrl ? (
              <img
                className="pd-invoice__logo"
                src={invoice.agencyLogoUrl}
                alt=""
              />
            ) : null}
            <div className="pd-invoice__brand-text">
              <p className="pd-invoice__agency-name">{invoice.agencyName}</p>
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
          </div>
          <div className="pd-invoice__meta">
            <h1 className="pd-invoice__title">Invoice</h1>
            <p className="pd-invoice__number">{invoice.invoiceNumber}</p>
            <Badge variant={statusVariant(invoice.status)}>
              {statusLabel(invoice.status)}
            </Badge>
            <dl className="pd-invoice__meta-list">
              <div>
                <dt>Issued</dt>
                <dd>{formatInvoiceDate(invoice.issuedOn)}</dd>
              </div>
              <div>
                <dt>Case</dt>
                <dd>{invoice.caseRef}</dd>
              </div>
            </dl>
          </div>
        </header>

        <section className="pd-invoice__parties">
          <div>
            <h2 className="pd-invoice__section-label">Bill to</h2>
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
          <div>
            <h2 className="pd-invoice__section-label">Service</h2>
            <p className="pd-invoice__party-name">{invoice.service}</p>
            {invoice.destination ? (
              <p className="pd-invoice__muted">{invoice.destination}</p>
            ) : null}
            {invoice.description ? (
              <p className="pd-invoice__muted">{invoice.description}</p>
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
              <dt>Package total</dt>
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
      </article>
    </div>
  )
}
