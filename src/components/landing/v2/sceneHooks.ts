import { useEffect, useState, type RefObject } from 'react'

export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

/** Maps `value` from the [start, end] window onto 0..1. */
export function progressBetween(value: number, start: number, end: number): number {
  return clamp01((value - start) / (end - start))
}

export function usePrefersReducedMotion(): boolean {
  const [isReduced, setIsReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setIsReduced(query.matches)
    query.addEventListener('change', sync)
    return () => query.removeEventListener('change', sync)
  }, [])

  return isReduced
}

/** 0 when the section top reaches the viewport top, 1 when its bottom reaches the viewport bottom. */
export function useScrollProgress(ref: RefObject<HTMLElement | null>, isEnabled: boolean): number {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (!isEnabled) return
    let frame = 0

    const measure = () => {
      frame = 0
      const element = ref.current
      if (!element) return
      const rect = element.getBoundingClientRect()
      const range = rect.height - window.innerHeight
      const next = range > 0 ? clamp01(-rect.top / range) : 0
      setProgress((previous) => (Math.abs(previous - next) < 0.0004 ? previous : next))
    }

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure)
    }

    measure()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
  }, [ref, isEnabled])

  return progress
}

/** Writes `--fit` on the element so a fixed-size canvas inside can scale to its width. */
export function useFitScale(ref: RefObject<HTMLElement | null>, canvasWidth: number): void {
  useEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => {
      element.style.setProperty('--fit', String(entry.contentRect.width / canvasWidth))
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref, canvasWidth])
}

export function useInView(ref: RefObject<HTMLElement | null>, rootMargin = '0px'): boolean {
  const [isInView, setIsInView] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new IntersectionObserver(([entry]) => setIsInView(entry.isIntersecting), { rootMargin })
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref, rootMargin])

  return isInView
}

/** Marks `[data-enter]` children with `data-entered` the first time they scroll into view. */
export function useEnterOnScroll(rootRef: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const targets = Array.from(root.querySelectorAll<HTMLElement>('[data-enter]'))
    root.classList.add('enter-ready')

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          entry.target.setAttribute('data-entered', '')
          observer.unobserve(entry.target)
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
    )

    targets.forEach((target) => observer.observe(target))
    return () => observer.disconnect()
  }, [rootRef])
}
