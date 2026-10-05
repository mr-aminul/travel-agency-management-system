import type { NamedCount } from '@/lib/dashboardInsights'

type FunnelChartProps = {
  items: NamedCount[]
}

const TONE: Record<string, string> = {
  Pending: 'pending',
  'In-Progress': 'progress',
  'On-Hold': 'hold',
  Completed: 'done',
}

export function FunnelChart({ items }: FunnelChartProps) {
  const max = Math.max(...items.map((item) => item.count), 1)
  const total = items.reduce((sum, item) => sum + item.count, 0)

  return (
    <ul className="pd-dash-funnel">
      {items.map((item) => {
        const width = Math.max(18, Math.round((item.count / max) * 100))
        const share = total === 0 ? 0 : Math.round((item.count / total) * 100)
        const tone = TONE[item.key] ?? 'pending'
        return (
          <li key={item.key} className="pd-dash-funnel__row">
            <span className="pd-dash-funnel__label">{item.label}</span>
            <span className="pd-dash-funnel__track">
              <span
                className={`pd-dash-funnel__fill pd-dash-funnel__fill--${tone}`}
                style={{ width: `${width}%` }}
              />
            </span>
            <span className="pd-dash-funnel__meta">
              <strong>{item.count}</strong>
              <span>{share}%</span>
            </span>
          </li>
        )
      })}
    </ul>
  )
}
