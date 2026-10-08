import {
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { LayoutGrid, ListChecks, PackageOpen } from 'lucide-react'
import { StepCompletionDrawer } from '@/components/cases/StepCompletionDrawer'
import {
  Badge,
  EmptyState,
  FilterPopover,
  PageHeader,
  type BadgeVariant,
} from '@/components/ui'
import { getNextStepDef, getStepDefs } from '@/lib/caseChecklist'
import {
  buildReadinessBoard,
  type ReadinessBoard,
  type ReadinessItem,
  type ReadinessState,
} from '@/lib/clientReadiness'
import { getCaseById, useCases } from '@/lib/casesStore'
import { useEnabledServiceOptions } from '@/lib/serviceCatalog'
import type { ServiceType } from '@/types/case'
import '@/styles/layout-readiness.css'

const BOARD_DRAG_MIME = 'application/x-onetrack-readiness-case'

type BoardDragPayload = {
  caseId: string
  fromStepId: string
  nextStepId: string
}

const STATE_BADGE: Record<
  Exclude<ReadinessState, 'actionable'>,
  { label: string; variant: BadgeVariant }
> = {
  blocked: { label: 'Blocked', variant: 'danger' },
  'on-hold': { label: 'On hold', variant: 'on-hold' },
}

type BoardColumn = {
  id: string
  label: string
  number: number
  items: ReadinessItem[]
}

function waitLabel(days: number): string {
  if (days <= 0) return 'Today'
  if (days === 1) return '1 day'
  return `${days} days`
}

function buildBoardColumns(
  service: ServiceType,
  board: ReadinessBoard,
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
  item: ReadinessItem
  canDrag: boolean
  isDragging: boolean
  onOpen: () => void
  onDragStart: (event: DragEvent<HTMLButtonElement>) => void
  onDragEnd: () => void
}) {
  const badge = item.state === 'actionable' ? null : STATE_BADGE[item.state]
  const isStale = item.daysWaiting >= 7
  const place = item.destination !== '—' ? item.destination : null
  const detail =
    item.state === 'blocked'
      ? item.action
      : item.state === 'on-hold'
        ? item.action
        : null
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
      className={[
        'pd-board__card',
        `pd-board__card--${item.state}`,
        isStale ? 'is-stale' : '',
        canDrag ? 'is-draggable' : '',
        isDragging ? 'is-dragging' : '',
      ]
        .filter(Boolean)
        .join(' ')}
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
      <span className="pd-board__card-row">
        <span className="pd-board__card-name">{item.clientName}</span>
        {badge ? (
          <Badge variant={badge.variant}>{badge.label}</Badge>
        ) : (
          <span className={`pd-board__card-wait${isStale ? ' is-stale' : ''}`}>
            {waitLabel(item.daysWaiting)}
          </span>
        )}
      </span>

      <span className="pd-board__card-meta">
        {place ? <span className="pd-board__card-place">{place}</span> : null}
        {badge ? (
          <span className={`pd-board__card-wait${isStale ? ' is-stale' : ''}`}>
            {waitLabel(item.daysWaiting)}
          </span>
        ) : null}
      </span>

      {detail ? <span className="pd-board__card-detail">{detail}</span> : null}
    </button>
  )
}

