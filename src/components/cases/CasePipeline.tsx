import { useEffect, useState } from 'react'
import { Check, Circle, Lock } from 'lucide-react'
import {
  StepCompletionDrawer,
  type StepDrawerMode,
} from '@/components/cases/StepCompletionDrawer'
import { cx } from '@/lib/cx'
import {
  getPipelineStagesForService,
  getStepDefsForCase,
  getStepIndex,
  getStepsForStage,
  isPipelineStageComplete,
  isPipelineStageCurrent,
  isPipelineStepComplete,
  templateCountry,
} from '@/lib/caseChecklist'
import type { Case, CaseStage } from '@/types/case'

function formatMilestoneDate(value?: string | null): string {
  if (!value) return '—'
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function milestoneDate(item: Case, stepId: string): string | null {
  const record = item.steps[stepId]
  if (record?.completedAt) return record.completedAt
  if (item.status === 'Completed' && isPipelineStepComplete(item, stepId)) {
    return item.updatedAt
  }
  return null
}

function milestoneSummary(item: Case, stepId: string): string | null {
  const record = item.steps[stepId]
  if (!record) return null
  const file = record.uploads?.find((upload) => upload.fileName)?.fileName
  if (file) return file
  if (record.detail && record.detail !== 'In progress') return record.detail
  return null
}

export type CasePipelineProps = {
  item: Case
}

export function CasePipeline({ item }: CasePipelineProps) {
  const country = templateCountry(item)
  const stages = getPipelineStagesForService(item.service, country)
  const steps = getStepDefsForCase(item)
  const currentIndex = getStepIndex(item.service, item.currentStepId, country)
  const canEdit =
    item.status !== 'Completed' && item.status !== 'Cancelled'
  const [selectedStage, setSelectedStage] = useState<CaseStage | null>(null)
  const [activeStepId, setActiveStepId] = useState<string | null>(null)
  const [drawerMode, setDrawerMode] = useState<StepDrawerMode>('complete')

  useEffect(() => {
    setSelectedStage(null)
    setActiveStepId(null)
  }, [item.id])

  const visibleSteps = selectedStage
    ? getStepsForStage(item.service, selectedStage, country)
    : steps

  const openStep = (stepId: string, mode: StepDrawerMode) => {
    setActiveStepId(stepId)
    setDrawerMode(mode)
  }

  return (
    <section className="pd-pipeline" aria-label="Case stage pipeline">
      <h2 className="pd-pipeline__title">Case Stage Pipeline</h2>
      <p className="pd-pipeline__hint">
        {canEdit
          ? 'Complete the current milestone, or open a finished one to view what was saved.'
          : 'Open any milestone to review what was saved.'}
      </p>

      <ol className="pd-pipeline__stages" aria-label="Case stages">
        {stages.map((stage, index) => {
          const complete = isPipelineStageComplete(item, stage)
          const current = isPipelineStageCurrent(item, stage)
          const selected = selectedStage === stage
          const previousComplete =
            index === 0 || isPipelineStageComplete(item, stages[index - 1])

          return (
            <li
              key={stage}
              className={cx(
                'pd-pipeline__stage',
                complete && 'is-complete',
                current && 'is-current',
                selected && 'is-selected',
              )}
            >
              {index > 0 ? (
                <span
                  className={cx(
                    'pd-pipeline__connector',
                    previousComplete && complete && 'is-done',
                  )}
                  aria-hidden
                />
              ) : null}
              <button
                type="button"
                className="pd-pipeline__stage-btn"
                aria-pressed={selected}
                aria-current={current ? 'step' : undefined}
                onClick={() =>
                  setSelectedStage((currentSelected) =>
                    currentSelected === stage ? null : stage,
                  )
                }
              >
                <span className="pd-pipeline__stage-marker" aria-hidden>
                  {complete ? (
                    <Check size={14} strokeWidth={2.5} />
                  ) : (
                    <span className="pd-pipeline__stage-empty" />
                  )}
                </span>
                <span className="pd-pipeline__stage-label">{stage}</span>
              </button>
            </li>
          )
        })}
      </ol>

      <div className="pd-pipeline__milestones-block">
        <h3 className="pd-pipeline__milestones-heading">
          {selectedStage ? `${selectedStage} milestones` : 'Milestones'}
        </h3>
        <ul className="pd-pipeline__milestones" aria-label="Case milestones">
          {visibleSteps.map((step) => {
            const complete = isPipelineStepComplete(item, step.id)
            const stepIndex = getStepIndex(item.service, step.id, country)
            const current = item.currentStepId === step.id && !complete
            const locked = canEdit && stepIndex > currentIndex
            const dateValue = milestoneDate(item, step.id)
            const summary = milestoneSummary(item, step.id)
            const interactive = current || complete

            return (
              <li key={step.id}>
                <button
                  type="button"
                  className={cx(
                    'pd-pipeline__milestone',
                    complete && 'is-complete',
                    current && 'is-current',
                    locked && 'is-locked',
                  )}
                  aria-current={current ? 'step' : undefined}
                  disabled={!interactive}
                  title={
                    locked
                      ? 'Finish earlier milestones first'
                      : complete
                        ? 'View saved details'
                        : 'Enter details to complete'
                  }
                  onClick={() => {
                    if (current) openStep(step.id, 'complete')
                    else if (complete) openStep(step.id, 'view')
                  }}
                >
                  <span className="pd-pipeline__milestone-icon" aria-hidden>
                    {complete ? (
                      <span className="pd-pipeline__check">
                        <Check size={12} strokeWidth={2.75} />
                      </span>
                    ) : locked ? (
                      <Lock size={16} strokeWidth={2} />
                    ) : (
                      <Circle size={18} strokeWidth={1.75} />
                    )}
                  </span>
                  <span className="pd-pipeline__milestone-label">
                    {step.label}
                    {current ? (
                      <span className="pd-pipeline__milestone-action">
                        Tap to complete
                      </span>
                    ) : complete ? (
                      <span className="pd-pipeline__milestone-action">
                        {summary ?? 'Tap to view'}
                      </span>
                    ) : null}
                  </span>
                  <time
                    className="pd-pipeline__milestone-date"
                    dateTime={dateValue ?? undefined}
                  >
                    {formatMilestoneDate(dateValue)}
                  </time>
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      <StepCompletionDrawer
        open={Boolean(activeStepId)}
        item={item}
        stepId={activeStepId}
        mode={drawerMode}
        onModeChange={setDrawerMode}
        onClose={() => setActiveStepId(null)}
      />
    </section>
  )
}
