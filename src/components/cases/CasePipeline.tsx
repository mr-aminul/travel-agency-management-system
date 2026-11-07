import { Route } from 'lucide-react'
import { useEffect, useState } from 'react'
import { ServiceJourney } from '@/components/cases/ServiceJourney'
import { StepCompletionDrawer, type StepDrawerMode } from '@/components/cases/StepCompletionDrawer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shadcn/card'
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
    <section aria-label="Pipeline">
      <Card className="gap-4 border border-border bg-[var(--color-surface-raised,var(--color-bg))] py-5 shadow-[var(--shadow-low)] ring-0">
        <CardHeader className="flex flex-row items-center gap-2 space-y-0 px-5 pb-0">
          <span
            className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-[var(--color-theme-subtle)] text-[var(--color-theme-ink)]"
            aria-hidden
          >
            <Route size={16} strokeWidth={2.25} />
          </span>
          <CardTitle className="font-heading text-lg font-extrabold tracking-tight">
            Pipeline
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 px-5">
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
