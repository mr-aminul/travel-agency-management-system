import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import {
  PLATFORM_TOUR_STEPS,
  type PlatformTourStep,
} from '@/lib/platformTour'
import {
  dismissOnboarding,
  usePlatformTourState,
} from '@/lib/onboardingStore'
import { Button } from '@/components/ui'
import '@/styles/layout-tour.css'

const PAD = 8
const CARD_GAP = 12
const CARD_WIDTH = 320

type TargetBox = {
  top: number
  left: number
  width: number
  height: number
}

type CardPos = {
  top: number
  left: number
}

function readTarget(selector: string | undefined): TargetBox | null {
  if (!selector || typeof document === 'undefined') return null
  const el = document.querySelector(selector)
  if (!(el instanceof HTMLElement)) return null
  const rect = el.getBoundingClientRect()
  if (rect.width < 2 || rect.height < 2) return null
  const vw = window.innerWidth
  const vh = window.innerHeight
  if (
    rect.bottom < 8 ||
    rect.top > vh - 8 ||
    rect.right < 8 ||
    rect.left > vw - 8
  ) {
    return null
  }
  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  }
}

function placeCard(
  step: PlatformTourStep,
  target: TargetBox | null,
): CardPos {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const cardH = 220

  if (!target) {
    return {
      top: Math.max(24, (vh - cardH) / 2),
      left: Math.max(16, (vw - CARD_WIDTH) / 2),
    }
  }

  const placement = step.placement ?? 'auto'
  const below = target.top + target.height + CARD_GAP
  const above = target.top - cardH - CARD_GAP
  const right = target.left + target.width + CARD_GAP
  const left = target.left - CARD_WIDTH - CARD_GAP

  let top = below
  let leftPos = target.left + target.width / 2 - CARD_WIDTH / 2

  const prefer =
    placement === 'auto'
      ? below + cardH < vh - 16
        ? 'bottom'
        : above > 16
          ? 'top'
          : right + CARD_WIDTH < vw - 16
            ? 'right'
            : 'left'
      : placement

  if (prefer === 'bottom') {
    top = below
    leftPos = target.left + target.width / 2 - CARD_WIDTH / 2
  } else if (prefer === 'top') {
    top = Math.max(16, above)
    leftPos = target.left + target.width / 2 - CARD_WIDTH / 2
  } else if (prefer === 'right') {
    top = target.top + target.height / 2 - cardH / 2
    leftPos = right
  } else {
    top = target.top + target.height / 2 - cardH / 2
    leftPos = left
  }

  return {
    top: Math.min(Math.max(16, top), vh - cardH - 16),
    left: Math.min(Math.max(16, leftPos), vw - CARD_WIDTH - 16),
  }
}

export function PlatformTour() {
  const { dismissed } = usePlatformTourState()
  const [stepIndex, setStepIndex] = useState(0)
  const [target, setTarget] = useState<TargetBox | null>(null)
  const [card, setCard] = useState<CardPos>({ top: 0, left: 0 })
  const titleId = useId()
  const bodyId = useId()

  const open = !dismissed
  const step = PLATFORM_TOUR_STEPS[stepIndex]
  const isFirst = stepIndex === 0
  const isLast = stepIndex === PLATFORM_TOUR_STEPS.length - 1

  const finish = useCallback(() => {
    dismissOnboarding()
  }, [])

  const measure = useCallback(() => {
    if (!step) return
    if (step.selector) {
      const el = document.querySelector(step.selector)
      if (el instanceof HTMLElement) {
        el.scrollIntoView({ block: 'nearest', inline: 'nearest' })
      }
    }
    const measured = readTarget(step.selector)
    setTarget(measured)
    setCard(placeCard(step, measured))
  }, [step])

  useLayoutEffect(() => {
    if (!open || !step) return
    measure()
    const raf = window.requestAnimationFrame(measure)
    return () => window.cancelAnimationFrame(raf)
  }, [open, step, measure])

  useEffect(() => {
    if (!open) return
    const onResize = () => measure()
    window.addEventListener('resize', onResize)
    window.addEventListener('scroll', onResize, true)
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('scroll', onResize, true)
    }
  }, [open, measure])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        finish()
        return
      }
      if (event.key === 'ArrowRight' || event.key === 'Enter') {
        event.preventDefault()
        if (isLast) finish()
        else setStepIndex((i) => Math.min(i + 1, PLATFORM_TOUR_STEPS.length - 1))
        return
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        setStepIndex((i) => Math.max(i - 1, 0))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, finish, isLast])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open || !step || typeof document === 'undefined') return null

  const hole = target
    ? {
        top: Math.max(0, target.top - PAD),
        left: Math.max(0, target.left - PAD),
        width: target.width + PAD * 2,
        height: target.height + PAD * 2,
      }
    : null

  return createPortal(
    <div className="pd-tour" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={bodyId}>
      <div className="pd-tour__backdrop" onClick={finish} />
      {hole ? (
        <div
          className="pd-tour__hole"
          style={{
            top: hole.top,
            left: hole.left,
            width: hole.width,
            height: hole.height,
          }}
          aria-hidden
        />
      ) : null}

      <div
        className="pd-tour__card"
        style={{ top: card.top, left: card.left, width: CARD_WIDTH }}
      >
        <div className="pd-tour__card-head">
          <p className="pd-tour__eyebrow">
            Platform tour · {stepIndex + 1} of {PLATFORM_TOUR_STEPS.length}
          </p>
          <button
            type="button"
            className="pd-tour__close"
            onClick={finish}
            aria-label="Skip tour"
          >
            <X size={16} strokeWidth={2.25} aria-hidden />
          </button>
        </div>
        <h2 id={titleId} className="pd-tour__title">
          {step.title}
        </h2>
        <p id={bodyId} className="pd-tour__body">
          {step.body}
        </p>
        <div className="pd-tour__actions">
          <Button size="sm" variant="ghost" onClick={finish}>
            Skip
          </Button>
          <div className="pd-tour__actions-nav">
            {!isFirst ? (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setStepIndex((i) => i - 1)}
              >
                Back
              </Button>
            ) : null}
            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                if (isLast) finish()
                else setStepIndex((i) => i + 1)
              }}
            >
              {isLast ? 'Done' : 'Next'}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
