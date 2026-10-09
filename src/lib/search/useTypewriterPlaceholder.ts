import { useEffect, useRef, useState } from 'react'
import {
  SEARCH_PLACEHOLDER_FALLBACK,
  type SearchPlaceholderHint,
} from './placeholderPhrases'

const TYPE_MS = 48
const ERASE_MS = 28
const HOLD_MS = 1400
const GAP_MS = 420

export type TypewriterPlaceholder = {
  text: string
  hint: SearchPlaceholderHint | null
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

const FALLBACK: TypewriterPlaceholder = {
  text: SEARCH_PLACEHOLDER_FALLBACK,
  hint: null,
}

/**
 * Cycles through hints with type → hold → erase → next.
 * When disabled or empty, falls back to {@link SEARCH_PLACEHOLDER_FALLBACK}.
 */
export function useTypewriterPlaceholder(
  hints: SearchPlaceholderHint[],
  enabled = true,
): TypewriterPlaceholder {
  const hintKey = hints.map((hint) => `${hint.id}:${hint.label}`).join('\u0001')
  const hintsRef = useRef(hints)
  hintsRef.current = hints
  const [state, setState] = useState<TypewriterPlaceholder>(FALLBACK)

  useEffect(() => {
    const list = hintsRef.current

    if (!enabled || list.length === 0) {
      setState(FALLBACK)
      return
    }

    if (prefersReducedMotion()) {
      setState({ text: list[0].label, hint: list[0] })
      return
    }

    let phraseIndex = 0
    let charIndex = 0
    let erasing = false
    let timer: ReturnType<typeof setTimeout> | undefined
    let cancelled = false

    const schedule = (fn: () => void, ms: number) => {
      timer = setTimeout(fn, ms)
    }

    const tick = () => {
      if (cancelled) return
      const hint = hintsRef.current[phraseIndex % hintsRef.current.length]
      if (!hint) return

      if (!erasing) {
        charIndex = Math.min(charIndex + 1, hint.label.length)
        setState({ text: hint.label.slice(0, charIndex), hint })
        if (charIndex >= hint.label.length) {
          erasing = true
          schedule(tick, HOLD_MS)
          return
        }
        schedule(tick, TYPE_MS)
        return
      }

      charIndex = Math.max(charIndex - 1, 0)
      setState({ text: hint.label.slice(0, charIndex), hint })
      if (charIndex <= 0) {
        erasing = false
        phraseIndex = (phraseIndex + 1) % hintsRef.current.length
        const next = hintsRef.current[phraseIndex] ?? null
        setState({ text: '', hint: next })
        schedule(tick, GAP_MS)
        return
      }
      schedule(tick, ERASE_MS)
    }

    setState({ text: '', hint: list[0] ?? null })
    schedule(tick, GAP_MS)

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [enabled, hintKey])

  return state
}