export default function ReadinessPage() {
  const navigate = useNavigate()
  const cases = useCases()
  const enabledServices = useEnabledServiceOptions()
  const enabledKeys = useMemo(
    () => new Set(enabledServices.map((option) => option.value)),
    [enabledServices],
  )

  const [serviceFilters, setServiceFilters] = useState<string[]>([])
  /** Compare deep-blue placement: lanes vs desk. */
  const [inkPlace, setInkPlace] = useState<'lanes' | 'desk'>('desk')
  /** `all` shows every board; otherwise focus one service. */
  const [focusService, setFocusService] = useState<string>('all')
  /** Case opened via board drag — complete current step to advance. */
  const [advanceCaseId, setAdvanceCaseId] = useState<string | null>(null)
  const [dragState, setDragState] = useState<{
    caseId: string
    nextStepId: string
  } | null>(null)
  const dragRef = useRef<{ caseId: string; nextStepId: string } | null>(null)
  const [dropTargetStepId, setDropTargetStepId] = useState<string | null>(null)
  const switcherRef = useRef<HTMLElement>(null)
  const switcherItemRefs = useRef(new Map<string, HTMLButtonElement>())
  const [switcherPill, setSwitcherPill] = useState({
    left: 0,
    width: 0,
    ready: false,
  })

  const scopedCases = useMemo(
    () => cases.filter((item) => enabledKeys.has(item.service)),
    [cases, enabledKeys],
  )

  const visibleServices = useMemo(() => {
    if (!serviceFilters.length) return enabledServices
    const selected = new Set(serviceFilters)
    return enabledServices.filter((option) => selected.has(option.value))
  }, [enabledServices, serviceFilters])

  const boards = useMemo(
    () =>
      visibleServices
        .map((service) => {
          const board = buildReadinessBoard(scopedCases, {
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

  const syncSwitcherPill = useEffectEvent(() => {
    const list = switcherRef.current
    const item = switcherItemRefs.current.get(focusService)
    if (!list || !item) return
    const listRect = list.getBoundingClientRect()
    const itemRect = item.getBoundingClientRect()
    const left = itemRect.left - listRect.left + list.scrollLeft
    const width = itemRect.width
    setSwitcherPill((current) => {
      if (
        current.ready &&
        Math.abs(current.left - left) < 0.5 &&
        Math.abs(current.width - width) < 0.5
      ) {
        return current
      }
      return { left, width, ready: true }
    })
  })

  useLayoutEffect(() => {
    syncSwitcherPill()
  }, [focusService, boardKeys])

  useEffect(() => {
    const list = switcherRef.current
    if (!list) return
    const onScrollOrResize = () => syncSwitcherPill()
    list.addEventListener('scroll', onScrollOrResize, { passive: true })
    window.addEventListener('resize', onScrollOrResize)
    const observer =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(onScrollOrResize)
        : null
    observer?.observe(list)
    return () => {
      list.removeEventListener('scroll', onScrollOrResize)
      window.removeEventListener('resize', onScrollOrResize)
      observer?.disconnect()
    }
  }, [])

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
    item: ReadinessItem,
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

  return (
    <div
      className={`pd-page pd-readiness pd-readiness--ink-${inkPlace}`}
      aria-label="Stage readiness"
    >
      <PageHeader
        title="Stage readiness"
        actions={
          <>
            <div
              className="pd-readiness__ink-toggle"
              role="group"
              aria-label="Color placement"
            >
              <button
                type="button"
                className={`pd-readiness__ink-option${inkPlace === 'lanes' ? ' is-selected' : ''}`}
                aria-pressed={inkPlace === 'lanes'}
                onClick={() => setInkPlace('lanes')}
              >
                Deep lanes
              </button>
              <button
                type="button"
                className={`pd-readiness__ink-option${inkPlace === 'desk' ? ' is-selected' : ''}`}
                aria-pressed={inkPlace === 'desk'}
                onClick={() => setInkPlace('desk')}
              >
                Deep desk
              </button>
            </div>
            <FilterPopover
              sectionLabel="Filter"
              dimensions={[
                {
                  id: 'service',
                  label: 'Service',
                  icon: ListChecks,
                  options: enabledServices.map((option) => ({
                    value: option.value,
                    label: option.label,
                  })),
                  value: serviceFilters,
                  onChange: setServiceFilters,
                },
              ]}
              onClearAll={
                serviceFilters.length ? () => setServiceFilters([]) : undefined
              }
            />
          </>
        }
      />

      {boards.length === 0 ? (
        <EmptyState
          title={serviceFilters.length ? 'No matching files' : 'No open services'}
          description={
            serviceFilters.length
              ? 'Clear the service filter to see everyone.'
              : 'Open files appear on each service board.'
          }
        />
      ) : (
        <>
          <nav
            ref={switcherRef}
            className="pd-board-switcher"
            aria-label="Services"
          >
            <span
              className={`pd-board-switcher__pill${switcherPill.ready ? ' is-ready' : ''}`}
              aria-hidden
              style={{
                transform: `translateX(${switcherPill.left}px)`,
                width: switcherPill.width,
              }}
            />
            <button
              type="button"
              ref={(node) => {
                if (node) switcherItemRefs.current.set('all', node)
                else switcherItemRefs.current.delete('all')
              }}
              className={`pd-board-switcher__item${focusService === 'all' ? ' is-selected' : ''}`}
              aria-current={focusService === 'all' ? 'true' : undefined}
              onClick={() => setFocusService('all')}
            >
              <span className="pd-board-switcher__icon" aria-hidden>
                <LayoutGrid size={16} strokeWidth={2} />
              </span>
              <span className="pd-board-switcher__label">All</span>
              <span className="pd-board-switcher__count">{totalOpen}</span>
            </button>
            {boards.map((board) => {
              const Icon = board.icon
              const selected = focusService === board.key
              return (
                <button
                  key={board.key}
                  type="button"
                  ref={(node) => {
                    if (node) switcherItemRefs.current.set(board.key, node)
                    else switcherItemRefs.current.delete(board.key)
                  }}
                  className={`pd-board-switcher__item${selected ? ' is-selected' : ''}`}
                  aria-current={selected ? 'true' : undefined}
                  onClick={() => setFocusService(board.key)}
                >
                  <span className="pd-board-switcher__icon" aria-hidden>
                    <Icon size={16} strokeWidth={2} />
                  </span>
                  <span className="pd-board-switcher__label">{board.label}</span>
                  <span className="pd-board-switcher__count">{board.openCount}</span>
                </button>
              )
            })}
          </nav>

          <div className="pd-readiness__boards">
          {shownBoards.map((board) => {
            const Icon = board.icon
            return (
              <section
                key={board.key}
                className="pd-board"
                aria-label={board.label}
              >
                <header className="pd-board__head">
                  <span className="pd-board__icon" aria-hidden>
                    <Icon size={18} strokeWidth={2} />
                  </span>
                  <div className="pd-board__head-copy">
                    <h2 className="pd-board__title">{board.label}</h2>
                    <p className="pd-board__summary">
                      <span>{board.openCount} open</span>
                      {board.blockedCount > 0 ? (
                        <span className="pd-board__summary-blocked">
                          {board.blockedCount} blocked
                        </span>
                      ) : null}
                      {board.actionableCount > 0 ? (
                        <span>{board.actionableCount} ready</span>
                      ) : null}
                      {board.onHoldCount > 0 ? (
                        <span>{board.onHoldCount} on hold</span>
                      ) : null}
                    </p>
                  </div>
                </header>

                <div className="pd-board__scroller">
                  <ol
                    className="pd-board__columns"
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
                          className={[
                            'pd-board__column',
                            occupied ? 'is-active' : 'is-empty',
                            isDropCandidate ? 'is-drop-candidate' : '',
                            isDropTarget ? 'is-drop-target' : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
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
                          onDrop={(event) => handleColumnDrop(event, column.id)}
                        >
                          <header className="pd-board__column-head">
                            <span className="pd-board__column-index" aria-hidden>
                              {column.number}
                            </span>
                            <h3 className="pd-board__column-title">
                              {column.label}
                            </h3>
                            <span className="pd-board__column-count">
                              {column.items.length}
                            </span>
                          </header>

                          {occupied ? (
                            <ul className="pd-board__cards">
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
                                      isDragging={dragState?.caseId === item.id}
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
                            <div className="pd-board__column-empty">
                              <PackageOpen
                                className="pd-board__column-empty-icon"
                                size={22}
                                strokeWidth={1.5}
                                aria-hidden
                              />
                              <p className="pd-board__column-empty-copy">
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
                </div>
              </section>
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
