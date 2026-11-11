import { useMemo, useState } from 'react'
import { Download, FileBarChart } from 'lucide-react'
import { Button } from '@/components/shadcn/button'
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/shadcn/empty'
import { Input } from '@/components/clients/clientShadcnFields'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/shadcn/table'
import {
  chromeHeadClass,
  elevatedPageClass,
  pureWhiteFieldClass,
  pureWhiteOutlineClass,
  tableShellClass,
} from '@/components/clients/shadcnChrome'
import { useCases } from '@/lib/casesStore'
import { getClientById, useClients } from '@/lib/clientsStore'
import { formatBdt } from '@/lib/dashboardMetrics'
import { downloadCsv } from '@/lib/downloadCsv'
import { formatDisplayDate } from '@/lib/formatDate'
import { formatPaymentAmount, usePayments } from '@/lib/paymentsStore'
import { useSubAgents } from '@/lib/subAgentsStore'
import { cn } from '@/lib/utils'
import '@/styles/layout-ops.css'
import '@/styles/layout-clients.css'

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function defaultFrom(): string {
  const date = new Date()
  date.setDate(date.getDate() - 30)
  return toDateInputValue(date)
}

function inRange(isoDate: string, from: string, to: string): boolean {
  const key = isoDate.slice(0, 10)
  if (from && key < from) return false
  if (to && key > to) return false
  return true
}


function isOpenService(status: string): boolean {
  return status !== 'Completed' && status !== 'Cancelled'
}

