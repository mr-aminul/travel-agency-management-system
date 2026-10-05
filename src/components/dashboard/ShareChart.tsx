import { useState, type MouseEvent } from 'react'
import { createPortal } from 'react-dom'
import {
  formatSharePercent,
  toShareSlices,
  type NamedCount,
  type ShareSlice,
} from '@/lib/dashboardInsights'

const SIZE = 168
const STROKE = 22
const RADIUS = (SIZE - STROKE) / 2
const CENTER = SIZE / 2
const INNER = RADIUS - STROKE / 2
const OUTER = RADIUS + STROKE / 2

type ShareChartProps = {
  items: NamedCount[]
  unitLabel?: string
}

type SliceTip = {
  slice: ShareSlice
  x: number
  y: number
}

function polar(radius: number, angle: number): [number, number] {
  const radians = ((angle - 90) * Math.PI) / 180
  return [
    CENTER + radius * Math.cos(radians),
    CENTER + radius * Math.sin(radians),
  ]
}

function donutPath(startAngle: number, endAngle: number): string {
  const span = Math.max(endAngle - startAngle, 0.01)
  const large = span > 180 ? 1 : 0
  const [outerStartX, outerStartY] = polar(OUTER, startAngle)
  const [outerEndX, outerEndY] = polar(OUTER, startAngle + span)
  const [innerEndX, innerEndY] = polar(INNER, startAngle + span)
  const [innerStartX, innerStartY] = polar(INNER, startAngle)
  return [
    `M ${outerStartX} ${outerStartY}`,
    `A ${OUTER} ${OUTER} 0 ${large} 1 ${outerEndX} ${outerEndY}`,
    `L ${innerEndX} ${innerEndY}`,
    `A ${INNER} ${INNER} 0 ${large} 0 ${innerStartX} ${innerStartY}`,
    'Z',
  ].join(' ')
}

export function ShareChart({ items, unitLabel = 'files' }: ShareChartProps) {
  const slices = toShareSlices(items)
  const top = slices[0]
  const [tip, setTip] = useState<SliceTip | null>(null)

  const moveTip = (event: MouseEvent<SVGPathElement>, slice: ShareSlice) => {
    setTip({ slice, x: event.clientX, y: event.clientY })
  }

  let startAngle = 0

  return (
    <div className="pd-dash-share">
      <div className="pd-dash-share__chart">
        <svg
          className="pd-dash-share__ring"
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          width={SIZE}
          height={SIZE}
          role="img"
          aria-label={
            top
              ? `Top share ${formatSharePercent(top.percent)} ${top.label}`
              : 'Service share'
          }
        >
          <circle
            className="pd-dash-share__track"
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            fill="none"
            strokeWidth={STROKE}
          />
          {slices.map((slice, index) => {
            const span = slice.percent * 360
            const path = donutPath(startAngle, startAngle + span)
            startAngle += span
            const label = `${slice.label} · ${slice.count} ${unitLabel} · ${formatSharePercent(slice.percent)}`
            return (
              <path
                key={slice.key}
                className={`pd-dash-share__seg pd-dash-share__seg--${index % 5}`}
                d={path}
                tabIndex={0}
                aria-label={label}
                onMouseEnter={(event) => moveTip(event, slice)}
                onMouseMove={(event) => moveTip(event, slice)}
                onMouseLeave={() => setTip(null)}
                onFocus={(event) => {
                  const rect = event.currentTarget.getBoundingClientRect()
                  setTip({
                    slice,
                    x: rect.left + rect.width / 2,
                    y: rect.top,
                  })
                }}
                onBlur={() => setTip(null)}
              />
            )
          })}
        </svg>
        {top ? (
          <div className="pd-dash-share__center">
            <span className="pd-dash-share__eyebrow">Top share</span>
            <span className="pd-dash-share__pct">
              {formatSharePercent(top.percent)}
            </span>
            <span className="pd-dash-share__top">{top.label}</span>
          </div>
        ) : null}
      </div>

      <ul className="pd-dash-share__legend">
        {slices.map((slice, index) => (
          <li key={slice.key} className="pd-dash-share__row">
            <span
              className={`pd-dash-share__dot pd-dash-share__seg pd-dash-share__seg--${index % 5}`}
              aria-hidden
            />
            <span className="pd-dash-share__name">{slice.label}</span>
            <span className="pd-dash-share__count">
              {slice.count} {unitLabel}
            </span>
            <span className="pd-dash-share__value">
              {formatSharePercent(slice.percent)}
            </span>
          </li>
        ))}
      </ul>

      {tip && typeof document !== 'undefined'
        ? createPortal(
            <span
              role="tooltip"
              className="pd-tooltip__content pd-tooltip__content--top"
              style={{
                position: 'fixed',
                top: tip.y - 8,
                left: tip.x,
                transform: 'translate(-50%, -100%)',
              }}
            >
              {tip.slice.label}
              {' · '}
              {tip.slice.count} {unitLabel}
              {' · '}
              {formatSharePercent(tip.slice.percent)}
            </span>,
            document.body,
          )
        : null}
    </div>
  )
}
