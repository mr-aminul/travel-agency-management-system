import { useRef, type CSSProperties } from 'react'
import { progressBetween, usePrefersReducedMotion, useScrollProgress } from './sceneHooks'

function easeInOut(value: number): number {
  return value < 0.5 ? 2 * value * value : 1 - (-2 * value + 2) ** 2 / 2
}

export function LightFlood() {
  const sceneRef = useRef<HTMLElement>(null)
  const isLive = !usePrefersReducedMotion()
  const progress = useScrollProgress(sceneRef, isLive)

  const rise = easeInOut(progressBetween(progress, 0, 0.55))
  const keyIn = progressBetween(progress, 0.32, 0.55)
  const style = isLive
    ? ({
        '--hold': 2.3,
        '--lf-sun-y': `${-8 - 54 * rise}%`,
        '--lf-sun-s': 0.35 + 1.15 * rise,
        '--lf-day-o': 1 - progressBetween(progress, 0.45, 0.6),
        '--lf-lead-k': progressBetween(progress, 0.28, 0.45),
        '--lf-key-o': 0.02 + 0.98 * keyIn,
        '--lf-key-blur': `${(1 - keyIn) * 12}px`,
        '--lf-night-y': `${100 - 100 * progressBetween(progress, 0.72, 0.95)}%`,
        '--lf-night-o': progressBetween(progress, 0.9, 1),
      } as CSSProperties)
    : undefined

  return (
    <section
      className={isLive ? 'scene lf is-live' : 'scene lf'}
      aria-labelledby="lf-title"
      ref={sceneRef}
      style={style}
      data-nav-dark={progress > 0.4 ? '' : undefined}
    >
      <div className="scene-stage">
        <div className="lf-ground" aria-hidden />
        <div className="lf-sun" aria-hidden>
          <div className="lf-halo" />
          <div className="lf-core" />
        </div>
        <div className="lf-night" aria-hidden>
          <div className="lf-night-fill" />
        </div>
        <div className="lf-ground lf-ground--night" aria-hidden />
        <div className="lf-grain" aria-hidden />
        <h2 className="lf-line" id="lf-title">
          <span className="lf-lead">Every client file,</span> <span className="lf-key">one board.</span>
        </h2>
      </div>
    </section>
  )
}
