import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from 'react'
import { ArrowRight } from '@phosphor-icons/react'
import {
  DocumentsVignette,
  InvoiceVignette,
  TrackingVignette,
} from '@/components/landing/FeatureVignettes'
import { FileLands } from '@/components/landing/stageshow/FileLands'
import { publicUrl } from '@/lib/publicUrl'
import { appUrl } from '@/lib/siteOrigins'
import { subscribeUrl } from './landingLinks'
import { clamp01, usePrefersReducedMotion } from './sceneHooks'

const TITLE_LINES = [
  ['One', 'board', 'for'],
  ['every', 'travel', 'file'],
] as const

const SHOTS: readonly { id: string; label: string; kind: 'shell' | 'vignette'; screen: ReactNode }[] = [
  { id: 'board', label: 'Visa board', kind: 'shell', screen: <FileLands /> },
  { id: 'documents', label: 'Documents', kind: 'vignette', screen: <DocumentsVignette /> },
  { id: 'tracking', label: 'Client tracking', kind: 'vignette', screen: <TrackingVignette /> },
  { id: 'payments', label: 'Payments', kind: 'vignette', screen: <InvoiceVignette /> },
]

type ShotTurn = { current: number; previous: number | null; direction: 'next' | 'back'; count: number }

function HeroTitle() {
  return (
    <h1>
      {TITLE_LINES.map((words, line) => (
        <span key={line} className="hero-title-line">
          {words.map((word, index) => (
            <Fragment key={word}>
              {index > 0 ? ' ' : null}
              <span className="hero-word">
                <span style={{ '--w': index, '--l': line } as CSSProperties}>{word}</span>
              </span>
            </Fragment>
          ))}
          {line < TITLE_LINES.length - 1 ? ' ' : null}
        </span>
      ))}
    </h1>
  )
}

function useTabChip(tabsRef: RefObject<HTMLDivElement | null>, selected: number) {
  const [clip, setClip] = useState<string | null>(null)

  const measure = useCallback(() => {
    const tabs = tabsRef.current
    const tab = tabs?.querySelectorAll<HTMLElement>('[role="tab"]')[selected]
    if (!tabs || !tab) return
    const left = tab.offsetLeft
    const right = tabs.clientWidth - (tab.offsetLeft + tab.offsetWidth)
    setClip(`inset(4px ${right}px 4px ${left}px round 10px)`)
  }, [tabsRef, selected])

  useLayoutEffect(() => {
    measure()
    window.addEventListener('resize', measure)
    document.fonts?.ready.then(measure)
    return () => window.removeEventListener('resize', measure)
  }, [measure])

  return clip
}

function useFrameTilt(frameRef: RefObject<HTMLDivElement | null>, tabsRef: RefObject<HTMLDivElement | null>) {
  const isReduced = usePrefersReducedMotion()

  useEffect(() => {
    const frame = frameRef.current
    const tabs = tabsRef.current
    if (!frame || !tabs) return
    if (isReduced) {
      frame.style.transform = ''
      tabs.style.transform = ''
      return
    }
    let raf = 0
    const apply = () => {
      raf = 0
      const isNarrow = window.innerWidth < 768
      const rest = 1 - clamp01(window.scrollY / (window.innerHeight * 0.55))
      const lift = isNarrow ? 18 : 40
      const tilt = isNarrow ? 12 : 26
      const shrink = isNarrow ? 0.06 : 0.16
      frame.style.transform = `translateY(${lift * rest}px) rotateX(${tilt * rest}deg) scale(${1 - shrink * rest})`
      tabs.style.transform = `translateY(${(isNarrow ? 10 : 22) * rest}px)`
    }
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(apply)
    }
    apply()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
  }, [frameRef, tabsRef, isReduced])
}

function WorkShowcase() {
  const [turn, setTurn] = useState<ShotTurn>({ current: 0, previous: null, direction: 'next', count: 0 })
  const tabsRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const chipClip = useTabChip(tabsRef, turn.current)
  useFrameTilt(frameRef, tabsRef)

  const select = (index: number) => {
    if (index === turn.current) return
    setTurn((previous) => ({
      current: index,
      previous: previous.current,
      direction: index > previous.current ? 'next' : 'back',
      count: previous.count + 1,
    }))
  }

  const shotState = (index: number) => {
    if (index === turn.current) return 'on'
    if (index === turn.previous) return 'off'
    return 'idle'
  }

  return (
    <div className="work">
      <div className="tabs" role="tablist" aria-label="Product views" ref={tabsRef} data-chip={chipClip ? '' : undefined}>
        <span className="tabs-chip" aria-hidden>
          <span style={chipClip ? { clipPath: chipClip } : undefined} />
        </span>
        {SHOTS.map((shot, index) => (
          <button
            key={shot.id}
            type="button"
            role="tab"
            className="tab"
            id={`work-tab-${shot.id}`}
            aria-selected={index === turn.current}
            aria-controls="work-stage"
            onClick={() => select(index)}
          >
            {shot.label}
          </button>
        ))}
      </div>
      <div className="work-scene">
        <div className="work-frame" ref={frameRef}>
          <div
            className="work-stage"
            id="work-stage"
            role="tabpanel"
            aria-labelledby={`work-tab-${SHOTS[turn.current].id}`}
            data-dir={turn.direction}
            data-ss-wide
            data-ss-fill
          >
            {SHOTS.map((shot, index) => {
              const state = shotState(index)
              if (state === 'idle') return null
              return (
                <div
                  key={`${shot.id}-${turn.count}-${state}`}
                  className="work-shot"
                  data-state={state}
                  data-turned={turn.count > 0 ? '' : undefined}
                  aria-hidden={index !== turn.current}
                >
                  <div
                    className={shot.kind === 'shell' ? 'work-shot-art is-shell' : 'work-shot-art is-vignette'}
                    data-ss-wide={shot.kind === 'shell' ? '' : undefined}
                    data-ss-fill={shot.kind === 'shell' ? '' : undefined}
                  >
                    {shot.screen}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export function HeroSection() {
  const heroTopRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const heroTop = heroTopRef.current
    if (!heroTop) return
    const observer = new IntersectionObserver(([entry]) => {
      heroTop.toggleAttribute('data-asleep', !entry.isIntersecting)
    })
    observer.observe(heroTop)
    return () => observer.disconnect()
  }, [])

  return (
    <section className="hero" id="top" aria-label="OneTrack">
      <div className="hero-top" ref={heroTopRef}>
        <div className="hero-glow" aria-hidden>
          <div className="hero-sun">
            <div className="hero-sun-core" />
          </div>
          <div className="hero-veil" />
        </div>
        <div className="hero-copy">
          <a className="hero-pill" href={subscribeUrl()}>
            <span className="hero-pill-mark">
              <img src={publicUrl('images/logo.svg')} alt="" />
            </span>
            <span>
              <b>14 day free trial.</b> No card needed
            </span>
            <ArrowRight className="arrow" weight="bold" />
          </a>
          <HeroTitle />
          <p>Visas, documents, payments and client updates — one board for travel agencies.</p>
          <div className="hero-actions">
            <a className="btn btn-dark" href={subscribeUrl()}>
              Start free trial
              <ArrowRight className="arrow" weight="bold" />
            </a>
            <a className="btn btn-light" href={appUrl('/track')}>
              Track a file
              <ArrowRight className="arrow" weight="bold" />
            </a>
          </div>
        </div>
      </div>
      <WorkShowcase />
    </section>
  )
}
