import { useEffect, useState } from 'react'
import { ServiceJourney } from '@/components/cases/ServiceJourney'
import { StepCompletionDrawer, type StepDrawerMode } from '@/components/cases/StepCompletionDrawer'
import type { Case } from '@/types/case'

export type CasePipelineProps = {
  item: Case
}

export function CasePipeline({ item }: CasePipelineProps) {
  const [activeStepId, setActiveStepId] = useState<string | null>(null)
  const [drawerMode, setDrawerMode] = useState<StepDrawerMode>('complete')

  useEffect(() => {
    setActiveStepId(null)
  }, [item.id])

  return (
    <section className="pd-pipeline" aria-label="Pipeline">
      <h2 className="pd-pipeline__title">Pipeline</h2>
      <ServiceJourney
        item={item}
        interactive
        progressAriaLabel="Pipeline progress"
        onStepActivate={(stepId, state) => {
          setActiveStepId(stepId)
          setDrawerMode(state === 'current' ? 'complete' : 'view')
        }}
      />
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
