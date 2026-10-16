import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Activity,
  AlertTriangle,
  CircleDollarSign,
  Files,
  FolderOpen,
  HandCoins,
  History,
  Layers,
  PieChart,
  TrendingUp,
} from 'lucide-react'
import { FilterChip, FilterChips, PageHeader } from '@/components/ui'
import { TodayFollowUps } from '@/components/home/TodayFollowUps'
import { BentoTile } from '@/components/dashboard/BentoTile'
import { DonutChart, type DonutSlice } from '@/components/dashboard/DonutChart'
import { TrendChart } from '@/components/dashboard/TrendChart'
import { StatCards } from '@/components/StatCards'
import type { SegmentTone } from '@/components/dashboard/StackedBar'
import { useCases } from '@/lib/casesStore'
import {
  balancesToCollect,
  casesByStatus,
  casesCreatedBetween,
  collectionsTrendForPeriod,
  DASH_PERIODS,
  formatBdt,
  formatCompactBdt,
  openCasesAsOf,
  receivablesAging,
  resolveDashPeriod,
  serviceMix,
  sumPaymentsBetween,
  type DashPeriod,
} from '@/lib/dashboardInsights'
import { usePayments } from '@/lib/paymentsStore'
import '@/styles/layout-dashboard.css'

const SERVICE_TONES: SegmentTone[] = [
  'brand',
  'info',
  'success',
  'warning',
  'brand-soft',
]

type SideKind = 'aging' | 'services' | 'status'

const STATUS_TONE: Record<string, SegmentTone> = {
  Pending: 'info',
  'In-Progress': 'brand',
  'On-Hold': 'warning',
  Completed: 'success',
  Cancelled: 'muted',
}
type BentoPlace = 'wide' | 'cell' | 'full'

const PLACE_CLASS: Record<BentoPlace, string> = {
  wide: 'pd-dash-bento__wide',
  cell: 'pd-dash-bento__cell',
  full: 'pd-dash-bento__full',
}

const AGING_TONE: Record<string, SegmentTone> = {
  current: 'success',
  '30': 'info',
  '60': 'warning',
  '90': 'danger',
}

function figureAmount(amount: number): string {
  if (Math.abs(amount) >= 100_000) return formatCompactBdt(amount)
  return formatBdt(amount)
}

function fileCount(count: number): string {
  return `${count} file${count === 1 ? '' : 's'}`
}

function localIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const cases = useCases()
  const payments = usePayments()
  const [period, setPeriod] = useState<DashPeriod>('this-month')

  const window = useMemo(() => resolveDashPeriod(period), [period])

  const collected = useMemo(
    () => sumPaymentsBetween(payments, window.startDay, window.endDay),
    [payments, window.endDay, window.startDay],
  )
  const priorCollected = useMemo(
    () =>
      sumPaymentsBetween(payments, window.priorStartDay, window.priorEndDay),
    [payments, window.priorEndDay, window.priorStartDay],
  )
  const trend = useMemo(
    () => collectionsTrendForPeriod(payments, window),
    [payments, window],
  )
  const stockCases = useMemo(
    () => openCasesAsOf(cases, window.endDay),
    [cases, window.endDay],
  )
  const periodCases = useMemo(
    () => casesCreatedBetween(cases, window.startDay, window.endDay),
    [cases, window.endDay, window.startDay],
  )
  const aging = useMemo(
    () => receivablesAging(stockCases, window.asOf),
    [stockCases, window.asOf],
  )
  const services = useMemo(() => serviceMix(periodCases), [periodCases])
  const statuses = useMemo(() => casesByStatus(periodCases), [periodCases])
  const collect = useMemo(
    () => balancesToCollect(stockCases, 6, window.asOf),
    [stockCases, window.asOf],
  )

  const trendTotal = trend.reduce((sum, bucket) => sum + bucket.amount, 0)
  const outstanding = aging.reduce((sum, bucket) => sum + bucket.amount, 0)
  const outstandingFiles = aging.reduce((sum, bucket) => sum + bucket.count, 0)
  const pastDue = aging.filter((bucket) => bucket.key !== 'current')
  const pastDueAmount = pastDue.reduce((sum, bucket) => sum + bucket.amount, 0)
  const pastDueFiles = pastDue.reduce((sum, bucket) => sum + bucket.count, 0)
  const serviceTotal = services.reduce((sum, row) => sum + row.count, 0)
  const statusTotal = statuses.reduce((sum, row) => sum + row.count, 0)

  const agingSlices: DonutSlice[] = aging.map((bucket) => ({
    key: bucket.key,
    label: bucket.label,
    value: bucket.amount,
    display: figureAmount(bucket.amount),
    tone: AGING_TONE[bucket.key] ?? 'muted',
  }))

  const topServices = services.slice(0, 5)
  const otherServices = services
    .slice(5)
    .reduce((sum, row) => sum + row.count, 0)
  const serviceSlices: DonutSlice[] = [
    ...topServices.map((row, index) => ({
      key: row.key,
      label: row.label,
      value: row.count,
      display: fileCount(row.count),
      tone: SERVICE_TONES[index] ?? 'muted',
    })),
    ...(otherServices > 0
      ? [
          {
            key: 'other',
            label: 'Other',
            value: otherServices,
            display: fileCount(otherServices),
            tone: 'muted' as const,
          },
        ]
      : []),
  ]
  const statusSlices: DonutSlice[] = statuses.map((row) => ({
    key: row.key,
    label: row.label,
    value: row.count,
    display: fileCount(row.count),
    tone: STATUS_TONE[row.key] ?? 'muted',
  }))

  const asOfLabel = window.asOf.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  const collectMax = Math.max(...collect.map((row) => row.amount), 1)
  const sides: SideKind[] = []
  if (outstanding > 0) sides.push('aging')
  if (serviceSlices.length > 0) sides.push('services')
  if (statusSlices.length > 0) sides.push('status')
  const showTrend = trendTotal > 0
  const leadSide = showTrend ? (sides[0] ?? null) : null
  const bottomSides = showTrend ? sides.slice(1) : sides
  const collectBeside = bottomSides.length === 0 ? 0 : bottomSides.length
  const collectPlace: BentoPlace | null =
    collect.length === 0
      ? null
      : collectBeside >= 2
        ? 'cell'
        : collectBeside === 1
          ? 'wide'
          : 'full'
  const sidesBeforeCollect = collectBeside === 0 ? bottomSides : []
  const sidesAfterCollect = collectBeside === 0 ? [] : bottomSides

  return (
    <div className="pd-page pd-dash" aria-label="Dashboard">
      <PageHeader
        title="Dashboard"
        titleAside={
          <FilterChips label="Dashboard period" className="pd-dash__periods">
            {DASH_PERIODS.map((option) => (
              <FilterChip
                key={option.id}
                active={period === option.id}
                onClick={() => setPeriod(option.id)}
              >
                {option.label}
              </FilterChip>
            ))}
          </FilterChips>
        }
        actions={
          <time className="pd-dash__asof" dateTime={localIsoDate(window.asOf)}>
            As of {asOfLabel}
          </time>
        }
      />

      <TodayFollowUps compact />

      <div className="pd-dash-bento">
        <div className="pd-dash-bento__kpis">
          <StatCards
            label="Cash position"
            onSelect={(id) => {
              if (id === 'collected' || id === 'prior') navigate('/payments')
              else navigate('/services')
            }}
            cards={[
              {
                id: 'collected',
                label: 'Collected',
                value: figureAmount(collected),
                icon: HandCoins,
                tone: 'brand',
              },
              {
                id: 'prior',
                label: window.priorLabel,
                value: figureAmount(priorCollected),
                icon: History,
                tone: 'brand',
              },
              {
                id: 'outstanding',
                label: 'Due',
                value: figureAmount(outstanding),
                icon: CircleDollarSign,
                tone: 'brand',
              },
              {
                id: 'open-files',
                label: 'Due files',
                value: String(outstandingFiles),
                icon: FolderOpen,
                tone: 'brand',
              },
              {
                id: 'past-due',
                label: 'Overdue',
                value: figureAmount(pastDueAmount),
                icon: AlertTriangle,
                tone: 'brand',
              },
              {
                id: 'past-due-files',
                label: 'Overdue files',
                value: String(pastDueFiles),
                icon: Files,
                tone: 'brand',
              },
            ]}
          />
        </div>

        {showTrend ? (
          <BentoTile
            className="pd-dash-bento__wide pd-dash-bento__trend"
            title="Trend"
            icon={TrendingUp}
            meta={window.trendMeta}
            to="/payments"
          >
            <TrendChart buckets={trend} />
          </BentoTile>
        ) : null}

        {leadSide ? renderSide(leadSide) : null}
        {sidesBeforeCollect.map((kind) => renderSide(kind))}

        {collectPlace ? (
          <BentoTile
            className={PLACE_CLASS[collectPlace]}
            title="Collect"
            icon={HandCoins}
            to="/services"
          >
            <ul className="pd-dash-bars">
              {collect.map((row) => {
                const width = Math.max(
                  4,
                  Math.round((row.amount / collectMax) * 100),
                )
                return (
                  <li key={row.id}>
                    <Link
                      to={row.href}
                      className={
                        row.ageDays > 30
                          ? 'pd-dash-bars__row is-late'
                          : 'pd-dash-bars__row'
                      }
                    >
                      <span className="pd-dash-bars__label">{row.name}</span>
                      <span className="pd-dash-bars__track">
                        <span
                          className="pd-dash-bars__fill"
                          style={{ width: `${width}%` }}
                        />
                      </span>
                      <span className="pd-dash-bars__value">
                        {figureAmount(row.amount)}
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </BentoTile>
        ) : null}

        {sidesAfterCollect.map((kind) => renderSide(kind))}
      </div>
    </div>
  )

  function renderSide(kind: SideKind) {
    if (kind === 'aging') {
      return (
        <BentoTile
          key="aging"
          className="pd-dash-bento__cell"
          title="Aging"
          icon={PieChart}
          to="/services"
        >
          <DonutChart
            slices={agingSlices}
            centerValue={figureAmount(outstanding)}
            centerLabel="Due"
          />
        </BentoTile>
      )
    }
    if (kind === 'services') {
      return (
        <BentoTile
          key="services"
          className="pd-dash-bento__cell"
          title="Services"
          icon={Layers}
          to="/services"
        >
          <DonutChart
            slices={serviceSlices}
            centerValue={String(serviceTotal)}
            centerLabel={serviceTotal === 1 ? 'File' : 'Files'}
          />
        </BentoTile>
      )
    }
    return (
      <BentoTile
        key="status"
        className="pd-dash-bento__cell"
        title="Status"
        icon={Activity}
        to="/services"
      >
        <DonutChart
          slices={statusSlices}
          centerValue={String(statusTotal)}
          centerLabel={statusTotal === 1 ? 'File' : 'Files'}
        />
      </BentoTile>
    )
  }
}
