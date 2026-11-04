import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui'
import {
  formatPayslipAmount,
  formatPayslipDate,
  formatPayslipWebsite,
  type EmployeePayslip,
} from '@/lib/payslip'
import '@/styles/layout-invoice.css'

type PayslipDocumentProps = {
  payslip: EmployeePayslip
}

export function PayslipDocument({ payslip }: PayslipDocumentProps) {
  return (
    <article className="pd-invoice pd-payslip" data-payslip-document>
      <header className="pd-invoice__header">
        <div className="pd-invoice__brand">
          {payslip.agencyLogoUrl ? (
            <img
              className={
                payslip.agencyLogoIsCustom
                  ? 'pd-invoice__logo pd-invoice__logo--photo'
                  : 'pd-invoice__logo'
              }
              src={payslip.agencyLogoUrl}
              alt=""
              decoding="async"
            />
          ) : null}
          <div className="pd-invoice__brand-details">
            <p className="pd-invoice__agency-name">{payslip.agencyName}</p>
            {payslip.agencyAddress ? (
              <p className="pd-invoice__muted">{payslip.agencyAddress}</p>
            ) : null}
            {payslip.agencyMobile ? (
              <p className="pd-invoice__muted">{payslip.agencyMobile}</p>
            ) : null}
            {payslip.agencyWebsite ? (
              <p className="pd-invoice__muted">
                {formatPayslipWebsite(payslip.agencyWebsite)}
              </p>
            ) : null}
          </div>
        </div>
        <div className="pd-invoice__meta">
          <h1 className="pd-invoice__title">Payslip</h1>
          <p className="pd-invoice__number">{payslip.payslipNumber}</p>
          <p className="pd-invoice__issued">
            <span>Period</span>
            {payslip.monthLabel}
          </p>
          <p className="pd-invoice__issued">
            <span>Issued</span>
            {formatPayslipDate(payslip.issuedOn)}
          </p>
        </div>
      </header>

      <section className="pd-invoice__parties">
        <div className="pd-invoice__party">
          <h2 className="pd-invoice__section-label">Employee</h2>
          <p className="pd-invoice__party-name">{payslip.employeeName}</p>
          <p className="pd-invoice__muted">ID {payslip.employeeId}</p>
          {payslip.designation ? (
            <p className="pd-invoice__muted">{payslip.designation}</p>
          ) : null}
          {payslip.department ? (
            <p className="pd-invoice__muted">{payslip.department}</p>
          ) : null}
          {payslip.phone ? (
            <p className="pd-invoice__muted">{payslip.phone}</p>
          ) : null}
          {payslip.email ? (
            <p className="pd-invoice__muted">{payslip.email}</p>
          ) : null}
          {payslip.joined ? (
            <p className="pd-invoice__muted">
              Joined {formatPayslipDate(payslip.joined)}
            </p>
          ) : null}
        </div>
      </section>

      <section aria-labelledby="payslip-earnings">
        <h2 id="payslip-earnings" className="pd-invoice__section-label">
          Earnings &amp; deductions
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
              <TableCell>Basic salary</TableCell>
              <TableCell className="pd-invoice__amount">
                {formatPayslipAmount(payslip.salary)}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>
                Unpaid days
                {payslip.unpaidDays
                  ? ` (${payslip.unpaidDays})`
                  : ''}
              </TableCell>
              <TableCell className="pd-invoice__amount">
                {payslip.deduction
                  ? `−${formatPayslipAmount(payslip.deduction)}`
                  : '—'}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>
                <strong>Net pay</strong>
              </TableCell>
              <TableCell className="pd-invoice__amount">
                <strong>{formatPayslipAmount(payslip.net)}</strong>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </section>

      <p className="pd-invoice__muted pd-payslip__note">
        This payslip was generated from attendance and leave records for{' '}
        {payslip.monthLabel}.
      </p>
    </article>
  )
}
