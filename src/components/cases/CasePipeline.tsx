import { useEffect, useState } from 'react'
import { ServiceJourney } from '@/components/cases/ServiceJourney'
import { StepCompletionDrawer, type StepDrawerMode } from '@/components/cases/StepCompletionDrawer'
import {
  ensureCaseAlignedWithCatalog,
  getCaseById,
  useCases,
} from '@/lib/casesStore'
import type { Case } from '@/types/case'

export type CasePipelineProps = {
  item: Case
}

export function CasePipeline({ item }: CasePipelineProps) {
  useCases()
  const [activeStepId, setActiveStepId] = useState<string | null>(null)
  const [drawerMode, setDrawerMode] = useState<StepDrawerMode>('complete')

  useEffect(() => {
    setActiveStepId(null)
  }, [item.id])

  useEffect(() => {
    ensureCaseAlignedWithCatalog(item.id)
  }, [
    item.id,
    item.service,
    item.serviceCountry,
    item.destination,
    item.currentStepId,
  ])

  const live = getCaseById(item.id) ?? item

  return (
    <section className="pd-pipeline" aria-label="Pipeline">
      <h2 className="pd-pipeline__title">Pipeline</h2>
      <p className="pd-pipeline__hint">
        Completed steps show a tick. Open the current step to mark complete, or
        a finished step to move back if something was marked by mistake.
      </p>
      <ServiceJourney
        item={live}
        interactive
        hideUpcoming={false}
        progressAriaLabel="Pipeline progress"
        onStepActivate={(stepId, state) => {
          if (state === 'upcoming') return
          setActiveStepId(stepId)
          setDrawerMode(state === 'current' ? 'complete' : 'view')
        }}
      />
      <StepCompletionDrawer
        open={Boolean(activeStepId)}
        item={live}
        stepId={activeStepId}
        mode={drawerMode}
        onModeChange={setDrawerMode}
        onClose={() => setActiveStepId(null)}
      />
    </section>
  )
}
