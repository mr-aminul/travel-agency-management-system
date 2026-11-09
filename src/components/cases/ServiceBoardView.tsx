import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type ReactNode,
} from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { LayoutGrid, ListFilter, MapPin, PackageOpen } from 'lucide-react'
import { StepCompletionDrawer } from '@/components/cases/StepCompletionDrawer'
import { Badge } from '@/components/shadcn/badge'
import { Button } from '@/components/shadcn/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/shadcn/card'
import { Checkbox } from '@/components/shadcn/checkbox'
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/shadcn/empty'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/shadcn/popover'
import { Tabs, TabsList, TabsTrigger } from '@/components/shadcn/tabs'
import {
  elevatedPageClass,
  whiteControlClass,
} from '@/components/clients/shadcnChrome'
import { cn } from '@/lib/utils'
import { getNextStepDef, getStepDefs } from '@/lib/caseChecklist'
import {
  buildServiceBoard,
  type ServiceBoard,
  type ServiceBoardItem,
  type ServiceBoardState,
} from '@/lib/clientServiceBoard'
import { getCaseById, useCases } from '@/lib/casesStore'
import {
  resolveServiceFromSlug,
  useEnabledServiceOptions,
} from '@/lib/serviceCatalog'
import { serviceToSlug, type ServiceType } from '@/types/case'
import '@/styles/layout-clients.css'

const BOARD_DRAG_MIME = 'application/x-onetrack-service-board-case'

type BoardDragPayload = {
  caseId: string
  fromStepId: string
  nextStepId: string
}

const STATE_BADGE: Record<
  Exclude<ServiceBoardState, 'actionable'>,
  { label: string; variant: 'destructive' | 'secondary' }
> = {
  blocked: { label: 'Blocked', variant: 'destructive' },
  'on-hold': { label: 'On Hold', variant: 'secondary' },
}

function ServiceFilterChoices({
  options,
  selected,
  onChange,
}: {
  options: { value: string; label: string }[]
  selected: string[]
  onChange: (next: string[]) => void
}) {
  const allSelected =
    options.length > 0 &&
    options.every((option) => selected.includes(option.value))

  function toggle(value: string) {
    onChange(
      selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value],
    )
  }

  return (
    <>
      <div className="px-2.5 py-1.5 text-xs font-medium text-muted-foreground">
        Filter Service
      </div>
      <div className="h-px bg-border" />
      <div
        role="button"
        tabIndex={0}
        className="flex w-full cursor-pointer items-center gap-2 px-2.5 py-1.5 text-left text-sm hover:bg-muted"
        onClick={() =>
          onChange(allSelected ? [] : options.map((option) => option.value))
        }
        onKeyDown={(event) => {
          if (event.key !== 'Enter' && event.key !== ' ') return
          event.preventDefault()
          onChange(allSelected ? [] : options.map((option) => option.value))
        }}
      >
        <Checkbox
          checked={allSelected}
          tabIndex={-1}
          aria-hidden
          className="pointer-events-none"
        />
        <span>{allSelected ? 'Deselect All' : 'Select All'}</span>
      </div>
      <div className="h-px bg-border" />
      <div
        className="max-h-56 overflow-y-auto py-1"
        role="listbox"
        aria-label="Service values"
        aria-multiselectable
      >
        {options.map((option) => {
          const isSelected = selected.includes(option.value)
          return (
            <div
              key={option.value}
              role="option"
              tabIndex={0}
              aria-selected={isSelected}
              className="flex w-full cursor-pointer items-center gap-2 px-2.5 py-1.5 text-left text-sm hover:bg-muted"
              onClick={() => toggle(option.value)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return
                event.preventDefault()
                toggle(option.value)
              }}
            >
              <Checkbox
                checked={isSelected}
                tabIndex={-1}
                aria-hidden
                className="pointer-events-none"
              />
              <span className="min-w-0 truncate">{option.label}</span>
            </div>
          )
        })}
      </div>
    </>
  )
}

type BoardColumn = {
  id: string
  label: string
  number: number
  items: ServiceBoardItem[]
}

function waitLabel(days: number): string {
  if (days <= 0) return 'Today'
  if (days === 1) return '1 day'
  return `${days} days`
}

