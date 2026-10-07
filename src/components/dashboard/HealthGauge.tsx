import type { CSSProperties } from 'react'
import type { HealthVerdict } from '@/lib/businessHealth'
import '@/styles/layout-bento.css'

type HealthGaugeProps = {
  score: number
  verdict: HealthVerdict
}

const RADIUS = 80
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const ARC = CIRCUMFERENCE * 0.75

export function HealthGauge({ score, verdict }: HealthGaugeProps) {
  const filled = (ARC * Math.min(Math.max(score, 0), 100)) / 100
  return (
    <figure className={`pd-health-gauge pd-health-gauge--${verdict}`}>
      <svg
        viewBox="0 0 200 200"
        className="pd-health-gauge__svg"
        role="img"
        aria-label={`Business health ${score} out of 100`}
      >
        <circle
          className="pd-health-gauge__track"
          cx="100"
          cy="100"
          r={RADIUS}
          strokeDasharray={`${ARC} ${CIRCUMFERENCE}`}
        />
        <circle
          className="pd-health-gauge__value"
          cx="100"
          cy="100"
          r={RADIUS}
          strokeDasharray={`${filled} ${CIRCUMFERENCE}`}
          style={{ '--gauge-length': filled } as CSSProperties}
        />
      </svg>
      <figcaption className="pd-health-gauge__center">
        <span className="pd-health-gauge__score">{score}</span>
        <span className="pd-health-gauge__out-of">out of 100</span>
      </figcaption>
    </figure>
  )
}
