import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { createPortal } from 'react-dom'
import {
  ChevronLeft,
  ChevronRight,
  ListFilter,
  Search,
  X,
  type LucideIcon,
} from 'lucide-react'
import { cx } from '@/lib/cx'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'

export type FilterPopoverOption = {
  value: string
  label: string
}

export type FilterPopoverDimension = {
  id: string
  label: string
  icon?: LucideIcon
  options: FilterPopoverOption[]
  value: string[]
  onChange: (value: string[]) => void
}

export type FilterPopoverProps = {
  dimensions: FilterPopoverDimension[]
  /** Shown above the attribute list (root view). */
  sectionLabel?: string
  onClearAll?: () => void
  className?: string
  /** Prefer icon-only trigger on very narrow toolbars. */
  iconOnly?: boolean
}

const PANEL_GAP_PX = 6
const PANEL_WIDTH_PX = 20 * 16
const VIEWPORT_PAD_PX = 8

function panelStyleForTrigger(trigger: DOMRect): CSSProperties {
  const width = Math.min(
    PANEL_WIDTH_PX,
    window.innerWidth - VIEWPORT_PAD_PX * 2,
  )
  const preferredLeft = trigger.left
  const left = Math.min(
    Math.max(VIEWPORT_PAD_PX, preferredLeft),
    window.innerWidth - width - VIEWPORT_PAD_PX,
  )
  const spaceBelow = window.innerHeight - trigger.bottom - VIEWPORT_PAD_PX
  const spaceAbove = trigger.top - VIEWPORT_PAD_PX
  const openUp = spaceBelow < 18 * 16 && spaceAbove > spaceBelow
  const maxHeight = Math.max(
    14 * 16,
    openUp ? spaceAbove - PANEL_GAP_PX : spaceBelow - PANEL_GAP_PX,
  )

  return {
    position: 'fixed',
    top: openUp ? undefined : trigger.bottom + PANEL_GAP_PX,
    bottom: openUp
      ? window.innerHeight - trigger.top + PANEL_GAP_PX
      : undefined,
    left,
    width,
    maxHeight,
    zIndex: 1200,
  }
}

function toggleValue(current: string[], next: string, checked: boolean) {
  if (checked) {
    return current.includes(next) ? current : [...current, next]
  }
  return current.filter((item) => item !== next)
}

