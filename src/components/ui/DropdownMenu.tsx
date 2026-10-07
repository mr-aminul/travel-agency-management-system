import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { cx } from '@/lib/cx'

export type DropdownMenuItem = {
  id: string
  label: string
  onSelect: () => void
  danger?: boolean
  disabled?: boolean
  icon?: ReactNode
}

export type DropdownMenuVariant = 'default' | 'icon'

export type DropdownMenuProps = {
  label: string
  items: DropdownMenuItem[]
  trigger?: ReactNode
  align?: 'start' | 'end'
  /** `icon` = borderless compact trigger for dense tables/toolbars. */
  variant?: DropdownMenuVariant
  className?: string
  triggerProps?: ButtonHTMLAttributes<HTMLButtonElement>
}

const PANEL_GAP_PX = 4
const PANEL_MIN_WIDTH_PX = 11 * 16
const VIEWPORT_PAD_PX = 8

function panelStyleForTrigger(
  trigger: DOMRect,
  align: 'start' | 'end',
): CSSProperties {
  const width = Math.max(trigger.width, PANEL_MIN_WIDTH_PX)
  const preferredLeft =
    align === 'end' ? trigger.right - width : trigger.left
  const left = Math.min(
    Math.max(VIEWPORT_PAD_PX, preferredLeft),
    window.innerWidth - width - VIEWPORT_PAD_PX,
  )
  const spaceBelow = window.innerHeight - trigger.bottom - VIEWPORT_PAD_PX
  const spaceAbove = trigger.top - VIEWPORT_PAD_PX
  const openUp = spaceBelow < 10 * 16 && spaceAbove > spaceBelow

  return {
    position: 'fixed',
    top: openUp ? undefined : trigger.bottom + PANEL_GAP_PX,
    bottom: openUp
      ? window.innerHeight - trigger.top + PANEL_GAP_PX
      : undefined,
    left,
    width,
    maxHeight: Math.max(
      8 * 16,
      openUp ? spaceAbove - PANEL_GAP_PX : spaceBelow - PANEL_GAP_PX,
    ),
    zIndex: 1200,
  }
}

export function DropdownMenu({
  label,
  items,
  trigger,
  align = 'start',
  variant = 'default',
  className,
  triggerProps,
}: DropdownMenuProps) {
  const menuId = useId()
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [panelStyle, setPanelStyle] = useState<CSSProperties>()
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([])

  const enabledItems = items.filter((item) => !item.disabled)

  useLayoutEffect(() => {
    if (!open) {
      setPanelStyle(undefined)
      return
    }

    const update = () => {
      const triggerEl = triggerRef.current
      if (!triggerEl) return
      setPanelStyle(panelStyleForTrigger(triggerEl.getBoundingClientRect(), align))
    }

    update()
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [open, align])

  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (containerRef.current?.contains(target)) return
      if (panelRef.current?.contains(target)) return
      setOpen(false)
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setOpen(false)
        triggerRef.current?.focus()
      }
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const firstEnabled = items.findIndex((item) => !item.disabled)
    setActiveIndex(firstEnabled >= 0 ? firstEnabled : 0)
  }, [open, items])

  useEffect(() => {
    if (!open) return
    itemRefs.current[activeIndex]?.focus()
  }, [open, activeIndex])

  const moveActive = (delta: number) => {
    if (!enabledItems.length) return
    const currentId = items[activeIndex]?.id
    const enabledIndex = enabledItems.findIndex((item) => item.id === currentId)
    const nextEnabled =
      enabledItems[
        (enabledIndex + delta + enabledItems.length) % enabledItems.length
      ]
    const nextIndex = items.findIndex((item) => item.id === nextEnabled.id)
    setActiveIndex(nextIndex)
  }

  const panel =
    open && panelStyle ? (
      <div
        ref={panelRef}
        id={menuId}
        role="menu"
        aria-label={label}
        className={cx('pd-menu__panel', 'pd-menu__panel--portal')}
        style={panelStyle}
      >
        {items.map((item, index) => (
          <button
            key={item.id}
            ref={(node) => {
              itemRefs.current[index] = node
            }}
            type="button"
            role="menuitem"
            className={cx(
              'pd-menu__item',
              item.danger && 'pd-menu__item--danger',
              index === activeIndex && 'is-active',
            )}
            disabled={item.disabled}
            tabIndex={index === activeIndex ? 0 : -1}
            onMouseEnter={() => {
              if (!item.disabled) setActiveIndex(index)
            }}
            onClick={() => {
              item.onSelect()
              setOpen(false)
              triggerRef.current?.focus()
            }}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown') {
                event.preventDefault()
                moveActive(1)
              } else if (event.key === 'ArrowUp') {
                event.preventDefault()
                moveActive(-1)
              } else if (event.key === 'Home') {
                event.preventDefault()
                const first = items.findIndex((entry) => !entry.disabled)
                if (first >= 0) setActiveIndex(first)
              } else if (event.key === 'End') {
                event.preventDefault()
                for (let i = items.length - 1; i >= 0; i -= 1) {
                  if (!items[i].disabled) {
                    setActiveIndex(i)
                    break
                  }
                }
              } else if (event.key === 'Tab') {
                setOpen(false)
              }
            }}
          >
            {item.icon ? (
              <span className="pd-menu__item-icon" aria-hidden>
                {item.icon}
              </span>
            ) : null}
            {item.label}
          </button>
        ))}
      </div>
    ) : null

  const {
    className: triggerClassName,
    onClick: onTriggerClick,
    onPointerDown: onTriggerPointerDown,
    ...restTriggerProps
  } = triggerProps ?? {}

  return (
    <div ref={containerRef} className={cx('pd-menu', className)}>
      <button
        ref={triggerRef}
        type="button"
        className={cx(
          'pd-menu__trigger',
          variant === 'icon' && 'pd-menu__trigger--icon',
          open && 'is-open',
          triggerClassName,
        )}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        {...restTriggerProps}
        onPointerDown={(event) => {
          onTriggerPointerDown?.(event)
        }}
        onClick={(event) => {
          onTriggerClick?.(event)
          setOpen((value) => !value)
        }}
      >
        {trigger ?? label}
      </button>
      {panel && typeof document !== 'undefined'
        ? createPortal(panel, document.body)
        : null}
    </div>
  )
}
