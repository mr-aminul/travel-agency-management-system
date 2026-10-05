import {
  useEffect,
  useId,
  useRef,
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

/**
 * Right-side panel for focused work without burying the page under a form.
 * Esc / backdrop click closes. Focus moves into the panel when opened.
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
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

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
      window.removeEventListener('keydown', onKeyDown)
      previousFocusRef.current?.focus()
      previousFocusRef.current = null
    }
  }, [open])

  if (!open) return null

  return (
    <div className="pd-drawer" role="presentation">
      <button
        type="button"
        className="pd-drawer__backdrop"
        aria-label="Close panel"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        className={cx('pd-drawer__panel', className)}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
      >
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
