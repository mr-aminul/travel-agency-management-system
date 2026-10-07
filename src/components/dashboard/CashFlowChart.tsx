import { useState, type CSSProperties } from 'react'
import { formatCompactBdt } from '@/lib/dashboardInsights'
import type { CashFlowMonth } from '@/lib/dashboardOperations'
import '@/styles/layout-bento.css'

type CashFlowChartProps = {
  months: CashFlowMonth[]
}

const COLUMN = 10
const BAR = 4.5
/** Leaves headroom above the tallest value inside the 0–100 plot height. */
const PLOT_CEILING = 88

function latestActiveIndex(months: CashFlowMonth[]): number {
  for (let index = months.length - 1; index >= 0; index -= 1) {
    const month = months[index]
    if (month && (month.booked > 0 || month.collected > 0)) return index
  }
  return months.length - 1
}

export function CashFlowChart({ months }: CashFlowChartProps) {
  const [activeIndex, setActiveIndex] = useState(() => latestActiveIndex(months))
  const max = Math.max(
    ...months.flatMap((month) => [month.booked, month.collected]),
    1,
  )
  const heightOf = (amount: number) => (amount / max) * PLOT_CEILING
  const width = months.length * COLUMN

  const points = months.map((month, index) => ({
    x: index * COLUMN + COLUMN / 2,
    y: 100 - heightOf(month.collected),
  }))
  const line = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ')
  const area = `${line} L ${points[points.length - 1]?.x ?? 0} 100 L ${points[0]?.x ?? 0} 100 Z`
  const active = months[activeIndex] ?? months[months.length - 1]

  return (
    <div className="pd-cashflow">
      <dl className="pd-cashflow__readout" aria-live="polite">
        <div>
          <dt>
            <span className="pd-cashflow__key pd-cashflow__key--collected" />
            Collected · {active?.label}
          </dt>
          <dd>{formatCompactBdt(active?.collected ?? 0)}</dd>
        </div>
        <div>
          <dt>
            <span className="pd-cashflow__key pd-cashflow__key--booked" />
            Booked · {active?.label}
          </dt>
          <dd>{formatCompactBdt(active?.booked ?? 0)}</dd>
        </div>
      </dl>

      <div className="pd-cashflow__plot">
        <svg
          className="pd-cashflow__svg"
          viewBox={`0 0 ${width} 100`}
          preserveAspectRatio="none"
          aria-hidden
        >
          <defs>
            <linearGradient id="pd-cashflow-area" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" className="pd-cashflow__area-top" />
              <stop offset="100%" className="pd-cashflow__area-bottom" />
            </linearGradient>
          </defs>
          {[25, 50, 75].map((y) => (
            <line
              key={y}
              className="pd-cashflow__grid"
              x1="0"
              x2={width}
              y1={y}
              y2={y}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {months.map((month, index) => (
            <rect
              key={month.key}
              className={
                index === activeIndex
                  ? 'pd-cashflow__bar pd-cashflow__bar--active'
                  : 'pd-cashflow__bar'
              }
              x={index * COLUMN + (COLUMN - BAR) / 2}
              y={100 - heightOf(month.booked)}
              width={BAR}
              height={heightOf(month.booked)}
              rx="1"
            />
          ))}
          <path className="pd-cashflow__area" d={area} />
          <path
            className="pd-cashflow__line"
            d={line}
            fill="none"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        <ol className="pd-cashflow__columns">
          {months.map((month, index) => (
            <li key={month.key}>
              <button
                type="button"
                className="pd-cashflow__column"
                aria-pressed={index === activeIndex}
                aria-label={`${month.label}: collected ${formatCompactBdt(month.collected)}, booked ${formatCompactBdt(month.booked)}`}
                onMouseEnter={() => setActiveIndex(index)}
                onFocus={() => setActiveIndex(index)}
                onClick={() => setActiveIndex(index)}
              >
                <span className="pd-cashflow__lane">
                  {index === activeIndex ? (
                    <span
                      className="pd-cashflow__dot"
                      style={
                        {
                          '--dot-bottom': `${heightOf(month.collected)}%`,
                        } as CSSProperties
                      }
                    />
                  ) : null}
                </span>
                <span className="pd-cashflow__month">{month.label}</span>
              </button>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
