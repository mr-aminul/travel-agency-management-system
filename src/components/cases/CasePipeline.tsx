import { useEffect, useMemo, useState } from 'react'
import { Check, ListTree } from 'lucide-react'
import { ServiceJourney } from '@/components/cases/ServiceJourney'
import {
  StepCompletionDrawer,
  type StepDrawerMode,
} from '@/components/cases/StepCompletionDrawer'
import { Badge } from '@/components/shadcn/badge'
import { Button } from '@/components/shadcn/button'
import { Card, CardContent } from '@/components/shadcn/card'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/shadcn/sheet'
import { floatingSheetClass } from '@/components/clients/shadcnChrome'
import { getCurrentStepLabel, getNextStepDef } from '@/lib/caseChecklist'
import {
  ensureCaseAlignedWithCatalog,
  getCaseById,
  useCases,
} from '@/lib/casesStore'
import { buildServiceJourney } from '@/lib/serviceJourney'
import { cn } from '@/lib/utils'
import type { Case } from '@/types/case'

export type CasePipelineAttention = {
  state: 'blocked' | 'on-hold'
  action: string
  onResolve: () => void
}

export type CasePipelineProps = {
  item: Case
  className?: string
  /** Sit inside the service file instead of drawing a second card. */
  embedded?: boolean
  /** One-line strip for the service header band. */
  compact?: boolean
  /** Compact resolve control when the service cannot advance. */
  attention?: CasePipelineAttention | null
}

export function CasePipeline({
  item,
  className,
  embedded = false,
  compact = false,
  attention = null,
}: CasePipelineProps) {
  useCases()
  const [activeStepId, setActiveStepId] = useState<string | null>(null)
  const [drawerMode, setDrawerMode] = useState<StepDrawerMode>('complete')
  const [journeyOpen, setJourneyOpen] = useState(false)

  useEffect(() => {
    setActiveStepId(null)
    setJourneyOpen(false)
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
  const journey = useMemo(
    () => buildServiceJourney(live, { interactive: true, hideUpcoming: false }),
    [live],
  )
  const currentLabel = getCurrentStepLabel(live)
  const nextStep = getNextStepDef(live)
  const canComplete =
    live.status !== 'Completed' &&
    live.status !== 'Cancelled' &&
    Boolean(live.currentStepId)
  const isFinished =
    live.status === 'Completed' || live.status === 'Cancelled'

  const openCurrent = () => {
    if (!live.currentStepId) return
    setActiveStepId(live.currentStepId)
    setDrawerMode('complete')
  }

  const actions = (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="outline"
        className="h-8 rounded-lg text-xs"
        onClick={() => setJourneyOpen(true)}
      >
        <ListTree data-icon="inline-start" />
        Journey
      </Button>
      {attention ? (
        <Button
          type="button"
          variant="outline"
          className={cn(
            'h-8 max-w-[16rem] rounded-lg text-xs',
            attention.state === 'blocked' &&
              'border-destructive/40 text-destructive hover:bg-destructive/5 hover:text-destructive',
            attention.state === 'on-hold' &&
              'border-[color-mix(in_srgb,var(--color-status-on-hold)_40%,var(--color-border))] text-[var(--color-status-on-hold)] hover:bg-[color-mix(in_srgb,var(--color-status-on-hold)_8%,var(--color-surface))]',
          )}
          title={attention.action}
          aria-label={
            attention.state === 'blocked'
              ? `Blocked: ${attention.action}`
              : `On Hold: ${attention.action}`
          }
          onClick={attention.onResolve}
        >
          <span className="truncate">
            {attention.state === 'blocked' ? 'Blocked' : 'On Hold'}
          </span>
        </Button>
      ) : null}
      {canComplete ? (
        <Button
          type="button"
          className="h-8 rounded-lg text-xs"
          onClick={openCurrent}
        >
          Complete
        </Button>
      ) : isFinished ? (
        <Badge variant="default" className="h-8 gap-1 rounded-lg px-2.5">
          <Check size={14} strokeWidth={2.5} aria-hidden />
          {live.status}
        </Badge>
      ) : null}
    </div>
  )

  const progress = (
    <div
      className={cn(
        'overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--color-theme)_12%,var(--color-border))]',
        compact ? 'h-1' : 'h-1.5',
      )}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(journey.progressPercent)}
      aria-label="Journey progress"
    >
      <span
        className="block h-full rounded-[inherit] bg-[var(--color-theme)]"
        style={{ width: `${journey.progressPercent}%` }}
      />
    </div>
  )

  const stepBody = compact ? (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <Badge variant="secondary" className="h-5 px-1.5 text-[0.625rem]">
            {journey.stageLabel}
          </Badge>
          <p className="m-0 text-sm font-semibold tracking-tight text-foreground">
            {currentLabel}
          </p>
          {nextStep && canComplete ? (
            <p className="m-0 text-xs text-muted-foreground">
              Next: {nextStep.label}
            </p>
          ) : null}
        </div>
        {actions}
      </div>
      {progress}
    </div>
  ) : (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="m-0 text-xs font-semibold tracking-wide text-muted-foreground">
              Now
            </p>
            <Badge variant="secondary" className="h-5 px-1.5 text-[0.625rem]">
              {journey.stageLabel}
            </Badge>
          </div>
          <p className="m-0 text-base font-semibold tracking-tight text-foreground">
            {currentLabel}
          </p>
          {nextStep && canComplete ? (
            <p className="m-0 text-xs text-muted-foreground">
              Next: {nextStep.label}
            </p>
          ) : null}
        </div>
        {actions}
      </div>
      {progress}
    </div>
  )

  return (
    <section
      aria-label="Current step"
      className={cn('min-w-0', className)}
    >
      {embedded ? (
        stepBody
      ) : (
        <Card className="gap-0 border border-border bg-card py-3 shadow-sm ring-0">
          <CardContent className="px-4">{stepBody}</CardContent>
        </Card>
      )}

      <Sheet open={journeyOpen} onOpenChange={setJourneyOpen}>
        <SheetContent className={floatingSheetClass}>
          <SheetHeader className="border-b border-border px-5 py-4 pr-12">
            <SheetTitle className="text-base font-semibold">
              Journey
            </SheetTitle>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <ServiceJourney
              item={live}
              interactive
              hideUpcoming={false}
              progressAriaLabel="Journey progress"
              onStepActivate={(stepId, state) => {
                if (state === 'upcoming') return
                setJourneyOpen(false)
                setActiveStepId(stepId)
                setDrawerMode(state === 'current' ? 'complete' : 'view')
              }}
            />
          </div>
        </SheetContent>
      </Sheet>

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
