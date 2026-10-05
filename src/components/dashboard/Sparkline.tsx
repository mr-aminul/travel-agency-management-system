type SparklineProps = {
  values: number[]
  tone?: 'up' | 'down' | 'flat'
  label?: string
}

export function Sparkline({
  values,
  tone = 'flat',
  label = 'Trend',
}: SparklineProps) {
  if (values.length < 2) return null

  const width = 72
  const height = 28
  const pad = 2
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const span = Math.max(max - min, 1)
  const step = (width - pad * 2) / (values.length - 1)

  const points = values.map((value, index) => {
    const x = pad + index * step
    const y = height - pad - ((value - min) / span) * (height - pad * 2)
    return `${x},${y}`
  })

  const area = `M ${pad},${height - pad} L ${points.join(' L ')} L ${
    width - pad
  },${height - pad} Z`

  return (
    <svg
      className={`pd-dash-spark pd-dash-spark--${tone}`}
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      role="img"
      aria-label={label}
    >
      <path className="pd-dash-spark__area" d={area} />
      <polyline
        className="pd-dash-spark__line"
        points={points.join(' ')}
        fill="none"
      />
    </svg>
  )
}
