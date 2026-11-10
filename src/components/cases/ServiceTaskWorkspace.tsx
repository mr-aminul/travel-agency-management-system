import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Check, ChevronRight, FileText, ListOrdered } from 'lucide-react'
import { DocumentWorkspace } from '@/components/cases/DocumentWorkspace'
import {
  StepCompletionDrawer,
  type StepDrawerMode,
} from '@/components/cases/StepCompletionDrawer'
import {
  floatingSheetClass,
  floatingSheetWideClass,
} from '@/components/clients/shadcnChrome'
import { Button } from '@/components/shadcn/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/shadcn/sheet'
import {
  ensureCaseAlignedWithCatalog,
  getCaseById,
  useCases,
} from '@/lib/casesStore'
import {
  documentHasFile,
  getCaseServicePapers,
} from '@/lib/clientDocuments'
import {
  buildServiceTaskTree,
  type ServiceTreeCondition,
  type ServiceTreeStage,
} from '@/lib/serviceTaskTree'
import {
  clientDeskBaseFromPath,
  deskServicePaperPath,
  deskWorkDetailPath,
  deskWorkIdentityFocusPath,
} from '@/lib/workPaths'
import { cn } from '@/lib/utils'
import type { Case } from '@/types/case'

function paperTone(locked: boolean, hasFile: boolean, required = true) {
  if (locked || !required) return 'idle' as const
  return hasFile ? ('done' as const) : ('need' as const)
}

function paperStatus(tone: 'done' | 'need' | 'idle') {
  if (tone === 'done') return ''
  if (tone === 'need') return 'Needed'
  return 'Later'
}

function ConditionRow({
  condition,
  onOpen,
}: {
  condition: ServiceTreeCondition
  onOpen: (condition: ServiceTreeCondition) => void
}) {
  return (
    <button
      type="button"
      disabled={condition.locked}
      className={cn(
        'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted/70',
        condition.locked && 'cursor-not-allowed opacity-60',
      )}
      onClick={() => onOpen(condition)}
    >
      <span
        className={cn(
          'inline-flex size-4 shrink-0 items-center justify-center rounded-full',
          condition.done && 'bg-emerald-500/15 text-emerald-700',
          !condition.done &&
          condition.required &&
          !condition.locked &&
          'bg-destructive/15 text-destructive',
          (!condition.required || condition.locked) &&
          !condition.done &&
          'bg-muted text-muted-foreground',
        )}
        aria-hidden
      >
        {condition.done ? (
          <Check size={12} strokeWidth={2.5} />
        ) : (
          <span className="size-1.5 rounded-full bg-current" />
        )}
      </span>
      <span
        className={cn(
          'min-w-0 flex-1 truncate',
          condition.done && 'text-muted-foreground line-through',
        )}
      >
        {condition.title}
      </span>
      {condition.statusLabel ? (
        <span
          className={cn(
            'shrink-0 text-xs text-muted-foreground',
            condition.statusLabel === 'Needed' && 'text-destructive',
          )}
          aria-hidden
        >
          {condition.statusLabel}
        </span>
      ) : null}
      <ChevronRight
        className="size-3.5 shrink-0 text-muted-foreground/50"
        aria-hidden
      />
    </button>
  )
}

function StageMeta({ stage }: { stage: ServiceTreeStage }) {
  if (stage.requiredOpen > 0) {
    return (
      <span className="text-[11px] text-destructive">
        {stage.requiredOpen} needed
      </span>
    )
  }
  if (stage.conditionsTotal > 0) {
    return (
      <span className="text-[11px] text-muted-foreground">
        {stage.conditionsDone}/{stage.conditionsTotal}
      </span>
    )
  }
  return null
}

export type ServiceTaskWorkspaceProps = {
  item: Case
  selectedDocId?: string | null
}

