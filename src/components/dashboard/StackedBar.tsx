import '@/styles/layout-bento.css'

export type SegmentTone =
  | 'brand'
  | 'brand-soft'
  | 'info'
  | 'success'
  | 'warning'
  | 'danger'
  | 'critical'
  | 'muted'

export type StackedSegment = {
  key: string
  label: string
  value: number
  /** Legend value; defaults to the raw number. */
  display?: string
  tone: SegmentTone
}

type StackedBarProps = {
  segments: StackedSegment[]
  label: string
}

export function StackedBar({ segments, label }: StackedBarProps) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0)
  return (
    <div className="pd-stacked">
      <div className="pd-stacked__bar" role="img" aria-label={label}>
        {segments
          .filter((segment) => segment.value > 0)
          .map((segment) => (
            <span
              key={segment.key}
              className={`pd-stacked__segment pd-tone--${segment.tone}`}
              style={{ flexGrow: segment.value }}
              title={`${segment.label}: ${segment.display ?? segment.value}`}
            />
          ))}
        {total === 0 ? <span className="pd-stacked__empty" /> : null}
      </div>
      <ul className="pd-stacked__legend">
        {segments.map((segment) => (
          <li key={segment.key} className="pd-stacked__item">
            <span className={`pd-stacked__swatch pd-tone--${segment.tone}`} />
            <span className="pd-stacked__label">{segment.label}</span>
            <span className="pd-stacked__value">
              {segment.display ?? segment.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
