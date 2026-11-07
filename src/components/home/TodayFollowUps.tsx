import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  CheckCircle2,
  FileWarning,
  ListTodo,
} from 'lucide-react'
import { filterChipClass } from '@/components/clients/shadcnChrome'
import { cn } from '@/lib/utils'
import { useCases } from '@/lib/casesStore'
import { useClients } from '@/lib/clientsStore'
import { useRequests } from '@/lib/requestsStore'
import {
  TODAY_BUCKETS,
  buildTodayFollowUps,
  pickDefaultTodayBucket,
  todayFollowUpsHeadline,
  todayFollowUpsTotal,
  type TodayBucketId,
} from '@/lib/todayFollowUps'
import '@/styles/layout-home.css'

const BUCKET_ICON = {
  money: Banknote,
  docs: FileWarning,
  stuck: AlertTriangle,
} as const

type TodayFollowUpsProps = {
  /**
   * `summary` — slim strip for Home (counts only, no client list).
   * `panel` — scrollable chase list for Dashboard.
   */
  variant?: 'summary' | 'panel'
  /** @deprecated Prefer variant="panel". Kept for Dashboard call sites. */
  compact?: boolean
}

export function TodayFollowUps({
  variant,
  compact = false,
}: TodayFollowUpsProps) {
  const mode = variant ?? (compact ? 'panel' : 'summary')
  const cases = useCases()
  const clients = useClients()
  const requests = useRequests()

  const summary = useMemo(
    () => buildTodayFollowUps({ cases, clients, requests }),
    [cases, clients, requests],
  )
  const total = todayFollowUpsTotal(summary)

  if (mode === 'summary') {
    return <TodaySummaryStrip summary={summary} total={total} />
  }

  return <TodayChasePanel summary={summary} total={total} />
}

function TodaySummaryStrip({
  summary,
  total,
}: {
  summary: ReturnType<typeof buildTodayFollowUps>
  total: number
}) {
  if (total === 0) return null

  return (
    <Link
      to="/dashboard"
      className="pd-today-strip"
      aria-label={`Today: ${todayFollowUpsHeadline(summary)}. Open dashboard.`}
    >
      <span className="pd-today-strip__label">
        <ListTodo size={14} strokeWidth={2.25} aria-hidden />
        Today
      </span>
      <span className="pd-today-strip__stats">
        {TODAY_BUCKETS.map((bucket) => {
          const count = summary[bucket.id].items.length
          if (count === 0) return null
          const Icon = BUCKET_ICON[bucket.id]
          return (
            <span key={bucket.id} className="pd-today-strip__stat">
              <Icon size={13} strokeWidth={2.25} aria-hidden />
              {count} {bucket.label.toLowerCase()}
            </span>
          )
        })}
      </span>
      <span className="pd-today-strip__go" aria-hidden>
        <ArrowRight size={14} strokeWidth={2.25} />
      </span>
    </Link>
  )
}

function TodayChasePanel({
  summary,
  total,
}: {
  summary: ReturnType<typeof buildTodayFollowUps>
  total: number
}) {
  const [bucket, setBucket] = useState<TodayBucketId>(() =>
    pickDefaultTodayBucket(summary),
  )

  const activeBucket =
    summary[bucket].items.length > 0
      ? bucket
      : pickDefaultTodayBucket(summary)
  const rows = summary[activeBucket].items
  const emptyCopy =
    TODAY_BUCKETS.find((item) => item.id === activeBucket)?.empty ??
    'Nothing here.'

  return (
    <section
      className="pd-today pd-today--compact"
      aria-label={`Today. ${todayFollowUpsHeadline(summary)}`}
    >
      <header className="pd-today__head">
        <div className="pd-today__title-row">
          <span className="pd-today__icon" aria-hidden>
            <ListTodo size={16} strokeWidth={2.25} />
          </span>
          <h2 className="pd-today__title">Today</h2>
          {total > 0 ? (
            <span className="pd-today__count">{total}</span>
          ) : (
            <span className="pd-today__clear" aria-hidden>
              <CheckCircle2 size={16} strokeWidth={2.25} />
            </span>
          )}
        </div>
      </header>

      {total === 0 ? null : (
        <>
          <nav
            className="pd-today__chips flex flex-wrap items-center gap-2"
            aria-label="Follow-up type"
          >
            {TODAY_BUCKETS.map((item) => {
              const count = summary[item.id].items.length
              if (count === 0) return null
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={activeBucket === item.id}
                  className={cn(
                    filterChipClass(activeBucket === item.id),
                    'inline-flex items-center',
                  )}
                  onClick={() => setBucket(item.id)}
                >
                  {item.label}
                  <span className="pd-today__chip-count">{count}</span>
                </button>
              )
            })}
          </nav>

          {rows.length === 0 ? (
            <p className="pd-today__empty">{emptyCopy}</p>
          ) : (
            <ul className="pd-today__list">
              {rows.map((row) => {
                const Icon = BUCKET_ICON[row.bucket]
                return (
                  <li key={row.id}>
                    <Link to={row.href} className="pd-today__row">
                      <span className="pd-today__row-icon" aria-hidden>
                        <Icon size={15} strokeWidth={2.25} />
                      </span>
                      <span className="pd-today__row-text">
                        <span className="pd-today__row-title">{row.title}</span>
                        <span className="pd-today__row-detail">{row.detail}</span>
                      </span>
                      <span className="pd-today__row-go" aria-hidden>
                        <ArrowRight size={14} strokeWidth={2.25} />
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}
    </section>
  )
}
