import { useEffect, useState } from 'react'
import { ServiceJourney } from '@/components/cases/ServiceJourney'
import { StepCompletionDrawer, type StepDrawerMode } from '@/components/cases/StepCompletionDrawer'
import { Card, CardContent } from '@/components/shadcn/card'
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
    <section aria-label="Pipeline" className="flex h-full min-h-0 flex-col">
      <Card className="flex h-full min-h-[22rem] flex-col gap-3 border border-border bg-card py-4 shadow-sm ring-0">
        <CardContent className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4">
          <p className="m-0 text-sm font-semibold text-foreground">Pipeline</p>
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
        </CardContent>
      </Card>
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
