import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { cx } from '@/lib/cx'

export type TooltipSide = 'top' | 'bottom' | 'left' | 'right'

export type TooltipProps = {
  content: ReactNode
  children: ReactNode
  side?: TooltipSide
  className?: string
  /** Delay before showing, in ms. Default 120. */
  delay?: number
  /** Wider, left-aligned copy for longer help text. */
  wide?: boolean
}

const GAP_PX = 6

function coordsForSide(
  rect: DOMRect,
  side: TooltipSide,
): CSSProperties {
  const midY = rect.top + rect.height / 2
  const midX = rect.left + rect.width / 2

  switch (side) {
    case 'right':
      return {
        position: 'fixed',
        top: midY,
        left: rect.right + GAP_PX,
        transform: 'translateY(-50%)',
      }
    case 'left':
      return {
        position: 'fixed',
        top: midY,
        left: rect.left - GAP_PX,
        transform: 'translate(-100%, -50%)',
      }
    case 'bottom':
      return {
        position: 'fixed',
        top: rect.bottom + GAP_PX,
        left: midX,
        transform: 'translateX(-50%)',
      }
    case 'top':
    default:
      return {
        position: 'fixed',
        top: rect.top - GAP_PX,
        left: midX,
        transform: 'translate(-50%, -100%)',
      }
  }
}

export function Tooltip({
  content,
  children,
  side = 'top',
  className,
  delay = 120,
  wide = false,
}: TooltipProps) {
  const tipId = useId()
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState<CSSProperties>()
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const triggerRef = useRef<HTMLSpanElement>(null)

  const clearShowTimer = () => {
    if (showTimer.current) {
      clearTimeout(showTimer.current)
      showTimer.current = null
    }
  }

  const place = () => {
    const el = triggerRef.current
    if (!el) return
    setCoords(coordsForSide(el.getBoundingClientRect(), side))
  }

  const show = () => {
    clearShowTimer()
    const reveal = () => {
      place()
      setOpen(true)
    }
    if (delay <= 0) {
      reveal()
      return
    }
    showTimer.current = setTimeout(reveal, delay)
  }

  const hide = () => {
    clearShowTimer()
    setOpen(false)
  }

  useLayoutEffect(() => {
    if (!open) {
      setCoords(undefined)
      return
    }

    const update = () => {
      const el = triggerRef.current
      if (!el) return
      setCoords(coordsForSide(el.getBoundingClientRect(), side))
    }

    update()
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [open, side])

  const tip = open ? (
    <span
      id={tipId}
      role="tooltip"
      className={cx(
        'pd-tooltip__content',
        `pd-tooltip__content--${side}`,
        wide && 'pd-tooltip__content--wide',
      )}
      style={coords}
    >
      {content}
    </span>
  ) : null

  return (
    <span
      className={cx('pd-tooltip', className)}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      <span
        ref={triggerRef}
        className="pd-tooltip__trigger"
        aria-describedby={open ? tipId : undefined}
      >
        {children}
      </span>
      {tip && typeof document !== 'undefined'
        ? createPortal(tip, document.body)
        : null}
    </span>
  )
}
