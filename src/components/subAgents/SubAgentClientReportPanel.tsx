import { useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, Download, FileText, Users } from 'lucide-react'
import { Button } from '@/components/shadcn/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shadcn/card'
import { Checkbox } from '@/components/shadcn/checkbox'
import {
  Empty,
  EmptyContent,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/shadcn/empty'
import { FieldError } from '@/components/shadcn/field'
import { Input } from '@/components/shadcn/input'
import { Label } from '@/components/shadcn/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/shadcn/table'
import { SubAgentClientReportDocument } from '@/components/subAgents/SubAgentClientReportDocument'
import {
  chromeHeadClass,
  tableShellClass,
  whiteControlClass,
} from '@/components/clients/shadcnChrome'
import { cn } from '@/lib/utils'
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
      <Empty className="bg-card shadow-sm">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Users />
          </EmptyMedia>
          <EmptyTitle>No Clients to Report</EmptyTitle>
        </EmptyHeader>
        <EmptyContent />
      </Empty>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="shadow-sm">
        <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="inline-flex items-center gap-2">
            <span
              className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-[var(--color-theme-subtle)] text-[var(--color-theme-ink)]"
              aria-hidden
            >
              <FileText size={16} strokeWidth={2.25} />
            </span>
            Client Report
          </CardTitle>
          <Button
            type="button"
            size="sm"
            className="h-8 rounded-lg"
            disabled={!report || downloading}
            onClick={() => void handleDownload()}
          >
            <Download size={14} strokeWidth={2.25} data-icon="inline-start" />
            {downloading ? 'Downloading…' : 'Download PDF'}
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div role="group" aria-label="Report fields" className="flex flex-col gap-3">
            <p className="m-0 text-xs font-medium tracking-wide text-muted-foreground">
              Column Order
            </p>
            <ol className="m-0 flex list-none flex-col gap-2 p-0">
              {reportColumns.map((columnId, index) => {
                const meta = SUB_AGENT_REPORT_COLUMNS.find(
                  (item) => item.id === columnId,
                )
                const label = meta?.label ?? columnId
                return (
                  <li
                    key={columnId}
                    className="flex flex-wrap items-center gap-2 rounded-lg border border-border px-3 py-2"
                  >
                    <span className="inline-flex size-6 items-center justify-center rounded-md bg-muted text-xs font-semibold">
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1 text-sm">
                      {label}
                      {meta?.required ? ' (required)' : ''}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="size-8"
                        aria-label={`Move ${label} earlier`}
                        disabled={index === 0}
                        onClick={() => moveColumn(columnId, -1)}
                      >
                        <ChevronUp size={14} strokeWidth={2.25} aria-hidden />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="size-8"
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
                <p className="m-0 text-xs font-medium tracking-wide text-muted-foreground">
                  Add Fields
                </p>
                <div className="flex flex-wrap gap-3">
                  {availableColumns.map((column) => (
                    <Label
                      key={column.id}
                      className="inline-flex items-center gap-2 text-sm font-normal"
                    >
                      <Checkbox
                        checked={false}
                        onCheckedChange={(checked) =>
                          toggleColumn(column.id, checked === true)
                        }
                      />
                      {column.label}
                    </Label>
                  ))}
                </div>
              </>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Input
              className={cn(whiteControlClass, 'max-w-sm')}
              placeholder="Search clients to select…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search clients"
            />
            <p className="m-0 text-sm text-muted-foreground">
              {selectedIds.size} selected
              {search.trim() ? ` · ${visibleClients.length} shown` : ''}
              {reportColumns.includes('balance')
                ? ' · amount summary on'
                : ' · amount summary off'}
            </p>
          </div>

          {visibleClients.length === 0 ? (
            <Empty className="bg-card shadow-sm">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Users />
                </EmptyMedia>
                <EmptyTitle>No Clients Match</EmptyTitle>
              </EmptyHeader>
              <EmptyContent>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-lg"
                  onClick={() => setSearch('')}
                >
                  Clear Search
                </Button>
              </EmptyContent>
            </Empty>
          ) : (
            <div className={tableShellClass}>
              <Table aria-label={`${subAgent.name} report clients`}>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-0">
                    <TableHead className={cn(chromeHeadClass, 'w-10')}>
                      <Checkbox
                        checked={allVisibleSelected}
                        onCheckedChange={(checked) =>
                          toggleVisible(checked === true)
                        }
                        aria-label="Select all visible clients"
                      />
                    </TableHead>
                    {reportColumns.map((column) => (
                      <TableHead key={column} className={chromeHeadClass}>
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
                        className={cn(checked && 'bg-muted/40')}
                      >
                        <TableCell>
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(next) =>
                              toggleClient(client.id, next === true)
                            }
                            aria-label={`Select ${client.name}`}
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

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 rounded-lg"
              disabled={visibleClients.length === 0}
              onClick={() => toggleVisible(true)}
            >
              Select Shown
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 rounded-lg"
              disabled={selectedIds.size === 0}
              onClick={() => setSelectedIds(new Set())}
            >
              Clear Selection
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-8 rounded-lg"
              disabled={!report || downloading}
              onClick={() => void handleDownload()}
            >
              <Download size={14} strokeWidth={2.25} data-icon="inline-start" />
              {downloading ? 'Downloading…' : 'Generate PDF'}
            </Button>
          </div>
          {downloadError ? (
            <FieldError role="alert">{downloadError}</FieldError>
          ) : null}
        </CardContent>
      </Card>

      {report ? (
        <Card className="shadow-sm" aria-label="Report preview">
          <CardContent className="pt-6">
            <div className="pd-invoice-page__stage overflow-auto">
              <SubAgentClientReportDocument report={report} />
            </div>
          </CardContent>
        </Card>
      ) : (
        <Empty className="bg-card shadow-sm">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileText />
            </EmptyMedia>
            <EmptyTitle>Select Clients to Preview</EmptyTitle>
          </EmptyHeader>
          <EmptyContent />
        </Empty>
      )}
    </div>
  )
}