export default function ReportsPage() {
  const payments = usePayments()
  const cases = useCases()
  const clients = useClients()
  const subAgents = useSubAgents()
  const [from, setFrom] = useState(defaultFrom)
  const [to, setTo] = useState(() => toDateInputValue(new Date()))

  const collections = useMemo(
    () =>
      payments
        .filter((item) => inRange(item.createdAt, from, to))
        .slice()
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [payments, from, to],
  )

  const collectionsTotal = collections.reduce((sum, item) => sum + item.amount, 0)

  const outstandingByService = useMemo(() => {
    const map = new Map<string, { service: string; count: number; balance: number }>()
    for (const item of cases) {
      if (!isOpenService(item.status) || item.balance <= 0) continue
      const current = map.get(item.service) ?? {
        service: item.service,
        count: 0,
        balance: 0,
      }
      current.count += 1
      current.balance += item.balance
      map.set(item.service, current)
    }
    return [...map.values()].sort((a, b) => b.balance - a.balance)
  }, [cases])

  const subAgentPipeline = useMemo(() => {
    return subAgents
      .map((agent) => {
        const agentClients = clients.filter((client) => client.subAgentId === agent.id)
        const clientIds = new Set(agentClients.map((client) => client.id))
        const agentCases = cases.filter((item) => clientIds.has(item.clientId))
        const open = agentCases.filter((item) => isOpenService(item.status))
        const outstanding = open.reduce((sum, item) => sum + item.balance, 0)
        const collected = payments
          .filter(
            (item) =>
              clientIds.has(item.clientId) && inRange(item.createdAt, from, to),
          )
          .reduce((sum, item) => sum + item.amount, 0)
        return {
          id: agent.id,
          name: agent.name,
          clients: agentClients.length,
          openCases: open.length,
          collected,
          outstanding,
        }
      })
      .filter((row) => row.clients > 0 || row.openCases > 0 || row.collected > 0)
      .sort((a, b) => b.outstanding - a.outstanding || b.collected - a.collected)
  }, [subAgents, clients, cases, payments, from, to])

  return (
    <div
      className={cn(elevatedPageClass, 'pd-page pd-page--elevated pd-ops')}
      data-elevated-canvas
      aria-label="Reports"
    >
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="m-0 text-xl font-semibold tracking-tight">Reports</h1>
      </header>

      <div className="pd-ops__toolbar">
        <Input
          label="From"
          type="date"
          value={from}
          onChange={(event) => setFrom(event.target.value)}
          className={pureWhiteFieldClass}
        />
        <Input
          label="To"
          type="date"
          value={to}
          onChange={(event) => setTo(event.target.value)}
          className={pureWhiteFieldClass}
        />
      </div>

      <section className="pd-ops__section" aria-label="Collections">
        <div className="pd-ops__toolbar">
          <h2 className="pd-ops__section-title">
            Collections · {formatBdt(collectionsTotal)}
          </h2>
          <Button
            size="sm"
            variant="outline"
            className={pureWhiteOutlineClass}
            onClick={() =>
              downloadCsv('collections.csv', [
                ['Date', 'Client', 'Service', 'Method', 'Txn ID', 'Amount', 'Note'],
                ...collections.map((payment) => {
                  const client = getClientById(payment.clientId)
                  const caseItem = cases.find((item) => item.id === payment.caseId)
                  return [
                    payment.createdAt.slice(0, 10),
                    client?.name ?? payment.clientId,
                    caseItem?.service ?? '',
                    payment.method,
                    payment.txnId ?? '',
                    String(payment.amount),
                    payment.note ?? '',
                  ]
                }),
              ])
            }
            disabled={collections.length === 0}
          >
            <Download size={14} strokeWidth={2.25} aria-hidden />
            CSV
          </Button>
        </div>
        {collections.length === 0 ? (
          <Empty className="bg-card shadow-sm">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FileBarChart aria-hidden />
              </EmptyMedia>
              <EmptyTitle>No Collections In This Range</EmptyTitle>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className={tableShellClass}>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-0">
                  <TableHead className={chromeHeadClass}>Date</TableHead>
                  <TableHead className={chromeHeadClass}>Client</TableHead>
                  <TableHead className={chromeHeadClass}>Service</TableHead>
                  <TableHead className={chromeHeadClass}>Method</TableHead>
                  <TableHead className={chromeHeadClass}>Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {collections.map((payment) => {
                  const client = getClientById(payment.clientId)
                  const caseItem = cases.find((item) => item.id === payment.caseId)
                  return (
                    <TableRow key={payment.id}>
                      <TableCell>{formatDisplayDate(payment.createdAt)}</TableCell>
                      <TableCell>{client?.name ?? payment.clientId}</TableCell>
                      <TableCell>{caseItem?.service ?? '-'}</TableCell>
                      <TableCell>{payment.method}</TableCell>
                      <TableCell>{formatPaymentAmount(payment.amount)}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <section className="pd-ops__section" aria-label="Outstanding By Service">
        <div className="pd-ops__toolbar">
          <h2 className="pd-ops__section-title">Outstanding By Service</h2>
          <Button
            size="sm"
            variant="outline"
            className={pureWhiteOutlineClass}
            onClick={() =>
              downloadCsv('outstanding-by-service.csv', [
                ['Service', 'Open files', 'Outstanding'],
                ...outstandingByService.map((row) => [
                  row.service,
                  String(row.count),
                  String(row.balance),
                ]),
              ])
            }
            disabled={outstandingByService.length === 0}
          >
            <Download size={14} strokeWidth={2.25} aria-hidden />
            CSV
          </Button>
        </div>
        {outstandingByService.length === 0 ? (
          <Empty className="bg-card shadow-sm">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FileBarChart aria-hidden />
              </EmptyMedia>
              <EmptyTitle>Nothing Outstanding</EmptyTitle>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className={tableShellClass}>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-0">
                  <TableHead className={chromeHeadClass}>Service</TableHead>
                  <TableHead className={chromeHeadClass}>Open Files</TableHead>
                  <TableHead className={chromeHeadClass}>Outstanding</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {outstandingByService.map((row) => (
                  <TableRow key={row.service}>
                    <TableCell>{row.service}</TableCell>
                    <TableCell>{row.count}</TableCell>
                    <TableCell>{formatPaymentAmount(row.balance)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <section className="pd-ops__section" aria-label="Sub-Agent Pipeline">
        <div className="pd-ops__toolbar">
          <h2 className="pd-ops__section-title">Sub-Agent Pipeline</h2>
          <Button
            size="sm"
            variant="outline"
            className={pureWhiteOutlineClass}
            onClick={() =>
              downloadCsv('sub-agent-pipeline.csv', [
                ['Sub Agent', 'Clients', 'Open Services', 'Collected', 'Outstanding'],
                ...subAgentPipeline.map((row) => [
                  row.name,
                  String(row.clients),
                  String(row.openCases),
                  String(row.collected),
                  String(row.outstanding),
                ]),
              ])
            }
            disabled={subAgentPipeline.length === 0}
          >
            <Download size={14} strokeWidth={2.25} aria-hidden />
            CSV
          </Button>
        </div>
        {subAgentPipeline.length === 0 ? (
          <Empty className="bg-card shadow-sm">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FileBarChart aria-hidden />
              </EmptyMedia>
              <EmptyTitle>No Sub-Agent Activity</EmptyTitle>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className={tableShellClass}>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-0">
                  <TableHead className={chromeHeadClass}>Sub Agent</TableHead>
                  <TableHead className={chromeHeadClass}>Clients</TableHead>
                  <TableHead className={chromeHeadClass}>Open</TableHead>
                  <TableHead className={chromeHeadClass}>Collected</TableHead>
                  <TableHead className={chromeHeadClass}>Outstanding</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subAgentPipeline.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.clients}</TableCell>
                    <TableCell>{row.openCases}</TableCell>
                    <TableCell>{formatPaymentAmount(row.collected)}</TableCell>
                    <TableCell>{formatPaymentAmount(row.outstanding)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  )
}