function buildBoardColumns(
  service: ServiceType,
  board: ServiceBoard,
): BoardColumn[] {
  const defs = getStepDefs(service)
  const byStep = new Map(
    board.columns.map((column) => [column.stepId, column.items] as const),
  )
  const seen = new Set<string>()

  const columns: BoardColumn[] = defs.map((def, index) => {
    seen.add(def.id)
    return {
      id: def.id,
      label: def.label,
      number: index + 1,
      items: byStep.get(def.id) ?? [],
    }
  })

  for (const column of board.columns) {
    if (seen.has(column.stepId)) continue
    columns.push({
      id: column.stepId,
      label: column.label,
      number: columns.length + 1,
      items: column.items,
    })
  }

  return columns
}

function readBoardDrag(event: DragEvent): BoardDragPayload | null {
  const raw =
    event.dataTransfer.getData(BOARD_DRAG_MIME) ||
    event.dataTransfer.getData('text/plain')
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as BoardDragPayload
    if (!parsed.caseId || !parsed.fromStepId || !parsed.nextStepId) return null
    return parsed
  } catch {
    return null
  }
}

function BoardCard({
  item,
  canDrag,
  isDragging,
  onOpen,
  onDragStart,
  onDragEnd,
}: {
  item: ServiceBoardItem
  canDrag: boolean
  isDragging: boolean
  onOpen: () => void
  onDragStart: (event: DragEvent<HTMLButtonElement>) => void
  onDragEnd: () => void
}) {
  const badge = item.state === 'actionable' ? null : STATE_BADGE[item.state]
  const isStale = item.daysWaiting >= 7
  const place = item.destination !== '-' ? item.destination : null
  const detail =
    item.state === 'blocked' || item.state === 'on-hold' ? item.action : null
  const suppressClickRef = useRef(false)

  return (
    <button
      type="button"
      draggable={canDrag}
      title={
        canDrag
          ? item.nextStepLabel
            ? `Drag to “${item.nextStepLabel}” to advance`
            : 'Drag to the next stage to advance'
          : undefined
      }
      className={cn(
        'flex w-full flex-col gap-1.5 rounded-lg border bg-card p-3 text-left shadow-xs transition',
        'hover:border-primary/35 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        item.state === 'blocked' && 'border-destructive/40 bg-destructive/[0.03]',
        item.state === 'on-hold' && 'border-border/80 bg-muted/40',
        item.state === 'actionable' && 'border-border',
        isStale && item.state === 'actionable' && 'border-amber-500/35',
        canDrag && 'cursor-grab active:cursor-grabbing',
        isDragging && 'opacity-45 ring-2 ring-primary/40',
      )}
      onClick={() => {
        if (suppressClickRef.current) {
          suppressClickRef.current = false
          return
        }
        onOpen()
      }}
      onDragStart={(event) => {
        suppressClickRef.current = true
        onDragStart(event)
      }}
      onDragEnd={() => {
        onDragEnd()
        window.setTimeout(() => {
          suppressClickRef.current = false
        }, 0)
      }}
    >
      <span className="flex items-start justify-between gap-2">
        <span className="min-w-0 text-sm font-semibold leading-snug text-foreground">
          {item.clientName}
        </span>
        {badge ? (
          <Badge variant={badge.variant} className="shrink-0">
            {badge.label}
          </Badge>
        ) : (
          <span
            className={cn(
              'shrink-0 text-xs tabular-nums text-muted-foreground',
              isStale && 'font-medium text-amber-700 dark:text-amber-400',
            )}
          >
            {waitLabel(item.daysWaiting)}
          </span>
        )}
      </span>

      <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        {place ? (
          <span className="inline-flex min-w-0 items-center gap-1">
            <MapPin size={12} strokeWidth={2} aria-hidden />
            <span className="truncate">{place}</span>
          </span>
        ) : null}
        {badge ? (
          <span
            className={cn(
              'tabular-nums',
              isStale && 'font-medium text-amber-700 dark:text-amber-400',
            )}
          >
            {waitLabel(item.daysWaiting)}
          </span>
        ) : null}
      </span>

      {detail ? (
        <span className="line-clamp-2 text-xs leading-snug text-muted-foreground">
          {detail}
        </span>
      ) : null}
    </button>
  )
}

export type ServiceBoardViewProps = {
  /** List / Board control from the Services page shell. */
  viewToggle?: ReactNode
}

