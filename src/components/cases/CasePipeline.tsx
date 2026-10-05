import { useEffect, useState } from 'react'
import { Check, Circle, Lock } from 'lucide-react'
import { StepCompletionDrawer, type StepDrawerMode } from '@/components/cases/StepCompletionDrawer'
import {
  getStepDefsForCase,
  getStepIndex,
  isPipelineStepComplete,
  templateCountry,
} from '@/lib/caseChecklist'
import { cx } from '@/lib/cx'
import { formatDisplayDate } from '@/lib/formatDate'
import type { Case } from '@/types/case'

function formatMilestoneDate(value?: string | null): string {
  return formatDisplayDate(value)
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
  const steps = getStepDefsForCase(item)
  const currentIndex = getStepIndex(item.service, item.currentStepId, country)
  const canEdit =
    item.status !== 'Completed' && item.status !== 'Cancelled'
  const [activeStepId, setActiveStepId] = useState<string | null>(null)
  const [drawerMode, setDrawerMode] = useState<StepDrawerMode>('complete')

  useEffect(() => {
    setActiveStepId(null)
  }, [item.id])

  const openStep = (stepId: string, mode: StepDrawerMode) => {
    setActiveStepId(stepId)
    setDrawerMode(mode)
  }

  return (
    <section className="pd-pipeline" aria-label="Pipeline">
      <h2 className="pd-pipeline__title">Pipeline</h2>

      <ol className="pd-pipeline__milestones" aria-label="Journey">
        {steps.map((step) => {
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
                    ? 'Finish earlier steps first'
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
                      <Check size={12} strokeWidth={3} />
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
      </ol>

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
