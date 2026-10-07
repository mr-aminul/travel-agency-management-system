import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader, type BadgeVariant } from '@/components/ui'
import {
  AlertTriangle,
  CircleDollarSign,
  FolderOpen,
  HandCoins,
  Percent,
  Receipt,
  Users,
} from 'lucide-react'
import { AgingChart } from '@/components/dashboard/AgingChart'
import { BarList } from '@/components/dashboard/BarList'
import { DashboardPanel } from '@/components/dashboard/DashboardPanel'
import { FunnelChart } from '@/components/dashboard/FunnelChart'
import { InsightList } from '@/components/dashboard/InsightList'
import { PulseStrip } from '@/components/dashboard/PulseStrip'
import { TrendChart } from '@/components/dashboard/TrendChart'
import { StatCards } from '@/components/StatCards'
import { useCases } from '@/lib/casesStore'
import { useClients } from '@/lib/clientsStore'
import {
  buildExecutivePulse,
  clientsBySubAgent,
  collectionsByMonth,
  computeOwnerKpis,
  formatBdt,
  formatCollectionRate,
  formatCompactBdt,
  formatDeltaPercent,
  needsAttention,
  pipelineFunnel,
  recentPayments,
  receivablesAging,
  revenueByService,
  topOutstanding,
  upcomingDepartures,
  workloadByAssignee,
  type AttentionReason,
} from '@/lib/dashboardInsights'
import { useEmployees } from '@/lib/employeesStore'
import { formatDisplayDate } from '@/lib/formatDate'
import { usePayments } from '@/lib/paymentsStore'
import { useSubAgents } from '@/lib/subAgentsStore'
import { useRequests } from '@/lib/requestsStore'
import '@/styles/layout-ops.css'
import '@/styles/layout-dashboard.css'

const ATTENTION_BADGE: Record<
  AttentionReason,
  { label: string; variant: BadgeVariant }
> = {
  'pending-request': { label: 'Request', variant: 'pending' },
  'on-hold': { label: 'On hold', variant: 'on-hold' },
  'missing-docs': { label: 'Docs', variant: 'danger' },
  stale: { label: 'Stale', variant: 'neutral' },
}

