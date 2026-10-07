import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type AnimationEvent as ReactAnimationEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { X } from 'lucide-react'
import { cx } from '@/lib/cx'

export type SideDrawerProps = {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children?: ReactNode
  /** Sticky footer (e.g. primary actions). */
  footer?: ReactNode
  className?: string
}

const DRAWER_WIDTH_STORAGE_KEY = 'pd-drawer-width'
const MIN_DRAWER_WIDTH_PX = 320
const KEYBOARD_RESIZE_STEP_PX = 24

function readStoredDrawerWidth(): number | null {
  try {
    const raw = localStorage.getItem(DRAWER_WIDTH_STORAGE_KEY)
    if (raw == null || raw === '') return null
    const value = Number(raw)
    if (!Number.isFinite(value) || value < MIN_DRAWER_WIDTH_PX) return null
    return value
  } catch {
    return null
  }
}

function writeStoredDrawerWidth(width: number) {
  try {
    localStorage.setItem(DRAWER_WIDTH_STORAGE_KEY, String(Math.round(width)))
  } catch {
    /* private mode / quota */
  }
}

function clearStoredDrawerWidth() {
  try {
    localStorage.removeItem(DRAWER_WIDTH_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

function maxDrawerWidthPx() {
  return Math.max(MIN_DRAWER_WIDTH_PX, window.innerWidth - 16)
}

function clampDrawerWidth(width: number) {
  return Math.min(Math.max(width, MIN_DRAWER_WIDTH_PX), maxDrawerWidthPx())
}

/**
 * Right-side panel for focused work without burying the page under a form.
 * Esc / backdrop click closes. Focus moves into the panel when opened.
 * Left-edge grip resizes width; the choice is remembered across panels.
 */
export function SideDrawer({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
}: SideDrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const onCloseRef = useRef(onClose)
  const dragRef = useRef<{ pointerId: number; startX: number; startWidth: number } | null>(
    null,
  )
  const titleId = useId()
  const descriptionId = useId()
  const [widthPx, setWidthPx] = useState<number | null>(readStoredDrawerWidth)
  const [isResizing, setIsResizing] = useState(false)
  const [isEntering, setIsEntering] = useState(false)
  const widthPxRef = useRef(widthPx)
  const suppressBackdropClickRef = useRef(false)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    widthPxRef.current = widthPx
  }, [widthPx])

  const applyWidth = useCallback((next: number) => {
    const clamped = clampDrawerWidth(next)
    setWidthPx(clamped)
    writeStoredDrawerWidth(clamped)
    return clamped
  }, [])

  const currentPanelWidth = useCallback(() => {
    return panelRef.current?.offsetWidth || widthPxRef.current || MIN_DRAWER_WIDTH_PX
  }, [])

  // Apply the enter class before paint so the slide-in is not skipped for a frame.
  useLayoutEffect(() => {
    if (!open) {
      setIsEntering(false)
      setIsResizing(false)
      suppressBackdropClickRef.current = false
      return
    }
    setIsEntering(true)
  }, [open])

  // Only when `open` flips — not when parents recreate `onClose` on each keystroke.
  // Re-running would steal focus from inputs inside the drawer.
  useEffect(() => {
    if (!open) return

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    // Let child autoFocus win; only focus the panel shell if nothing inside is active.
    const frame = requestAnimationFrame(() => {
      const panel = panelRef.current
      if (!panel) return
      if (!panel.contains(document.activeElement)) {
        panel.focus()
      }
    })

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
      }
    }
    window.addEventListener('keydown', onKeyDown)

    return () => {
      cancelAnimationFrame(frame)
      document.body.style.overflow = previousOverflow
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      window.removeEventListener('keydown', onKeyDown)
      previousFocusRef.current?.focus()
      previousFocusRef.current = null
    }
  }, [open])

  const onPanelAnimationEnd = (event: ReactAnimationEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return
    if (event.animationName !== 'pd-drawer-in') return
    setIsEntering(false)
  }

  const onGripPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      /* jsdom */
    }
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startWidth: currentPanelWidth(),
    }
    setIsEntering(false)
    setIsResizing(true)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  const endGripDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || event.pointerId !== drag.pointerId) return
    const moved = Math.abs(event.clientX - drag.startX) > 2
    dragRef.current = null
    setIsResizing(false)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    // Pointerup after a drag often lands on the backdrop and would close the panel.
    if (moved) {
      suppressBackdropClickRef.current = true
    }
    try {
      if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }
    } catch {
      /* jsdom */
    }
  }

  const onGripPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || event.pointerId !== drag.pointerId) return
    event.preventDefault()
    applyWidth(drag.startWidth + (drag.startX - event.clientX))
  }

  const onGripDoubleClick = () => {
    dragRef.current = null
    setIsResizing(false)
    setWidthPx(null)
    clearStoredDrawerWidth()
  }

  const onBackdropClick = () => {
    if (suppressBackdropClickRef.current) {
      suppressBackdropClickRef.current = false
      return
    }
    onClose()
  }

  const onGripKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const current = currentPanelWidth()
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      applyWidth(current + KEYBOARD_RESIZE_STEP_PX)
      return
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      applyWidth(current - KEYBOARD_RESIZE_STEP_PX)
      return
    }
    if (event.key === 'Home') {
      event.preventDefault()
      applyWidth(MIN_DRAWER_WIDTH_PX)
      return
    }
    if (event.key === 'End') {
      event.preventDefault()
      applyWidth(maxDrawerWidthPx())
    }
  }

  if (!open) return null

  const resolvedWidth = widthPx == null ? null : clampDrawerWidth(widthPx)

  return (
    <div className="pd-drawer" role="presentation">
      <button
        type="button"
        className="pd-drawer__backdrop"
        aria-label="Close panel"
        onClick={onBackdropClick}
      />
      <div
        ref={panelRef}
        className={cx(
          'pd-drawer__panel',
          isEntering && 'is-entering',
          isResizing && 'is-resizing',
          className,
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        onAnimationEnd={onPanelAnimationEnd}
        style={
          resolvedWidth == null
            ? undefined
            : { ['--drawer-width' as string]: `${resolvedWidth}px` }
        }
      >
        <div
          className="pd-drawer__grip"
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize panel"
          aria-valuemin={MIN_DRAWER_WIDTH_PX}
          aria-valuemax={maxDrawerWidthPx()}
          aria-valuenow={resolvedWidth ?? undefined}
          tabIndex={0}
          onPointerDown={onGripPointerDown}
          onPointerMove={onGripPointerMove}
          onPointerUp={endGripDrag}
          onPointerCancel={endGripDrag}
          onDoubleClick={onGripDoubleClick}
          onKeyDown={onGripKeyDown}
        />
        <header className="pd-drawer__header">
          <div className="pd-drawer__heading">
            <h2 id={titleId} className="pd-drawer__title">
              {title}
            </h2>
            {description ? (
              <p id={descriptionId} className="pd-drawer__description">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            className="pd-drawer__close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} strokeWidth={2.25} aria-hidden />
          </button>
        </header>
        <div className="pd-drawer__body">{children}</div>
        {footer ? <footer className="pd-drawer__footer">{footer}</footer> : null}
      </div>
    </div>
  )
}
