import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/shadcn/table'
import {
  formatReportDate,
  formatReportWebsite,
  reportColumnLabel,
  reportRowValue,
  type SubAgentClientReport,
} from '@/lib/subAgentClientReport'
import '@/styles/layout-invoice.css'

type SubAgentClientReportDocumentProps = {
  report: SubAgentClientReport
}

export function SubAgentClientReportDocument({
  report,
}: SubAgentClientReportDocumentProps) {
  return (
    <article
      className="pd-invoice pd-sub-agent-report"
      data-sub-agent-client-report
    >
      <header className="pd-invoice__header">
        <div className="pd-invoice__brand">
          {report.agencyLogoUrl ? (
            <img
              className={
                report.agencyLogoIsCustom
                  ? 'pd-invoice__logo pd-invoice__logo--photo'
                  : 'pd-invoice__logo'
              }
              src={report.agencyLogoUrl}
              alt=""
              decoding="async"
            />
          ) : null}
          <div className="pd-invoice__brand-details">
            <p className="pd-invoice__agency-name">{report.agencyName}</p>
            {report.agencyAddress ? (
              <p className="pd-invoice__muted">{report.agencyAddress}</p>
            ) : null}
            {report.agencyMobile ? (
              <p className="pd-invoice__muted">{report.agencyMobile}</p>
            ) : null}
            {report.agencyWebsite ? (
              <p className="pd-invoice__muted">
                {formatReportWebsite(report.agencyWebsite)}
              </p>
            ) : null}
          </div>
        </div>
        <div className="pd-invoice__meta">
          <h1 className="pd-invoice__title">Client report</h1>
          <p className="pd-invoice__number">{report.reportNumber}</p>
          <p className="pd-invoice__issued">
            <span>Issued</span>
            {formatReportDate(report.issuedOn)}
          </p>
          <p className="pd-invoice__issued">
            <span>Clients</span>
            {report.clientCount}
          </p>
        </div>
      </header>

      <section className="pd-invoice__parties">
        <div className="pd-invoice__party">
          <h2 className="pd-invoice__section-label">Sub agent</h2>
          <p className="pd-invoice__party-name">{report.subAgentName}</p>
          <p className="pd-invoice__muted">ID {report.subAgentId}</p>
          {report.subAgentPhone ? (
            <p className="pd-invoice__muted">{report.subAgentPhone}</p>
          ) : null}
          {report.subAgentLicense ? (
            <p className="pd-invoice__muted">
              License {report.subAgentLicense}
            </p>
          ) : null}
        </div>
        {report.showAmountSummary ? (
          <div className="pd-invoice__party">
            <h2 className="pd-invoice__section-label">Summary</h2>
            <p className="pd-invoice__party-name">
              {report.totalOutstandingLabel}
            </p>
            <p className="pd-invoice__muted">Total outstanding</p>
            <p className="pd-invoice__muted">
              {report.clientCount} selected{' '}
              {report.clientCount === 1 ? 'client' : 'clients'}
            </p>
          </div>
        ) : (
          <div className="pd-invoice__party">
            <h2 className="pd-invoice__section-label">Selection</h2>
            <p className="pd-invoice__party-name">
              {report.clientCount}{' '}
              {report.clientCount === 1 ? 'client' : 'clients'}
            </p>
            <p className="pd-invoice__muted">Included in this report</p>
          </div>
        )}
      </section>

      <section aria-labelledby="sub-agent-client-report-rows">
        <h2
          id="sub-agent-client-report-rows"
          className="pd-invoice__section-label"
        >
          Selected clients
        </h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              {report.columns.map((column) => (
                <TableHead key={column}>{reportColumnLabel(column)}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {report.rows.map((row, index) => (
              <TableRow key={row.id}>
                <TableCell>{index + 1}</TableCell>
                {report.columns.map((column) => (
                  <TableCell
                    key={column}
                    className={
                      column === 'balance' ? 'pd-invoice__amount' : undefined
                    }
                  >
                    {reportRowValue(row, column)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      <p className="pd-invoice__muted pd-sub-agent-report__note">
        Generated for {report.subAgentName}. Includes only the clients and
        fields selected for this report.
      </p>
    </article>
  )
}
