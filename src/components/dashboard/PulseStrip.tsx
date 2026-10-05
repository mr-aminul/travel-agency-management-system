import type { PulseInsight } from '@/lib/dashboardInsights'

type PulseStripProps = {
  insights: PulseInsight[]
}

export function PulseStrip({ insights }: PulseStripProps) {
  if (insights.length === 0) return null

  return (
    <ul className="pd-dash-pulse" aria-label="Executive pulse">
      {insights.map((insight) => (
        <li
          key={insight.id}
          className={`pd-dash-pulse__card pd-dash-pulse__card--${insight.tone}`}
        >
          <span className="pd-dash-pulse__tone" aria-hidden />
          <span className="pd-dash-pulse__copy">
            <span className="pd-dash-pulse__title">{insight.title}</span>
            <span className="pd-dash-pulse__detail">{insight.detail}</span>
          </span>
        </li>
      ))}
    </ul>
  )
}