export function ServiceBoardView({ viewToggle }: ServiceBoardViewProps) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const cases = useCases()
  const enabledServices = useEnabledServiceOptions()
  const enabledKeys = useMemo(
    () => new Set(enabledServices.map((option) => option.value)),
    [enabledServices],
  )
  const urlService = resolveServiceFromSlug(searchParams.get('service') ?? '')

  const [serviceFilters, setServiceFilters] = useState<string[]>(() =>
    urlService ? [urlService] : [],
  )
  /** `all` shows every board; otherwise focus one service. */
  const [focusService, setFocusService] = useState<string>(
    () => urlService ?? 'all',
  )
  /** Case opened via board drag. Complete current step to advance. */
  const [advanceCaseId, setAdvanceCaseId] = useState<string | null>(null)
  const [dragState, setDragState] = useState<{
    caseId: string
    nextStepId: string
  } | null>(null)
  const dragRef = useRef<{ caseId: string; nextStepId: string } | null>(null)
  const [dropTargetStepId, setDropTargetStepId] = useState<string | null>(null)

  const scopedCases = useMemo(
    () => cases.filter((item) => enabledKeys.has(item.service)),
    [cases, enabledKeys],
  )

  useEffect(() => {
    setServiceFilters(urlService ? [urlService] : [])
    setFocusService(urlService ?? 'all')
  }, [urlService])

  const writeServiceQuery = (service?: ServiceType) => {
    const next = new URLSearchParams(searchParams)
    next.set('view', 'board')
    if (service) next.set('service', serviceToSlug(service))
    else next.delete('service')
    setSearchParams(next, { replace: true })
  }

  const onServiceFiltersChange = (value: string[]) => {
    setServiceFilters(value)
    writeServiceQuery(
      value.length === 1 ? (value[0] as ServiceType) : undefined,
    )
  }

  const visibleServices = useMemo(() => {
    if (!serviceFilters.length) return enabledServices
    const selected = new Set(serviceFilters)
    return enabledServices.filter((option) => selected.has(option.value))
  }, [enabledServices, serviceFilters])

  const boards = useMemo(
    () =>
      visibleServices
        .map((service) => {
          const board = buildServiceBoard(scopedCases, {
            services: [service.value],
          })
          return {
            key: service.value,
            label: service.label,
            icon: service.icon,
            openCount: board.openCount,
            blockedCount: board.blockedCount,
            actionableCount: board.actionableCount,
            onHoldCount: board.onHoldCount,
            columns: buildBoardColumns(service.value, board),
          }
        })
        .filter((entry) => entry.openCount > 0),
    [visibleServices, scopedCases],
  )

  const boardKeys = boards.map((board) => board.key).join('|')

  useEffect(() => {
    if (focusService === 'all') return
    if (!boards.some((board) => board.key === focusService)) {
      setFocusService('all')
    }
  }, [boardKeys, boards, focusService])

  const shownBoards =
    focusService === 'all'
      ? boards
      : boards.filter((board) => board.key === focusService)

  const totalOpen = boards.reduce((sum, board) => sum + board.openCount, 0)
  const advanceCase = advanceCaseId
    ? (cases.find((entry) => entry.id === advanceCaseId) ??
      getCaseById(advanceCaseId))
    : undefined

  const beginCardDrag = (
    event: DragEvent<HTMLButtonElement>,
    item: ServiceBoardItem,
  ) => {
    const caseItem = getCaseById(item.id)
    const next = caseItem ? getNextStepDef(caseItem) : null
    if (!caseItem || !next || caseItem.currentStepId !== item.stepId) {
      event.preventDefault()
      return
    }
    const payload: BoardDragPayload = {
      caseId: item.id,
      fromStepId: item.stepId,
      nextStepId: next.id,
    }
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData(BOARD_DRAG_MIME, JSON.stringify(payload))
    event.dataTransfer.setData('text/plain', JSON.stringify(payload))
    const nextDrag = { caseId: item.id, nextStepId: next.id }
    dragRef.current = nextDrag
    setDragState(nextDrag)
    setDropTargetStepId(null)
  }

  const endCardDrag = () => {
    dragRef.current = null
    setDragState(null)
    setDropTargetStepId(null)
  }

  const activeDrag = dragState ?? dragRef.current

  const columnAcceptsDrop = (columnId: string) =>
    Boolean(activeDrag && activeDrag.nextStepId === columnId)

  const handleColumnDragOver = (
    event: DragEvent<HTMLLIElement>,
    columnId: string,
  ) => {
    if (!columnAcceptsDrop(columnId)) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    if (dropTargetStepId !== columnId) setDropTargetStepId(columnId)
  }

  const handleColumnDrop = (
    event: DragEvent<HTMLLIElement>,
    columnId: string,
  ) => {
    event.preventDefault()
    const payload = readBoardDrag(event)
    const nextStepId =
      payload?.nextStepId ?? dragRef.current?.nextStepId ?? dragState?.nextStepId
    const caseId =
      payload?.caseId ?? dragRef.current?.caseId ?? dragState?.caseId
    dragRef.current = null
    setDragState(null)
    setDropTargetStepId(null)
    if (!caseId || !nextStepId || nextStepId !== columnId) return
    const caseItem = getCaseById(caseId)
    if (!caseItem || getNextStepDef(caseItem)?.id !== columnId) return
    setAdvanceCaseId(caseId)
  }

  const serviceFilterActive = serviceFilters.length > 0

  return (
    <div
      className={cn('pd-page pd-page--elevated', elevatedPageClass)}
      data-elevated-canvas
      aria-label="Services board"
    >
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="m-0 text-xl font-semibold tracking-tight">Services</h1>
          {viewToggle}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className={cn(
                  whiteControlClass,
                  serviceFilterActive &&
                    'border-primary bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary',
                )}
                aria-label={
                  serviceFilterActive
                    ? `Filter Service, ${serviceFilters.length} selected`
                    : 'Filter Service'
                }
              >
                <ListFilter data-icon="inline-start" aria-hidden />
                Service
                {serviceFilterActive ? (
                  <Badge
                    variant="secondary"
                    className="ml-1 h-5 min-w-5 px-1.5 tabular-nums"
                  >
                    {serviceFilters.length}
                  </Badge>
                ) : null}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 !gap-0 !p-0">
              <ServiceFilterChoices
                options={enabledServices.map((option) => ({
                  value: option.value,
                  label: option.label,
                }))}
                selected={serviceFilters}
                onChange={onServiceFiltersChange}
              />
              {serviceFilterActive ? (
                <>
                  <div className="h-px bg-border" />
                  <div className="p-2">
                    <Button
                      type="button"
                      variant="outline"
                      className={cn('h-8 w-full', whiteControlClass)}
                      onClick={() => onServiceFiltersChange([])}
                    >
                      Clear Filters
                    </Button>
                  </div>
                </>
              ) : null}
            </PopoverContent>
          </Popover>
        </div>
      </header>

      {boards.length === 0 ? (
        <Empty className="bg-card shadow-sm">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <PackageOpen aria-hidden />
            </EmptyMedia>
            <EmptyTitle>
              {serviceFilters.length ? 'No Matching Files' : 'No Open Services'}
            </EmptyTitle>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <Tabs
            value={focusService}
            onValueChange={(value) => {
              setFocusService(value)
              if (value === 'all') writeServiceQuery()
              else writeServiceQuery(value as ServiceType)
            }}
          >
            <div className="overflow-x-auto">
              <TabsList
                aria-label="Services"
                className="h-auto min-h-9 w-max max-w-none gap-1 bg-muted/70 p-1"
              >
                <TabsTrigger value="all" className="gap-1.5 px-2.5 py-1.5">
                  <LayoutGrid size={15} strokeWidth={2} aria-hidden />
                  All
                  <Badge
                    variant="secondary"
                    className="h-5 min-w-5 px-1.5 tabular-nums"
                  >
                    {totalOpen}
                  </Badge>
                </TabsTrigger>
                {boards.map((board) => {
                  const Icon = board.icon
                  return (
                    <TabsTrigger
                      key={board.key}
                      value={board.key}
                      className="gap-1.5 px-2.5 py-1.5"
                    >
                      <Icon size={15} strokeWidth={2} aria-hidden />
                      {board.label}
                      <Badge
                        variant="secondary"
                        className="h-5 min-w-5 px-1.5 tabular-nums"
                      >
                        {board.openCount}
                      </Badge>
                    </TabsTrigger>
                  )
                })}
              </TabsList>
            </div>
          </Tabs>

          <div className="flex flex-col gap-4">
            {shownBoards.map((board) => {
              const Icon = board.icon
              return (
                <Card
                  key={board.key}
                  size="sm"
                  className="gap-0 border border-border bg-card shadow-md ring-0"
                  aria-label={board.label}
                >
                  <CardHeader className="flex flex-row items-center gap-3 border-b border-border [.border-b]:pb-3">
                    <span
                      className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground"
                      aria-hidden
                    >
                      <Icon size={18} strokeWidth={2} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-base font-semibold tracking-tight">
                        {board.label}
                      </CardTitle>
                      <CardDescription className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span>{board.openCount} open</span>
                        {board.actionableCount > 0 ? (
                          <span>{board.actionableCount} ready</span>
                        ) : null}
                        {board.blockedCount > 0 ? (
                          <span className="text-destructive">
                            {board.blockedCount} blocked
                          </span>
                        ) : null}
                        {board.onHoldCount > 0 ? (
                          <span>{board.onHoldCount} on hold</span>
                        ) : null}
                      </CardDescription>
                    </div>
                  </CardHeader>

                  <CardContent className="overflow-x-auto p-3 sm:p-4">
                    <ol
                      className="flex min-h-[18rem] min-w-max items-stretch gap-3"
                      aria-label={`${board.label} stages`}
                    >
                      {board.columns.map((column) => {
                        const occupied = column.items.length > 0
                        const isDropTarget =
                          dropTargetStepId === column.id &&
                          columnAcceptsDrop(column.id)
                        const isDropCandidate =
                          Boolean(dragState) && columnAcceptsDrop(column.id)
                        return (
                          <li
                            key={column.id}
                            className={cn(
                              'flex w-[16.5rem] shrink-0 flex-col rounded-xl border bg-muted/25 transition',
                              occupied
                                ? 'border-border'
                                : 'border-dashed border-border/80',
                              isDropCandidate &&
                                'border-primary/45 bg-primary/[0.04] ring-1 ring-primary/25',
                              isDropTarget &&
                                'border-primary bg-primary/[0.08] ring-2 ring-primary/40',
                            )}
                            onDragOver={(event) =>
                              handleColumnDragOver(event, column.id)
                            }
                            onDragLeave={(event) => {
                              if (
                                event.currentTarget.contains(
                                  event.relatedTarget as Node | null,
                                )
                              ) {
                                return
                              }
                              if (dropTargetStepId === column.id) {
                                setDropTargetStepId(null)
                              }
                            }}
                            onDrop={(event) =>
                              handleColumnDrop(event, column.id)
                            }
                          >
                            <header
                              className={cn(
                                'flex items-center gap-2 border-b px-3 py-2.5',
                                occupied
                                  ? 'border-border bg-card/80'
                                  : 'border-transparent',
                              )}
                            >
                              <span
                                className={cn(
                                  'inline-flex size-6 shrink-0 items-center justify-center rounded-md text-[0.7rem] font-semibold tabular-nums',
                                  occupied
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted text-muted-foreground',
                                )}
                                aria-hidden
                              >
                                {column.number}
                              </span>
                              <h3 className="min-w-0 flex-1 truncate text-sm font-semibold tracking-tight">
                                {column.label}
                              </h3>
                              <span
                                className={cn(
                                  'inline-flex h-5 min-w-5 items-center justify-center rounded-md px-1.5 text-[0.7rem] font-semibold tabular-nums',
                                  occupied
                                    ? 'bg-muted text-foreground'
                                    : 'text-muted-foreground',
                                )}
                              >
                                {column.items.length}
                              </span>
                            </header>

                            {occupied ? (
                              <ul className="flex flex-1 flex-col gap-2 overflow-y-auto p-2.5">
                                {column.items.map((item) => {
                                  const caseItem = getCaseById(item.id)
                                  const canDrag = Boolean(
                                    caseItem &&
                                      caseItem.currentStepId === item.stepId &&
                                      getNextStepDef(caseItem),
                                  )
                                  return (
                                    <li key={item.id}>
                                      <BoardCard
                                        item={item}
                                        canDrag={canDrag}
                                        isDragging={
                                          dragState?.caseId === item.id
                                        }
                                        onOpen={() => navigate(item.href)}
                                        onDragStart={(event) =>
                                          beginCardDrag(event, item)
                                        }
                                        onDragEnd={endCardDrag}
                                      />
                                    </li>
                                  )
                                })}
                              </ul>
                            ) : (
                              <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-8 text-center">
                                <PackageOpen
                                  className="size-5 text-muted-foreground/70"
                                  strokeWidth={1.5}
                                  aria-hidden
                                />
                                <p className="m-0 text-xs text-muted-foreground">
                                  {isDropCandidate
                                    ? 'Drop here to advance'
                                    : 'No open files at this stage'}
                                </p>
                              </div>
                            )}
                          </li>
                        )
                      })}
                    </ol>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </>
      )}

      {advanceCase ? (
        <StepCompletionDrawer
          open
          item={advanceCase}
          stepId={advanceCase.currentStepId}
          mode="complete"
          onClose={() => setAdvanceCaseId(null)}
        />
      ) : null}
    </div>
  )
}