export function ServiceTaskWorkspace({
  item,
  selectedDocId = null,
}: ServiceTaskWorkspaceProps) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const deskBase = clientDeskBaseFromPath(pathname)
  useCases()
  const [activeStepId, setActiveStepId] = useState<string | null>(null)
  const [drawerMode, setDrawerMode] = useState<StepDrawerMode>('complete')
  const [expandedStageIds, setExpandedStageIds] = useState<Set<string>>(
    () => new Set(),
  )

  useEffect(() => {
    setActiveStepId(null)
    setExpandedStageIds(new Set())
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
  const tree = useMemo(() => buildServiceTaskTree(live), [live])
  const servicePapers = getCaseServicePapers(live)
  const selectedPaper = selectedDocId
    ? servicePapers.find((doc) => doc.id === selectedDocId) ?? null
    : null
  const canComplete =
    live.status !== 'Completed' &&
    live.status !== 'Cancelled' &&
    Boolean(live.currentStepId)

  const openCurrent = () => {
    if (!live.currentStepId) return
    setActiveStepId(live.currentStepId)
    setDrawerMode('complete')
  }

  const openPaper = (docId: string) => {
    navigate(
      deskServicePaperPath(deskBase, live.id, live.clientId, docId),
    )
  }

  const openCondition = (condition: {
    id: string
    isIdentity: boolean
    identityKind: 'passport' | 'nid' | null
    locked: boolean
  }) => {
    if (condition.locked) return
    if (condition.isIdentity && condition.identityKind) {
      navigate(deskWorkIdentityFocusPath(deskBase, live, condition.identityKind))
      return
    }
    openPaper(condition.id)
  }

  const closePaper = () => {
    navigate(deskWorkDetailPath(deskBase, live))
  }

  const toggleStage = (stageId: string) => {
    setExpandedStageIds((prev) => {
      const next = new Set(prev)
      if (next.has(stageId)) next.delete(stageId)
      else next.add(stageId)
      return next
    })
  }

  const stageExpanded = (stage: ServiceTreeStage) =>
    stage.state === 'current' || expandedStageIds.has(stage.id)

  return (
    <div className="border-t border-border">
      <div className="grid lg:grid-cols-2">
        <section
          aria-label="Documents"
          className="min-w-0 border-b border-border lg:border-b-0 lg:border-r"
        >
          <h3 className="m-0 flex items-center gap-2 border-b border-border px-4 py-2.5 text-sm font-semibold text-foreground">
            <FileText
              size={14}
              strokeWidth={2}
              className="shrink-0 text-muted-foreground"
              aria-hidden
            />
            Documents
          </h3>
          {servicePapers.length === 0 ? (
            <p className="m-0 px-4 py-4 text-sm text-muted-foreground">
              No papers on this service.
            </p>
          ) : (
            <ul className="m-0 flex list-none flex-col p-0">
              {servicePapers.map((doc) => {
                const active = selectedPaper?.id === doc.id
                const tone = paperTone(
                  doc.locked,
                  documentHasFile(doc),
                  doc.required === true,
                )
                return (
                  <li
                    key={doc.id}
                    className="border-b border-border last:border-b-0"
                  >
                    <button
                      type="button"
                      className={cn(
                        'flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-muted/70',
                        doc.locked && 'opacity-60',
                        active && 'bg-primary/10 font-medium',
                      )}
                      aria-current={active ? 'true' : undefined}
                      onClick={() =>
                        active ? closePaper() : openPaper(doc.id)
                      }
                    >
                      <span
                        className={cn(
                          'inline-flex size-4 shrink-0 items-center justify-center rounded-full',
                          tone === 'done' &&
                          'bg-emerald-500/15 text-emerald-700',
                          tone === 'need' &&
                          'bg-destructive/15 text-destructive',
                          tone === 'idle' && 'bg-muted text-muted-foreground',
                        )}
                        aria-hidden
                      >
                        {tone === 'done' ? (
                          <Check size={12} strokeWidth={2.5} />
                        ) : (
                          <span className="size-1.5 rounded-full bg-current" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{doc.name}</span>
                      {paperStatus(tone) ? (
                        <span
                          className={cn(
                            'shrink-0 text-xs text-muted-foreground',
                            tone === 'need' && 'text-destructive',
                          )}
                          aria-hidden
                        >
                          {paperStatus(tone)}
                        </span>
                      ) : null}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section aria-label="Steps" className="min-w-0">
          <h3 className="m-0 flex items-center gap-2 border-b border-border px-4 py-2.5 text-sm font-semibold text-foreground">
            <ListOrdered
              size={14}
              strokeWidth={2}
              className="shrink-0 text-muted-foreground"
              aria-hidden
            />
            Steps
          </h3>
          <ul className="m-0 flex list-none flex-col p-0">
            {tree.stages.map((stage, index) => {
              const isCurrent = stage.state === 'current'
              const isDone = stage.state === 'done'
              const expanded = stageExpanded(stage)
              const canToggle = !isCurrent && stage.conditions.length > 0

              return (
                <li
                  key={stage.id}
                  className="border-b border-border last:border-b-0"
                >
                  <div
                    className={cn(
                      'flex items-start gap-3 px-4 py-2.5',
                      isCurrent && 'bg-primary/5',
                    )}
                  >
                    <span
                      className={cn(
                        'mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full border text-[0.65rem] font-semibold',
                        isDone &&
                        'border-emerald-500/40 bg-emerald-500/15 text-emerald-700',
                        isCurrent &&
                        'border-primary bg-primary text-primary-foreground',
                        stage.state === 'upcoming' &&
                        'border-border bg-muted text-muted-foreground',
                      )}
                      aria-hidden
                    >
                      {isDone ? (
                        <Check size={12} strokeWidth={2.5} />
                      ) : (
                        index + 1
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {canToggle ? (
                          <button
                            type="button"
                            className={cn(
                              'm-0 text-left text-sm font-semibold text-foreground hover:underline',
                              isDone && 'text-muted-foreground',
                            )}
                            aria-expanded={expanded}
                            onClick={() => toggleStage(stage.id)}
                          >
                            {stage.label}
                          </button>
                        ) : (
                          <p
                            className={cn(
                              'm-0 text-sm font-semibold text-foreground',
                              isDone && 'text-muted-foreground',
                            )}
                          >
                            {stage.label}
                          </p>
                        )}
                        <span className="text-[11px] text-muted-foreground">
                          {stage.dateLabel}
                        </span>
                        <StageMeta stage={stage} />
                        {isCurrent && canComplete ? (
                          <button
                            type="button"
                            className="inline-flex h-6 items-center gap-1 rounded-full border border-border bg-background px-2 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            onClick={openCurrent}
                          >
                            <Check
                              className="size-3 text-emerald-700"
                              strokeWidth={2.5}
                              aria-hidden
                            />
                            Mark complete
                          </button>
                        ) : null}
                        {isDone ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 rounded-md px-2 text-xs text-muted-foreground"
                            onClick={() => {
                              setActiveStepId(stage.id)
                              setDrawerMode('view')
                            }}
                          >
                            View
                          </Button>
                        ) : null}
                      </div>
                      {expanded && stage.conditions.length > 0 ? (
                        <ul className="mt-1.5 flex list-none flex-col gap-0.5 border-l-2 border-border/70 pl-3">
                          {stage.conditions.map((condition) => (
                            <li key={condition.id}>
                              <ConditionRow
                                condition={condition}
                                onOpen={openCondition}
                              />
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      </div>

      <Sheet
        open={selectedPaper != null}
        onOpenChange={(open) => {
          if (!open) closePaper()
        }}
      >
        <SheetContent
          className={cn(
            floatingSheetClass,
            floatingSheetWideClass,
            'overflow-hidden',
          )}
        >
          <SheetHeader className="border-b border-border px-4 py-3 pr-12">
            <SheetTitle className="text-sm font-semibold">
              {selectedPaper?.name ?? 'Document'}
            </SheetTitle>
          </SheetHeader>
          {selectedPaper ? (
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-3">
              <DocumentWorkspace
                key={`${live.id}:${selectedPaper.id}`}
                document={selectedPaper}
                caseId={live.id}
                canEdit={
                  !selectedPaper.locked &&
                  selectedPaper.status !== 'approved'
                }
                locked={selectedPaper.locked}
                hint={selectedPaper.collectionHint}
                embedded
                hideHeader
                compact
              />
            </div>
          ) : null}
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
    </div>
  )
}
