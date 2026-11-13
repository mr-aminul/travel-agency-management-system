import {
  Fragment,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from 'react'
import { ArrowRight } from '@phosphor-icons/react'
import { FileLands } from '@/components/landing/stageshow/FileLands'
import { publicUrl } from '@/lib/publicUrl'
import { appUrl } from '@/lib/siteOrigins'
import { subscribeUrl } from './landingLinks'
import { clamp01, usePrefersReducedMotion } from './sceneHooks'

const LINE_ONE = ['Fly', 'Everything', 'From'] as const
/** Hold each phrase, then both slide up into the next. */
const SWAP_HOLD_MS = 1800

function HeroTitle() {
  const reduced = usePrefersReducedMotion()
  const [showTrack, setShowTrack] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (reduced) return
    const timer = window.setInterval(() => {
      setReady(true)
      setShowTrack((previous) => !previous)
    }, SWAP_HOLD_MS)
    return () => window.clearInterval(timer)
  }, [reduced])

  return (
    <h1>
      <span className="hero-title-line">
        {LINE_ONE.map((word, index) => (
          <Fragment key={word}>
            {index > 0 ? ' ' : null}
            <span className="hero-word">
              <span style={{ '--w': index, '--l': 0 } as CSSProperties}>{word}</span>
            </span>
          </Fragment>
        ))}
      </span>
      <span className="hero-title-line hero-title-line--swap">
        <span className="hero-swap" data-ready={ready ? '' : undefined} data-on={showTrack ? 'track' : 'terminal'}>
          <span className="hero-swap__item" data-item="terminal" data-active={!showTrack || undefined}>
            <span className="hero-word">
              <span style={{ '--w': 0, '--l': 1 } as CSSProperties}>One Terminal</span>
            </span>
          </span>
          <span className="hero-swap__item" data-item="track" data-active={showTrack || undefined}>
            <span className="hero-swap__logo" aria-hidden>
              <img src={publicUrl('images/logo.svg')} alt="" />
            </span>
            <span className="hero-word">
              <span style={{ '--w': 0, '--l': 1 } as CSSProperties}>One Track</span>
            </span>
          </span>
        </span>
      </span>
    </h1>
  )
}

function useFrameTilt(frameRef: RefObject<HTMLDivElement | null>) {
  const isReduced = usePrefersReducedMotion()

  useEffect(() => {
    const frame = frameRef.current
    if (!frame) return
    if (isReduced) {
      frame.style.transform = ''
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
  }, [frameRef, isReduced])
}

/** Visa board only — app shell, no view tabs or extra vignettes. */
function WorkShowcase() {
  const frameRef = useRef<HTMLDivElement>(null)
  useFrameTilt(frameRef)

  return (
    <div className="work work--board-only">
      <div className="work-scene">
        <div className="work-frame" ref={frameRef}>
          <div className="work-stage" data-ss-wide data-ss-fill aria-label="Visa board">
            <div className="work-shot" data-state="on">
              <div className="work-shot-art is-shell" data-ss-wide data-ss-fill>
                <FileLands />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function HeroSection({ skyImage }: { skyImage?: string } = {}) {
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
      <div className="hero-top" ref={heroTopRef} data-sky={skyImage ? '' : undefined}>
        {skyImage ? (
          <img
            className="hero-sky"
            src={skyImage}
            alt=""
            width={1920}
            height={1080}
            decoding="async"
            fetchPriority="high"
          />
        ) : null}
        <div className="hero-glow" aria-hidden>
          <div className="hero-sun">
            <div className="hero-sun-core" />
          </div>
          <div className="hero-veil" />
        </div>
        <div className="hero-copy">
          <a className="hero-pill" href={subscribeUrl()}>
            <span className="hero-pill-mark">
              <img src={publicUrl('images/logo-round.svg')} alt="" width={26} height={26} />
            </span>
            <span>
              <b>14 day free trial.</b> No card needed
            </span>
            <ArrowRight className="arrow" weight="bold" />
          </a>
          <HeroTitle />
          <p>#1 travel agency management software in Bangladesh.</p>
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