function deltaTone(change: number | null): 'up' | 'down' | 'flat' {
  if (change == null || Math.abs(change) < 0.005) return 'flat'
  return change > 0 ? 'up' : 'down'
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const clients = useClients()
  const cases = useCases()
  const payments = usePayments()
  const subAgents = useSubAgents()
  const requests = useRequests()
  const employees = useEmployees()

  const kpis = useMemo(
    () => computeOwnerKpis(clients, cases, payments, requests),
    [clients, cases, payments, requests],
  )
  const months = useMemo(() => collectionsByMonth(payments, 12), [payments])
  const funnel = useMemo(() => pipelineFunnel(cases), [cases])
  const revenueMix = useMemo(() => revenueByService(cases).slice(0, 6), [cases])
  const aging = useMemo(() => receivablesAging(cases), [cases])
  const attention = useMemo(
    () => needsAttention(cases, requests, clients, 6),
    [cases, requests, clients],
  )
  const collections = useMemo(
    () => recentPayments(payments, clients, cases, 6),
    [payments, clients, cases],
  )
  const outstanding = useMemo(() => topOutstanding(cases, 6), [cases])
  const departures = useMemo(() => upcomingDepartures(cases, 6), [cases])
  const subAgentMix = useMemo(
    () => clientsBySubAgent(clients, subAgents),
    [clients, subAgents],
  )
  const workload = useMemo(
    () => workloadByAssignee(cases, employees, 6),
    [cases, employees],
  )
  const pulse = useMemo(
    () => buildExecutivePulse(kpis, aging, months),
    [kpis, aging, months],
  )

  const monthTotal = months.reduce((sum, bucket) => sum + bucket.amount, 0)
  const agingTotal = aging.reduce((sum, bucket) => sum + bucket.amount, 0)
  const sparkValues = months.map((bucket) => bucket.amount)
  const momDelta = formatDeltaPercent(kpis.collectedMomChange)
  const asOfLabel = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  return (
    <div className="pd-page pd-dash" aria-label="Dashboard">
      <PageHeader
        title="Executive dashboard"
        description="Cash, pipeline health, and the decisions that protect the book."
        actions={
          <span className="pd-dash__asof">As of {asOfLabel}</span>
        }
      />

      <PulseStrip insights={pulse} />

      <div className="pd-dash__kpis">
        <StatCards
          label="Owner snapshot"
          onSelect={(id) => {
            if (id === 'clients') navigate('/clients')
            else if (id === 'open' || id === 'risk') navigate('/services')
            else navigate('/payments')
          }}
          cards={[
            {
              id: 'collected',
              label: 'Collected',
              value: formatCompactBdt(kpis.collected),
              hint: `${formatCompactBdt(kpis.collectedLast30Days)} in last 30 days`,
              icon: HandCoins,
              tone: 'success',
              delta: momDelta,
              deltaTone: deltaTone(kpis.collectedMomChange),
              sparkline: sparkValues,
            },
            {
              id: 'outstanding',
              label: 'Outstanding',
              value: formatCompactBdt(kpis.outstanding),
              hint:
                agingTotal > 0
                  ? `${formatCompactBdt(
                      aging
                        .filter((bucket) => bucket.key !== 'current')
                        .reduce((sum, bucket) => sum + bucket.amount, 0),
                    )} aged 30d+`
                  : 'No open balances',
              icon: CircleDollarSign,
              tone: 'warning',
            },
            {
              id: 'rate',
              label: 'Collection rate',
              value: formatCollectionRate(kpis.collectionRate),
              hint: `${formatCollectionRate(kpis.completionRate)} completion`,
              icon: Percent,
              tone: 'brand',
            },
            {
              id: 'booked',
              label: 'Booked fees',
              value: formatCompactBdt(kpis.bookedRevenue),
              hint:
                kpis.averageTicket > 0
                  ? `Avg ticket ${formatCompactBdt(kpis.averageTicket)}`
                  : 'No billable services yet',
              icon: Receipt,
              tone: 'info',
            },
            {
              id: 'open',
              label: 'Open services',
              value: String(kpis.openCases),
              hint: `${kpis.completedCases} completed · ${formatCollectionRate(kpis.holdRate)} on hold`,
              icon: FolderOpen,
              tone: 'info',
            },
            {
              id: 'risk',
              label: 'At risk',
              value: String(kpis.atRiskCount),
              hint: `${kpis.pendingRequests} pending · ${kpis.staleOpenCases} stale`,
              icon: AlertTriangle,
              tone: kpis.atRiskCount > 0 ? 'warning' : 'muted',
            },
            {
              id: 'clients',
              label: 'Active clients',
              value: String(kpis.activeClients),
              hint: `${clients.length} total on file`,
              icon: Users,
              tone: 'muted',
            },
          ]}
        />
      </div>

      <div className="pd-dash__hero-charts">
        <DashboardPanel
          className="pd-dash-panel--wide"
          title="Collections trend"
          description="Cash received by month — the operating rhythm of the agency."
          meta="Last 12 months"
          isEmpty={monthTotal === 0}
          empty={{
            title: 'No collections yet',
            description: 'Payments will appear here as they are recorded.',
          }}
        >
          <TrendChart buckets={months} />
        </DashboardPanel>
      </div>

      <div className="pd-dash__charts">
        <DashboardPanel
          title="Pipeline funnel"
          description="Where active work sits today."
          meta={`${cases.length} services`}
          isEmpty={funnel.length === 0}
          empty={{
            title: 'No services yet',
            description: 'Open a client file to start seeing pipeline volume.',
          }}
        >
          <FunnelChart items={funnel} />
        </DashboardPanel>
        <DashboardPanel
          title="Revenue by service"
          description="Booked fees — not just file counts."
          meta={`${revenueMix.length} lines`}
          isEmpty={revenueMix.length === 0}
          empty={{
            title: 'No revenue mix',
            description: 'Service fees appear once files are created.',
          }}
        >
          <BarList
            items={revenueMix.map((row) => ({
              key: row.key,
              label: row.label,
              value: row.amount,
              display: formatCompactBdt(row.amount),
            }))}
          />
        </DashboardPanel>
        <DashboardPanel
          title="Receivables aging"
          description="Outstanding balances by file age."
          meta={formatCompactBdt(agingTotal)}
          isEmpty={agingTotal === 0}
          empty={{
            title: 'Nothing due',
            description: 'Open balances will age here as they accrue.',
          }}
        >
          <AgingChart buckets={aging} />
        </DashboardPanel>
      </div>

      <div className="pd-dash__actions">
        <DashboardPanel
          title="Needs attention"
          meta={`${attention.length} items`}
          isEmpty={attention.length === 0}
          empty={{
            title: 'Nothing waiting',
            description: 'No holds, missing documents, stale files, or pending requests.',
          }}
        >
          <InsightList
            items={attention.map((item) => ({
              id: item.id,
              title: item.title,
              detail: item.detail,
              href: item.href,
              badge: ATTENTION_BADGE[item.reason],
            }))}
          />
        </DashboardPanel>
        <DashboardPanel
          title="Recent collections"
          isEmpty={collections.length === 0}
          empty={{
            title: 'No payments',
            description: 'Latest receipts will show up here.',
          }}
        >
          <InsightList
            items={collections.map((item) => ({
              id: item.id,
              title: item.name,
              detail: `${item.detail} · ${formatDisplayDate(item.date)}`,
              href: item.href,
              value: formatBdt(item.amount),
            }))}
          />
        </DashboardPanel>
        <DashboardPanel
          title="Top outstanding"
          isEmpty={outstanding.length === 0}
          empty={{
            title: 'Nothing due',
            description: 'Open balances will rank here.',
          }}
        >
          <InsightList
            items={outstanding.map((item) => ({
              id: item.id,
              title: item.name,
              detail: item.detail,
              href: item.href,
              value: formatBdt(item.amount),
            }))}
          />
        </DashboardPanel>
        <DashboardPanel
          title="Upcoming departures"
          isEmpty={departures.length === 0}
          empty={{
            title: 'No travel dates',
            description: 'Open services with a departure date appear here.',
          }}
        >
          <InsightList
            items={departures.map((item) => ({
              id: item.id,
              title: item.name,
              detail: item.detail,
              href: item.href,
              value: formatDisplayDate(item.departureDate),
            }))}
          />
        </DashboardPanel>
      </div>

      {workload.length > 0 || subAgentMix.length > 0 ? (
        <div className="pd-dash__secondary">
          {workload.length > 0 ? (
            <DashboardPanel
              title="Workload by owner"
              description="Open files on each assignee."
              meta={`${workload.length} owners`}
            >
              <BarList
                items={workload.map((row) => ({
                  key: row.key,
                  label: row.label,
                  value: row.openCases,
                  display: `${row.openCases} · ${formatCompactBdt(row.outstanding)}`,
                }))}
              />
            </DashboardPanel>
          ) : null}
          {subAgentMix.length > 0 ? (
            <DashboardPanel
              title="Sub-agent referrals"
              meta="Clients referred"
            >
              <BarList
                items={subAgentMix.map((row) => ({
                  key: row.subAgentId,
                  label: row.name,
                  value: row.clientCount,
                }))}
              />
            </DashboardPanel>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
