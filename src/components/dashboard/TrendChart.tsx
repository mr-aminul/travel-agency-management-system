import { formatCompactBdt, type MonthBucket } from '@/lib/dashboardInsights'

type TrendChartProps = {
  buckets: MonthBucket[]
}

export function TrendChart({ buckets }: TrendChartProps) {
  const width = 560
  const height = 220
  const padX = 12
  const padTop = 28
  const padBottom = 28
  const chartH = height - padTop - padBottom
  const chartW = width - padX * 2
  const max = Math.max(...buckets.map((bucket) => bucket.amount), 1)
  const step = buckets.length > 1 ? chartW / (buckets.length - 1) : chartW

  const coords = buckets.map((bucket, index) => {
    const x = padX + index * step
    const y = padTop + chartH - (bucket.amount / max) * chartH
    return { x, y, bucket }
  })

  const line = coords
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ')
  const area = `${line} L ${coords[coords.length - 1]?.x ?? padX} ${
    padTop + chartH
  } L ${padX} ${padTop + chartH} Z`

  const latest = buckets[buckets.length - 1]
  const peak = buckets.reduce(
    (best, bucket) => (bucket.amount > best.amount ? bucket : best),
    buckets[0] ?? { key: '', label: '', amount: 0, change: null },
  )

  return (
    <div className="pd-dash-trend">
      <div className="pd-dash-trend__summary">
        <span className="pd-dash-trend__stat">
          <span className="pd-dash-trend__stat-label">This month</span>
          <span className="pd-dash-trend__stat-value">
            {latest ? formatCompactBdt(latest.amount) : '—'}
          </span>
        </span>
        <span className="pd-dash-trend__stat">
          <span className="pd-dash-trend__stat-label">Peak</span>
          <span className="pd-dash-trend__stat-value">
            {peak.amount ? `${peak.label} · ${formatCompactBdt(peak.amount)}` : '—'}
          </span>
        </span>
      </div>

      <svg
        className="pd-dash-trend__svg"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Collections trend by month"
      >
        {[0.25, 0.5, 0.75, 1].map((mark) => {
          const y = padTop + chartH - mark * chartH
          return (
            <g key={mark}>
              <line
                className="pd-dash-trend__grid"
                x1={padX}
                x2={width - padX}
                y1={y}
                y2={y}
              />
            </g>
          )
        })}
        <path className="pd-dash-trend__area" d={area} />
        <path className="pd-dash-trend__line" d={line} fill="none" />
        {coords.map(({ x, y, bucket }) => (
          <g key={bucket.key}>
            <circle
              className="pd-dash-trend__dot"
              cx={x}
              cy={y}
              r={bucket.amount === peak.amount && peak.amount > 0 ? 4.5 : 3.25}
            >
              <title>
                {bucket.label}: {formatCompactBdt(bucket.amount)}
              </title>
            </circle>
            <text
              className="pd-dash-trend__label"
              x={x}
              y={height - 8}
              textAnchor="middle"
            >
              {bucket.label}
            </text>
            {bucket.amount > 0 ? (
              <text
                className="pd-dash-trend__amount"
                x={x}
                y={y - 10}
                textAnchor="middle"
              >
                {formatCompactBdt(bucket.amount)}
              </text>
            ) : null}
          </g>
        ))}
      </svg>
    </div>
  )
}
