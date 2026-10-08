import { Link } from 'react-router-dom'
import type { DepartureCheck } from '@/lib/dashboardOperations'
import { formatDisplayDate } from '@/lib/formatDate'
import '@/styles/layout-bento.css'

type DepartureTimelineProps = {
  checks: DepartureCheck[]
  /** Days shown before today; older missed dates pin to the left edge. */
  pastDays: number
  futureDays: number
}

function docsReadyRatio(check: DepartureCheck): number {
  if (check.documentsRequired === 0) return 1
  return check.documentsReady / check.documentsRequired
}

function docsReadyTone(docsReady: number): 'ready' | 'partial' | 'blocked' {
  if (docsReady >= 1) return 'ready'
  return docsReady >= 0.5 ? 'partial' : 'blocked'
}

function whenLabel(daysUntil: number): string {
  if (daysUntil === 0) return 'Today'
  if (daysUntil < 0) return `Missed by ${Math.abs(daysUntil)}d`
  return `In ${daysUntil}d`
}

export function DepartureTimeline({
  checks,
  pastDays,
  futureDays,
}: DepartureTimelineProps) {
  const span = pastDays + futureDays
  const positionOf = (days: number) =>
    ((Math.min(Math.max(days, -pastDays), futureDays) + pastDays) / span) * 100
  const ticks = [-pastDays, 0, ...[30, 60, 90].filter((day) => day <= futureDays)]

  return (
    <div className="pd-departures">
      <div className="pd-departures__axis">
        <span
          className="pd-departures__missed-zone"
          style={{ width: `calc(${positionOf(0)}% + 0.6rem)` }}
          aria-hidden
        />
        <span className="pd-departures__rail" aria-hidden />
        {ticks.map((day) => (
          <span
            key={day}
            className={
              day === 0
                ? 'pd-departures__tick pd-departures__tick--today'
                : 'pd-departures__tick'
            }
            style={{ left: `${positionOf(day)}%` }}
          >
            {day === 0 ? 'Today' : day < 0 ? `${day}d` : `+${day}d`}
          </span>
        ))}
        {checks.map((check) => (
          <Link
            key={check.id}
            to={check.href}
            className={`pd-departures__marker pd-departures__marker--${docsReadyTone(docsReadyRatio(check))}`}
            style={{ left: `${positionOf(check.daysUntil)}%` }}
            title={`${check.name} · ${formatDisplayDate(check.departureDate)} · ${Math.round(docsReadyRatio(check) * 100)}% docs ready`}
            aria-label={`${check.name}, departs ${formatDisplayDate(check.departureDate)}`}
          />
        ))}
      </div>

      <ul className="pd-departures__list">
        {checks.slice(0, 4).map((check) => {
          const docsReady = docsReadyRatio(check)
          return (
            <li key={check.id}>
              <Link to={check.href} className="pd-departures__row">
                <span
                  className={`pd-departures__when pd-departures__when--${check.daysUntil < 0 ? 'missed' : 'upcoming'}`}
                >
                  {whenLabel(check.daysUntil)}
                </span>
                <span className="pd-departures__copy">
                  <span className="pd-departures__name">{check.name}</span>
                  <span className="pd-departures__detail">{check.detail}</span>
                </span>
                <span className="pd-departures__ready">
                  <span className="pd-departures__meter" aria-hidden>
                    <span
                      className={`pd-departures__meter-fill pd-departures__meter-fill--${docsReadyTone(docsReady)}`}
                      style={{ width: `${Math.round(docsReady * 100)}%` }}
                    />
                  </span>
                  <span className="pd-departures__ready-value">
                    {Math.round(docsReady * 100)}% docs
                  </span>
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
