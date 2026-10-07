import { useMemo, type ReactNode } from 'react'
import { Check } from 'lucide-react'
import { cx } from '@/lib/cx'
import {
  buildServiceJourney,
  type JourneyStepState,
  type JourneyStepView,
} from '@/lib/serviceJourney'
import type { Case } from '@/types/case'
import '@/styles/layout-journey.css'

export type ServiceJourneyProps = {
  item: Case
  interactive?: boolean
  progressAriaLabel?: string
  onStepActivate?: (stepId: string, state: JourneyStepState) => void
}

function JourneyRow({
  step,
  children,
  onActivate,
}: {
  step: JourneyStepView
  children: ReactNode
  onActivate?: (stepId: string, state: JourneyStepState) => void
}) {
  const className = cx(
    'pd-journey__row',
    onActivate && 'pd-journey__row--hit',
  )
  const current = step.state === 'current' ? ('step' as const) : undefined

  if (!onActivate) {
    return (
      <div className={className} aria-current={current}>
        {children}
      </div>
    )
  }

  return (
    <button
      type="button"
      className={className}
      aria-current={current}
      title={
        step.state === 'current'
          ? 'Enter details to complete'
          : 'View saved details'
      }
      onClick={() => onActivate(step.id, step.state)}
    >
      {children}
    </button>
  )
}

export function ServiceJourney({
  item,
  interactive = false,
  progressAriaLabel = 'Application progress',
  onStepActivate,
}: ServiceJourneyProps) {
  const journey = useMemo(
    () => buildServiceJourney(item, { interactive }),
    [item, interactive],
  )

  return (
    <div className="pd-journey">
      <div className="pd-journey__progress">
        <p className="pd-journey__progress-label">{journey.stageLabel}</p>
        <div
          className="pd-journey__bar"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(journey.progressPercent)}
          aria-label={progressAriaLabel}
        >
          <span style={{ width: `${journey.progressPercent}%` }} />
        </div>
      </div>

      <ol className="pd-journey__steps" aria-label="Service journey">
        {journey.steps.map((step) => {
          const clickable =
            interactive &&
            (step.state === 'current' || step.state === 'done')
              ? onStepActivate
              : undefined

          return (
            <li
              key={step.id}
              className={`pd-journey__step pd-journey__step--${step.state}`}
            >
              <JourneyRow step={step} onActivate={clickable}>
                <span className="pd-journey__marker" aria-hidden>
                  {step.state === 'done' ? (
                    <Check size={14} strokeWidth={3} />
                  ) : (
                    step.number
                  )}
                </span>
                <span className="pd-journey__body">
                  <span className="pd-journey__head">
                    <span className="pd-journey__title">{step.label}</span>
                    <time
                      className="pd-journey__date"
                      dateTime={step.dateTime}
                    >
                      {step.dateLabel}
                    </time>
                  </span>
                  {step.note ? (
                    <span className="pd-journey__note">{step.note}</span>
                  ) : null}
                </span>
              </JourneyRow>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