export function FilterPopover({
  dimensions,
  sectionLabel = 'Filter by',
  onClearAll,
  className,
  iconOnly = false,
}: FilterPopoverProps) {
  const panelId = useId()
  const searchId = useId()
  const [open, setOpen] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [panelStyle, setPanelStyle] = useState<CSSProperties>()
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const activeDimension = dimensions.find((item) => item.id === activeId) ?? null
  const activeCount = useMemo(
    () => dimensions.reduce((sum, item) => sum + item.value.length, 0),
    [dimensions],
  )

  const filteredDimensions = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q || activeDimension) return dimensions
    return dimensions.filter((item) => item.label.toLowerCase().includes(q))
  }, [activeDimension, dimensions, query])

  const filteredOptions = useMemo(() => {
    if (!activeDimension) return []
    const q = query.trim().toLowerCase()
    if (!q) return activeDimension.options
    return activeDimension.options.filter((option) =>
      option.label.toLowerCase().includes(q),
    )
  }, [activeDimension, query])

  const close = () => {
    setOpen(false)
    setActiveId(null)
    setQuery('')
    triggerRef.current?.focus()
  }

  const openPanel = () => {
    setOpen(true)
    setActiveId(null)
    setQuery('')
  }

  useLayoutEffect(() => {
    if (!open) {
      setPanelStyle(undefined)
      return
    }

    const update = () => {
      const triggerEl = triggerRef.current
      if (!triggerEl) return
      setPanelStyle(panelStyleForTrigger(triggerEl.getBoundingClientRect()))
    }

    update()
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [open, activeId])

  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (containerRef.current?.contains(target)) return
      if (panelRef.current?.contains(target)) return
      setOpen(false)
      setActiveId(null)
      setQuery('')
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      if (activeId) {
        setActiveId(null)
        setQuery('')
        return
      }
      setOpen(false)
      setQuery('')
      triggerRef.current?.focus()
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, activeId])

  useEffect(() => {
    if (!open) return
    const frame = window.requestAnimationFrame(() => {
      searchRef.current?.focus()
    })
    return () => window.cancelAnimationFrame(frame)
  }, [open, activeId])

  const allVisibleSelected =
    !!activeDimension &&
    filteredOptions.length > 0 &&
    filteredOptions.every((option) =>
      activeDimension.value.includes(option.value),
    )

  const panel =
    open && panelStyle ? (
      <div
        ref={panelRef}
        id={panelId}
        role="dialog"
        aria-label={activeDimension ? activeDimension.label : 'Filters'}
        className="pd-filter-popover__panel"
        style={panelStyle}
      >
        <header
          className={cx(
            'pd-filter-popover__header',
            !activeDimension && 'pd-filter-popover__header--root',
          )}
        >
          {activeDimension ? (
            <button
              type="button"
              className="pd-filter-popover__icon-btn"
              aria-label="Back to filters"
              onClick={() => {
                setActiveId(null)
                setQuery('')
              }}
            >
              <ChevronLeft size={18} strokeWidth={2} aria-hidden />
            </button>
          ) : null}
          <span
            className={cx(
              'pd-filter-popover__title',
              activeDimension && 'pd-filter-popover__title--center',
            )}
          >
            {activeDimension ? activeDimension.label : 'Filters'}
          </span>
          <button
            type="button"
            className="pd-filter-popover__icon-btn"
            aria-label="Close filters"
            onClick={close}
          >
            <X size={16} strokeWidth={2} aria-hidden />
          </button>
        </header>

        <div className="pd-filter-popover__search">
          <label className="pd-filter-popover__search-field" htmlFor={searchId}>
            <span className="pd-sr-only">
              {activeDimension ? 'Search values' : 'Search attributes'}
            </span>
            <input
              ref={searchRef}
              id={searchId}
              type="search"
              className="pd-filter-popover__search-input"
              placeholder={
                activeDimension ? 'Search values…' : 'Search attributes…'
              }
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <Search
              size={16}
              strokeWidth={2}
              className="pd-filter-popover__search-icon"
              aria-hidden
            />
          </label>
        </div>

        {!activeDimension ? (
          <div className="pd-filter-popover__body">
            <p className="pd-filter-popover__section">{sectionLabel}</p>
            <ul className="pd-filter-popover__list">
              {filteredDimensions.length === 0 ? (
                <li className="pd-filter-popover__empty">No attributes match</li>
              ) : (
                filteredDimensions.map((dimension) => {
                  const Icon = dimension.icon
                  const count = dimension.value.length
                  return (
                    <li key={dimension.id}>
                      <button
                        type="button"
                        className="pd-filter-popover__attr"
                        onClick={() => {
                          setActiveId(dimension.id)
                          setQuery('')
                        }}
                      >
                        <span className="pd-filter-popover__attr-icon" aria-hidden>
                          {Icon ? <Icon size={18} strokeWidth={1.75} /> : null}
                        </span>
                        <span className="pd-filter-popover__attr-label">
                          {dimension.label}
                        </span>
                        {count > 0 ? (
                          <span className="pd-filter-popover__attr-count">
                            {count}
                          </span>
                        ) : null}
                        <ChevronRight
                          size={16}
                          strokeWidth={2}
                          className="pd-filter-popover__attr-chevron"
                          aria-hidden
                        />
                      </button>
                    </li>
                  )
                })
              )}
            </ul>
            {onClearAll && activeCount > 0 ? (
              <div className="pd-filter-popover__footer">
                <button
                  type="button"
                  className="pd-filter-popover__clear"
                  onClick={() => {
                    onClearAll()
                  }}
                >
                  Clear all filters
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="pd-filter-popover__body">
            <ul className="pd-filter-popover__values">
              {filteredOptions.length === 0 ? (
                <li className="pd-filter-popover__empty">No values match</li>
              ) : (
                <>
                  <li>
                    <Checkbox
                      className="pd-filter-popover__check"
                      label="Select all"
                      checked={allVisibleSelected}
                      onChange={(event) => {
                        const visible = filteredOptions.map((item) => item.value)
                        if (event.target.checked) {
                          const merged = new Set([
                            ...activeDimension.value,
                            ...visible,
                          ])
                          activeDimension.onChange([...merged])
                        } else {
                          const drop = new Set(visible)
                          activeDimension.onChange(
                            activeDimension.value.filter(
                              (item) => !drop.has(item),
                            ),
                          )
                        }
                      }}
                    />
                  </li>
                  {filteredOptions.map((option) => (
                    <li key={option.value}>
                      <Checkbox
                        className="pd-filter-popover__check"
                        label={option.label}
                        checked={activeDimension.value.includes(option.value)}
                        onChange={(event) => {
                          activeDimension.onChange(
                            toggleValue(
                              activeDimension.value,
                              option.value,
                              event.target.checked,
                            ),
                          )
                        }}
                      />
                    </li>
                  ))}
                </>
              )}
            </ul>
          </div>
        )}
      </div>
    ) : null

  return (
    <div ref={containerRef} className={cx('pd-filter-popover', className)}>
      <Button
        ref={triggerRef}
        type="button"
        variant={activeCount > 0 || open ? 'primary' : 'secondary'}
        size="md"
        className={cx(
          'pd-filter-popover__trigger',
          open && 'is-open',
          activeCount > 0 && 'has-filters',
          iconOnly && 'pd-filter-popover__trigger--icon',
        )}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={
          activeCount > 0 ? `Filters, ${activeCount} active` : 'Filters'
        }
        onClick={() => {
          if (open) close()
          else openPanel()
        }}
      >
        <ListFilter size={16} strokeWidth={2} aria-hidden />
        {!iconOnly ? 'Filters' : null}
        {activeCount > 0 ? (
          <span className="pd-filter-popover__badge" aria-hidden>
            {activeCount}
          </span>
        ) : null}
      </Button>
      {typeof document !== 'undefined' && panel
        ? createPortal(panel, document.body)
        : null}
    </div>
  )
}
