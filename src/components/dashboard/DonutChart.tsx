import type { SegmentTone } from '@/components/dashboard/StackedBar'
import '@/styles/layout-bento.css'

export type DonutSlice = {
  key: string
  label: string
  value: number
  display: string
  tone: SegmentTone
}

type DonutChartProps = {
  slices: DonutSlice[]
  centerValue: string
  centerLabel: string
}

const RADIUS = 42
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
/** Visual gap between slices, in stroke units. */
const GAP = 1.6

export function DonutChart({ slices, centerValue, centerLabel }: DonutChartProps) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0)
  const visible = slices.filter((slice) => slice.value > 0)
  const gap = visible.length > 1 ? GAP : 0
  const arcs = visible.map((slice, index) => {
    const start = visible
      .slice(0, index)
      .reduce((sum, previous) => sum + (previous.value / total) * CIRCUMFERENCE, 0)
    const length = (slice.value / total) * CIRCUMFERENCE
    return { slice, start, dash: Math.max(length - gap, 0.5) }
  })

  return (
    <div className="pd-donut">
      <figure className="pd-donut__figure">
        <svg viewBox="0 0 100 100" className="pd-donut__svg" role="img" aria-label={centerLabel}>
          <circle className="pd-donut__track" cx="50" cy="50" r={RADIUS} />
          {arcs.map(({ slice, start, dash }) => (
            <circle
              key={slice.key}
              className={`pd-donut__slice pd-tone--${slice.tone}`}
              cx="50"
              cy="50"
              r={RADIUS}
              strokeDasharray={`${dash} ${CIRCUMFERENCE - dash}`}
              strokeDashoffset={-start}
            >
              <title>{`${slice.label}: ${slice.display}`}</title>
            </circle>
          ))}
        </svg>
        <figcaption className="pd-donut__center">
          <span className="pd-donut__value">{centerValue}</span>
          <span className="pd-donut__label">{centerLabel}</span>
        </figcaption>
      </figure>
      <ul className="pd-donut__legend">
        {slices.map((slice) => (
          <li key={slice.key} className="pd-donut__item">
            <span className={`pd-donut__swatch pd-tone--${slice.tone}`} />
            <span className="pd-donut__name">{slice.label}</span>
            <span className="pd-donut__share">
              {total === 0 ? '0%' : `${Math.round((slice.value / total) * 100)}%`}
            </span>
            <span className="pd-donut__amount">{slice.display}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
