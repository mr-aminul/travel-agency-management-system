import { formatCompactBdt, type MonthBucket } from '@/lib/dashboardInsights'

type MonthBarsProps = {
  buckets: MonthBucket[]
}

export function MonthBars({ buckets }: MonthBarsProps) {
  const max = Math.max(...buckets.map((bucket) => bucket.amount), 1)
  return (
    <ul className="pd-dash-months">
      {buckets.map((bucket) => {
        const percent = Math.max(6, Math.round((bucket.amount / max) * 100))
        return (
          <li key={bucket.key} className="pd-dash-months__col">
            <span className="pd-dash-months__amount">
              {bucket.amount ? formatCompactBdt(bucket.amount) : '—'}
            </span>
            <span className="pd-dash-months__track">
              <span
                className="pd-dash-months__fill"
                style={{ ['--month-pct' as string]: `${percent}%` }}
              />
            </span>
            <span className="pd-dash-months__label">{bucket.label}</span>
          </li>
        )
      })}
    </ul>
  )
}
