import { useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, Download, FileText, Users } from 'lucide-react'
import {
  Button,
  Checkbox,
  EmptyState,
  SearchField,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui'
import { SubAgentClientReportDocument } from '@/components/subAgents/SubAgentClientReportDocument'
import { downloadSubAgentClientReportPdf } from '@/lib/downloadSubAgentClientReportPdf'
import { deriveClientServiceStatus } from '@/lib/clientServiceStatus'
import {
  DEFAULT_SUB_AGENT_REPORT_COLUMNS,
  SUB_AGENT_REPORT_COLUMNS,
  buildClientReportRow,
  buildSubAgentClientReport,
  moveReportColumn,
  normalizeReportColumns,
  reportColumnLabel,
  reportRowValue,
  type SubAgentReportColumnId,
} from '@/lib/subAgentClientReport'
import { useAgencyProfile } from '@/layout/useAgencyProfile'
import { layoutConfig } from '@/config/layout'
import type { Case } from '@/types/case'
import type { Client } from '@/types/client'
import type { SubAgent } from '@/types/subAgent'
import { cx } from '@/lib/cx'
import '@/styles/layout-invoice.css'

type SubAgentClientReportPanelProps = {
  subAgent: SubAgent
  clients: Client[]
  casesByClientId: Map<string, Case[]>
}

function matchesReportSearch(client: Client, query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return (
    client.name.toLowerCase().includes(q) ||
    client.phone.toLowerCase().includes(q) ||
    (client.passport ?? '').toLowerCase().includes(q) ||
    (client.preferredCountry ?? '').toLowerCase().includes(q) ||
    (client.nid ?? '').toLowerCase().includes(q) ||
    (client.email ?? '').toLowerCase().includes(q)
  )
}

export function SubAgentClientReportPanel({
  subAgent,
  clients,
  casesByClientId,
}: SubAgentClientReportPanelProps) {
  const agencyProfile = useAgencyProfile()
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [columns, setColumns] = useState<SubAgentReportColumnId[]>(
    DEFAULT_SUB_AGENT_REPORT_COLUMNS,
  )
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState<string | undefined>()

  const visibleClients = useMemo(
    () => clients.filter((client) => matchesReportSearch(client, search)),
    [clients, search],
  )

  const statusByClientId = useMemo(() => {
    const map = new Map<string, string>()
    for (const client of clients) {
      const status = deriveClientServiceStatus(
        casesByClientId.get(client.id) ?? [],
      )
      if (status) map.set(client.id, status)
    }
    return map
  }, [casesByClientId, clients])

  const selectedClients = useMemo(
    () => clients.filter((client) => selectedIds.has(client.id)),
    [clients, selectedIds],
  )

  const reportColumns = normalizeReportColumns(columns)

  const report =
    selectedClients.length > 0
      ? buildSubAgentClientReport({
          subAgent,
          clients: selectedClients,
          statusByClientId,
          profile: agencyProfile,
          columns: reportColumns,
          defaultLogoUrl: layoutConfig.brand.logoUrl,
        })
      : null

  const allVisibleSelected =
    visibleClients.length > 0 &&
    visibleClients.every((client) => selectedIds.has(client.id))

  const toggleClient = (clientId: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(clientId)
      else next.delete(clientId)
      return next
    })
  }

  const toggleVisible = (checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      for (const client of visibleClients) {
        if (checked) next.add(client.id)
        else next.delete(client.id)
      }
      return next
    })
  }

  const toggleColumn = (columnId: SubAgentReportColumnId, checked: boolean) => {
    const meta = SUB_AGENT_REPORT_COLUMNS.find((item) => item.id === columnId)
    if (meta?.required && !checked) return
    setColumns((prev) => {
      if (checked) {
        return normalizeReportColumns([...prev, columnId])
      }
      return normalizeReportColumns(prev.filter((item) => item !== columnId))
    })
  }

  const moveColumn = (
    columnId: SubAgentReportColumnId,
    direction: -1 | 1,
  ) => {
    setColumns((prev) => moveReportColumn(prev, columnId, direction))
  }

  const availableColumns = SUB_AGENT_REPORT_COLUMNS.filter(
    (column) => !reportColumns.includes(column.id),
  )

  const handleDownload = async () => {
    if (!report) return
    setDownloading(true)
    setDownloadError(undefined)
    try {
      await downloadSubAgentClientReportPdf(report)
    } catch (error) {
      setDownloadError(
        error instanceof Error
          ? error.message
          : 'Could not download the PDF. Try again.',
      )
    } finally {
      setDownloading(false)
    }
  }

  if (clients.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No clients to report"
        description="Add clients for this sub agent before generating a report."
      />
    )
  }

  return (
    <div className="pd-sub-agent-report-panel">
      <section className="pd-client-detail__section pd-sub-agent-report-panel__box">
        <div className="pd-client-detail__section-head">
          <h2 className="pd-client-detail__section-title">
            <span className="pd-client-detail__section-icon" aria-hidden>
              <FileText size={16} strokeWidth={2.25} />
            </span>
            Client report
          </h2>
          <Button
            type="button"
            size="sm"
            disabled={!report || downloading}
            loading={downloading}
            onClick={() => void handleDownload()}
          >
            <Download size={14} strokeWidth={2.25} aria-hidden />
            {downloading ? 'Downloading…' : 'Download PDF'}
          </Button>
        </div>
        <p className="pd-sub-agent-report-panel__lead">
          Choose fields and their order for the table and PDF together, then
          select clients. Amount summary appears only when Balance due is
          included.
        </p>

        <div
          className="pd-sub-agent-report-panel__fields"
          role="group"
          aria-label="Report fields"
        >
          <p className="pd-sub-agent-report-panel__fields-label">
            Column order
          </p>
          <ol className="pd-sub-agent-report-panel__order">
            {reportColumns.map((columnId, index) => {
              const meta = SUB_AGENT_REPORT_COLUMNS.find(
                (item) => item.id === columnId,
              )
              const label = meta?.label ?? columnId
              return (
                <li key={columnId} className="pd-sub-agent-report-panel__order-item">
                  <span className="pd-sub-agent-report-panel__order-index">
                    {index + 1}
                  </span>
                  <span className="pd-sub-agent-report-panel__order-label">
                    {label}
                    {meta?.required ? ' (required)' : ''}
                  </span>
                  <div className="pd-sub-agent-report-panel__order-actions">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="pd-btn--icon"
                      aria-label={`Move ${label} earlier`}
                      disabled={index === 0}
                      onClick={() => moveColumn(columnId, -1)}
                    >
                      <ChevronUp size={14} strokeWidth={2.25} aria-hidden />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="pd-btn--icon"
                      aria-label={`Move ${label} later`}
                      disabled={index === reportColumns.length - 1}
                      onClick={() => moveColumn(columnId, 1)}
                    >
                      <ChevronDown size={14} strokeWidth={2.25} aria-hidden />
                    </Button>
                    {!meta?.required ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleColumn(columnId, false)}
                      >
                        Remove
                      </Button>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ol>

          {availableColumns.length > 0 ? (
            <>
              <p className="pd-sub-agent-report-panel__fields-label pd-sub-agent-report-panel__fields-label--spaced">
                Add fields
              </p>
              <div className="pd-sub-agent-report-panel__field-list">
                {availableColumns.map((column) => (
                  <Checkbox
                    key={column.id}
                    className="pd-sub-agent-report-panel__field"
                    label={column.label}
                    checked={false}
                    onChange={(event) =>
                      toggleColumn(column.id, event.target.checked)
                    }
                  />
                ))}
              </div>
            </>
          ) : null}
        </div>

        <div className="pd-sub-agent-report-panel__toolbar">
          <SearchField
            className="pd-clients__search"
            placeholder="Search clients to select…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onClear={() => setSearch('')}
          />
          <p className="pd-sub-agent-report-panel__count">
            {selectedIds.size} selected
            {search.trim() ? ` · ${visibleClients.length} shown` : ''}
            {reportColumns.includes('balance')
              ? ' · amount summary on'
              : ' · amount summary off'}
          </p>
        </div>

        {visibleClients.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No clients match"
            description="Try a different name, phone, or passport."
            action={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSearch('')}
              >
                Clear search
              </Button>
            }
          />
        ) : (
          <div className="pd-sub-agent-report-panel__table">
            <Table aria-label={`${subAgent.name} report clients`}>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Checkbox
                      label="Select all visible clients"
                      hideLabel
                      checked={allVisibleSelected}
                      onChange={(event) =>
                        toggleVisible(event.target.checked)
                      }
                    />
                  </TableHead>
                  {reportColumns.map((column) => (
                    <TableHead key={column}>
                      {reportColumnLabel(column)}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleClients.map((client) => {
                  const row = buildClientReportRow(
                    client,
                    statusByClientId.get(client.id) || '—',
                  )
                  const checked = selectedIds.has(client.id)
                  return (
                    <TableRow
                      key={client.id}
                      className={cx(
                        'pd-sub-agent-report-panel__row',
                        checked && 'is-selected',
                      )}
                    >
                      <TableCell>
                        <Checkbox
                          label={`Select ${client.name}`}
                          hideLabel
                          checked={checked}
                          onChange={(event) =>
                            toggleClient(client.id, event.target.checked)
                          }
                        />
                      </TableCell>
                      {reportColumns.map((column) => (
                        <TableCell key={column}>
                          {reportRowValue(row, column)}
                        </TableCell>
                      ))}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="pd-sub-agent-report-panel__actions">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={visibleClients.length === 0}
            onClick={() => toggleVisible(true)}
          >
            Select shown
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={selectedIds.size === 0}
            onClick={() => setSelectedIds(new Set())}
          >
            Clear selection
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!report || downloading}
            loading={downloading}
            onClick={() => void handleDownload()}
          >
            <Download size={14} strokeWidth={2.25} aria-hidden />
            {downloading ? 'Downloading…' : 'Generate PDF'}
          </Button>
        </div>
        {downloadError ? (
          <p className="pd-field__error" role="alert">
            {downloadError}
          </p>
        ) : null}
      </section>

      {report ? (
        <section
          className="pd-client-detail__section pd-sub-agent-report-panel__preview"
          aria-label="Report preview"
        >
          <div className="pd-invoice-page__stage">
            <SubAgentClientReportDocument report={report} />
          </div>
        </section>
      ) : (
        <section className="pd-client-detail__section pd-sub-agent-report-panel__box">
          <EmptyState
            icon={FileText}
            title="Select clients to preview"
            description="Pick PDF fields and tick one or more clients. Preview updates before you download."
          />
        </section>
      )}
    </div>
  )
}
