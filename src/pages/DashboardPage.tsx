import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  CircleDollarSign,
  HandCoins,
  TrendingUp,
} from 'lucide-react'
import { FilterChip, FilterChips, PageHeader } from '@/components/ui'
import { TodayFollowUps } from '@/components/home/TodayFollowUps'
import { BentoTile } from '@/components/dashboard/BentoTile'
import { TrendChart } from '@/components/dashboard/TrendChart'
import { StatCards } from '@/components/StatCards'
import { useCases } from '@/lib/casesStore'
import {
  balancesToCollect,
  collectionsTrendForPeriod,
  DASH_PERIODS,
  formatBdt,
  formatCompactBdt,
  formatDeltaPercent,
  openCasesAsOf,
  receivablesAging,
  resolveDashPeriod,
  ratioChange,
  sumPaymentsBetween,
  type DashPeriod,
} from '@/lib/dashboardInsights'
import { usePayments } from '@/lib/paymentsStore'
import '@/styles/layout-dashboard.css'

function figureAmount(amount: number): string {
  if (Math.abs(amount) >= 100_000) return formatCompactBdt(amount)
  return formatBdt(amount)
}

function localIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

function deltaTone(
  change: number | null,
): 'up' | 'down' | 'flat' {
  if (change == null || change === 0) return 'flat'
  return change > 0 ? 'up' : 'down'
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
  const aging = useMemo(
    () => receivablesAging(stockCases, window.asOf),
    [stockCases, window.asOf],
  )
  const collect = useMemo(
    () => balancesToCollect(stockCases, 8, window.asOf),
    [stockCases, window.asOf],
  )

  const collectedChange = ratioChange(collected, priorCollected)
  const collectedDelta = formatDeltaPercent(collectedChange)
  const trendTotal = trend.reduce((sum, bucket) => sum + bucket.amount, 0)
  const outstanding = aging.reduce((sum, bucket) => sum + bucket.amount, 0)
  const outstandingFiles = aging.reduce((sum, bucket) => sum + bucket.count, 0)
  const pastDue = aging.filter((bucket) => bucket.key !== 'current')
  const pastDueAmount = pastDue.reduce((sum, bucket) => sum + bucket.amount, 0)
  const pastDueFiles = pastDue.reduce((sum, bucket) => sum + bucket.count, 0)
  const agingVisible = aging.filter((bucket) => bucket.amount > 0)
  const showTrend = trendTotal > 0
  const collectMax = Math.max(...collect.map((row) => row.amount), 1)

  const asOfLabel = window.asOf.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  return (
    <div className="pd-page pd-dash" aria-label="Dashboard">
      <PageHeader
        title="Dashboard"
        titleAside={
          <FilterChips label="Cash period" className="pd-dash__periods">
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

      <div className="pd-dash__layout">
        <div className="pd-dash__chase">
          <TodayFollowUps variant="panel" />

          <BentoTile
            title="Collect"
            icon={HandCoins}
            meta={
              collect.length > 0
                ? `${collect.length} to chase`
                : 'Nothing due'
            }
            to="/services?due=1"
          >
            {collect.length === 0 ? (
              <p className="pd-dash-note pd-dash-note--solo">
                No open balances right now.
              </p>
            ) : (
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
            )}
          </BentoTile>

          {pastDueAmount > 0 ? (
            <BentoTile
              title="Overdue"
              icon={AlertTriangle}
              meta={`${pastDueFiles} service${pastDueFiles === 1 ? '' : 's'}`}
              to="/services?due=1&overdue=1"
            >
              <ul className="pd-dash-aging">
                {agingVisible
                  .filter((bucket) => bucket.key !== 'current')
                  .map((bucket) => (
                    <li key={bucket.key} className="pd-dash-aging__row">
                      <span className="pd-dash-aging__label">{bucket.label}</span>
                      <span className="pd-dash-aging__count">
                        {bucket.count} service{bucket.count === 1 ? '' : 's'}
                      </span>
                      <span className="pd-dash-aging__amount">
                        {figureAmount(bucket.amount)}
                      </span>
                    </li>
                  ))}
              </ul>
            </BentoTile>
          ) : null}
        </div>

        <div className="pd-dash__insight">
          <StatCards
            label="Cash position"
            className="pd-dash__kpis"
            onSelect={(id) => {
              if (id === 'collected') navigate('/payments?stat=in')
              else if (id === 'overdue')
                navigate('/services?due=1&overdue=1')
              else navigate('/services?due=1')
            }}
            cards={[
              {
                id: 'collected',
                label: 'Collected',
                value: figureAmount(collected),
                hint: `vs ${window.priorLabel.toLowerCase()}`,
                icon: HandCoins,
                tone: 'brand',
                delta: collectedDelta,
                deltaTone: deltaTone(collectedChange),
                sparkline: trend.map((bucket) => bucket.amount),
              },
              {
                id: 'due',
                label: 'Due',
                value: figureAmount(outstanding),
                hint: `${outstandingFiles} open service${outstandingFiles === 1 ? '' : 's'}`,
                icon: CircleDollarSign,
                tone: 'info',
              },
              {
                id: 'overdue',
                label: 'Overdue',
                value: figureAmount(pastDueAmount),
                hint: `${pastDueFiles} past 30 days`,
                icon: AlertTriangle,
                tone: 'warning',
              },
            ]}
          />

          <p className="pd-dash-note">
            Cash period filters collected and the trend. Due and overdue are
            stock as of {asOfLabel}.
          </p>

          {showTrend ? (
            <BentoTile
              className="pd-dash__trend"
              title="Trend"
              icon={TrendingUp}
              meta={window.trendMeta}
              to="/payments?stat=in"
            >
              <TrendChart buckets={trend} />
            </BentoTile>
          ) : (
            <p className="pd-dash-note">
              No collections in this cash period yet.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
