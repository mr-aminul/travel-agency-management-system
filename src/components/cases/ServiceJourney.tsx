import { useMemo, type ReactNode } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  buildServiceJourney,
  type JourneyStepDefInput,
  type JourneyStepState,
  type JourneyStepView,
} from '@/lib/serviceJourney'
import type { Case } from '@/types/case'

export type ServiceJourneyProps = {
  item: Case
  interactive?: boolean
  /** When set (public track), use these labels instead of local templates. */
  stepDefs?: JourneyStepDefInput[]
  /** Hide steps after the current one (staff pipeline). */
  hideUpcoming?: boolean
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
  const className = cn(
    'grid w-full grid-cols-[1.75rem_minmax(0,1fr)] gap-[0.85rem] border-0 bg-transparent p-0 text-left font-inherit text-inherit',
    onActivate &&
      'cursor-pointer rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color-mix(in_srgb,var(--color-theme)_55%,transparent)] [&:hover_[data-journey-title]]:text-[var(--color-theme-ink)]',
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
          : 'View or move back to this step'
      }
      onClick={() => onActivate(step.id, step.state)}
    >
      {children}
    </button>
  )
}

function stepConnectorClass(state: JourneyStepState): string {
  if (state === 'done' || state === 'current') {
    return 'bg-[color-mix(in_srgb,var(--color-theme)_55%,var(--color-border))]'
  }
  return 'bg-border'
}

function stepMarkerClass(state: JourneyStepState): string {
  if (state === 'done') {
    return 'border-[var(--color-theme-ink)] bg-[var(--color-theme)] text-[var(--color-on-theme)]'
  }
  if (state === 'current') {
    return 'border-[var(--color-theme-ink)] text-[var(--color-theme-ink)] shadow-[0_0_0_4px_color-mix(in_srgb,var(--color-theme)_16%,transparent)] motion-reduce:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-theme)_16%,transparent)]'
  }
  return 'border-border bg-[var(--color-surface-raised,var(--color-bg))] text-muted-foreground'
}

export function ServiceJourney({
  item,
  interactive = false,
  stepDefs,
  hideUpcoming,
  progressAriaLabel = 'Application progress',
  onStepActivate,
}: ServiceJourneyProps) {
  const journey = useMemo(
    () => buildServiceJourney(item, { interactive, stepDefs, hideUpcoming }),
    [item, interactive, stepDefs, hideUpcoming],
  )

  return (
    <div className="flex flex-col gap-[1.15rem]">
      <div className="flex flex-col gap-[0.55rem]">
        <p className="m-0 text-[0.8125rem] font-bold text-foreground">
          {journey.stageLabel}
        </p>
        <div
          className="h-[0.45rem] overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--color-theme)_12%,var(--color-border))]"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(journey.progressPercent)}
          aria-label={progressAriaLabel}
        >
          <span
            className="block h-full rounded-[inherit] bg-[var(--color-theme)]"
            style={{ width: `${journey.progressPercent}%` }}
          />
        </div>
      </div>

      <ol className="m-0 list-none p-0" aria-label="Service journey">
        {journey.steps.map((step, index) => {
          const clickable =
            interactive && step.state !== 'upcoming' ? onStepActivate : undefined
          const isLast = index === journey.steps.length - 1

          return (
            <li
              key={step.id}
              className={cn(
                'relative',
                !isLast && 'pb-4',
                step.state === 'upcoming' && 'opacity-[0.62]',
              )}
            >
              {!isLast ? (
                <span
                  aria-hidden
                  className={cn(
                    'absolute top-[1.85rem] bottom-[0.15rem] left-[0.8rem] w-0.5',
                    stepConnectorClass(step.state),
                  )}
                />
              ) : null}
              <JourneyRow step={step} onActivate={clickable}>
                <span
                  className={cn(
                    'relative z-[1] inline-flex size-7 items-center justify-center rounded-full border-2 text-[0.7rem] font-extrabold leading-none',
                    stepMarkerClass(step.state),
                  )}
                  aria-hidden
                >
                  {step.state === 'done' ? (
                    <Check size={14} strokeWidth={3} />
                  ) : (
                    step.number
                  )}
                </span>
                <span className="flex min-w-0 flex-col gap-[0.2rem] pt-[0.15rem]">
                  <span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <span
                      data-journey-title
                      className="font-heading text-[0.95rem] font-extrabold tracking-[-0.02em] text-foreground"
                    >
                      {step.label}
                    </span>
                    <time
                      className="whitespace-normal text-xs font-semibold text-muted-foreground sm:whitespace-nowrap"
                      dateTime={step.dateTime}
                    >
                      {step.dateLabel}
                    </time>
                  </span>
                  {step.note ? (
                    <span
                      className={cn(
                        'text-[0.8125rem] leading-snug text-muted-foreground',
                        step.state === 'current' && 'text-foreground',
                      )}
                    >
                      {step.note}
                    </span>
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
