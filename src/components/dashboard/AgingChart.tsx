import { formatCompactBdt, type AgingBucket } from '@/lib/dashboardInsights'

type AgingChartProps = {
  buckets: AgingBucket[]
}

export function AgingChart({ buckets }: AgingChartProps) {
  const max = Math.max(...buckets.map((bucket) => bucket.amount), 1)
  const total = buckets.reduce((sum, bucket) => sum + bucket.amount, 0)

  return (
    <div className="pd-dash-aging">
      <div className="pd-dash-aging__stack" aria-hidden={total === 0}>
        {buckets.map((bucket) => {
          if (bucket.amount <= 0) return null
          const share = Math.max(8, Math.round((bucket.amount / total) * 100))
          return (
            <span
              key={bucket.key}
              className={`pd-dash-aging__seg pd-dash-aging__seg--${bucket.key}`}
              style={{ flexGrow: share, flexBasis: 0 }}
              title={`${bucket.label}: ${formatCompactBdt(bucket.amount)}`}
            />
          )
        })}
      </div>
      <ul className="pd-dash-aging__list">
        {buckets.map((bucket) => {
          const height = Math.max(
            8,
            Math.round((bucket.amount / max) * 100),
          )
          return (
            <li key={bucket.key} className="pd-dash-aging__col">
              <span className="pd-dash-aging__amount">
                {bucket.amount ? formatCompactBdt(bucket.amount) : '—'}
              </span>
              <span className="pd-dash-aging__track">
                <span
                  className={`pd-dash-aging__fill pd-dash-aging__seg--${bucket.key}`}
                  style={{ height: `${height}%` }}
                />
              </span>
              <span className="pd-dash-aging__label">{bucket.label}</span>
              <span className="pd-dash-aging__count">
                {bucket.count} file{bucket.count === 1 ? '' : 's'}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
