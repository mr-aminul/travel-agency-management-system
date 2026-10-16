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
import { FilterChip, FilterChips } from '@/components/ui'
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
  /** Compact layout for the analytics dashboard. */
  compact?: boolean
}

export function TodayFollowUps({ compact = false }: TodayFollowUpsProps) {
  const cases = useCases()
  const clients = useClients()
  const requests = useRequests()

  const summary = useMemo(
    () => buildTodayFollowUps({ cases, clients, requests }),
    [cases, clients, requests],
  )
  const total = todayFollowUpsTotal(summary)
  const [bucket, setBucket] = useState<TodayBucketId>(() =>
    pickDefaultTodayBucket(summary),
  )

  const activeBucket =
    summary[bucket].length > 0 ? bucket : pickDefaultTodayBucket(summary)
  const rows = summary[activeBucket]
  const emptyCopy =
    TODAY_BUCKETS.find((item) => item.id === activeBucket)?.empty ??
    'Nothing here.'

  return (
    <section
      className={
        compact
          ? 'pd-today pd-today--compact'
          : 'pd-today'
      }
      aria-label="Today follow-ups"
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
        <p className="pd-today__headline">{todayFollowUpsHeadline(summary)}</p>
      </header>

      {total === 0 ? null : (
        <>
          <FilterChips label="Follow-up type" className="pd-today__chips">
            {TODAY_BUCKETS.map((item) => {
              const count = summary[item.id].length
              if (count === 0) return null
              return (
                <FilterChip
                  key={item.id}
                  active={activeBucket === item.id}
                  onClick={() => setBucket(item.id)}
                >
                  {item.label}
                  <span className="pd-today__chip-count">{count}</span>
                </FilterChip>
              )
            })}
          </FilterChips>

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
