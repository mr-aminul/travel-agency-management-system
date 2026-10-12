import { formatBdt, formatCompactBdt, type MonthBucket } from '@/lib/dashboardInsights'

type Point = { x: number; y: number }

type TrendChartProps = {
  buckets: MonthBucket[]
}

/** Straight between months, with the corner eased so the turn is not a kink. */
function roundedLine(points: Point[], radius: number): string {
  const start = points[0]
  if (!start) return ''
  if (points.length < 3) {
    return points
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
      .join(' ')
  }

  const commands = [`M ${start.x} ${start.y}`]
  for (let index = 1; index < points.length - 1; index += 1) {
    const previous = points[index - 1]
    const current = points[index]
    const next = points[index + 1]
    if (!previous || !current || !next) continue
    const intoX = current.x - previous.x
    const intoY = current.y - previous.y
    const outX = next.x - current.x
    const outY = next.y - current.y
    const intoLength = Math.hypot(intoX, intoY)
    const outLength = Math.hypot(outX, outY)
    if (intoLength === 0 || outLength === 0) {
      commands.push(`L ${current.x} ${current.y}`)
      continue
    }
    const cut = Math.min(radius, intoLength / 2, outLength / 2)
    const enterX = current.x - (intoX / intoLength) * cut
    const enterY = current.y - (intoY / intoLength) * cut
    const leaveX = current.x + (outX / outLength) * cut
    const leaveY = current.y + (outY / outLength) * cut
    commands.push(`L ${enterX} ${enterY}`)
    commands.push(`Q ${current.x} ${current.y} ${leaveX} ${leaveY}`)
  }
  const end = points[points.length - 1]
  if (end) commands.push(`L ${end.x} ${end.y}`)
  return commands.join(' ')
}

export function TrendChart({ buckets }: TrendChartProps) {
  const width = 640
  const height = 200
  const padX = 16
  const padTop = 26
  const padBottom = 28
  const chartWidth = width - padX * 2
  const chartHeight = height - padTop - padBottom
  const max = Math.max(...buckets.map((bucket) => bucket.amount), 1)
  const step = buckets.length > 1 ? chartWidth / (buckets.length - 1) : 0
  const baseline = padTop + chartHeight

  const coords = buckets.map((bucket, index) => {
    const x = padX + index * step
    const y = baseline - (bucket.amount / max) * chartHeight
    return { x, y, bucket, index }
  })

  const line = roundedLine(coords, step * 0.36)
  const last = coords[coords.length - 1]

  return (
    <svg
      className="pd-dash-trend__svg"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Collections trend by month"
    >
      <line
        className="pd-dash-trend__baseline"
        x1={padX}
        x2={width - padX}
        y1={baseline}
        y2={baseline}
      />
      <path className="pd-dash-trend__line" d={line} fill="none" />
      {coords.map(({ x, y, bucket }) => (
        <circle key={bucket.key} cx={x} cy={y} r={14} fill="transparent">
          <title>
            {bucket.label}: {formatBdt(bucket.amount)}
          </title>
        </circle>
      ))}
      {last ? (
        <g>
          <circle className="pd-dash-trend__halo" cx={last.x} cy={last.y} r={5} />
          <circle
            className="pd-dash-trend__dot is-current"
            cx={last.x}
            cy={last.y}
            r={3}
          />
          <text
            className="pd-dash-trend__now"
            x={last.x}
            y={last.y - 12}
            textAnchor={last.x > width - 56 ? 'end' : 'middle'}
          >
            {formatCompactBdt(last.bucket.amount)}
          </text>
        </g>
      ) : null}
      {coords.map(({ x, bucket, index }) => {
        const isCurrent = index === coords.length - 1
        return (
          <text
            key={bucket.key}
            className={
              isCurrent ? 'pd-dash-trend__label is-current' : 'pd-dash-trend__label'
            }
            x={x}
            y={height - 8}
            textAnchor="middle"
          >
            {bucket.label}
          </text>
        )
      })}
    </svg>
  )
}
