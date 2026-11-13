import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Check, ImageSquare, MagnifyingGlass } from '@phosphor-icons/react'
import { publicUrl } from '@/lib/publicUrl'
import { useInView, usePrefersReducedMotion } from './sceneHooks'

const FEATURE_AUTO_MS = 4200
const FEATURE_RESUME_MS = 5200

function FeatureArt({ children }: { children: ReactNode }) {
  return <div className="feature-art">{children}</div>
}

const SEARCH_QUERY = 'Rafiq Hasan'

const DOCUMENT_ROWS = [
  { title: 'Passport', image: 'images/landing/doc-passport-bio.png', isReceived: true },
  { title: 'National ID', image: 'images/landing/doc-nid-front.png', isReceived: true },
  { title: 'Bank statement', image: null, isReceived: false },
] as const

function useTypedText(text: string, isActive: boolean): string {
  const [length, setLength] = useState(0)

  useEffect(() => {
    if (!isActive || length >= text.length) return
    const timer = window.setTimeout(() => setLength((count) => count + 1), length === 0 ? 500 : 70)
    return () => window.clearTimeout(timer)
  }, [isActive, length, text])

  return text.slice(0, length)
}

function DocumentsFrag() {
  const fragRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(fragRef, '0px 0px -20% 0px')
  const typed = useTypedText(SEARCH_QUERY, isInView)

  return (
    <div className="frag" ref={fragRef}>
      <div className="frag-bar">
        <span>Documents</span>
        <code>OT-2468</code>
      </div>
      <div className="fs-search">
        <MagnifyingGlass weight="bold" />
        <span>
          {typed}
          <span className="fs-caret" />
        </span>
      </div>
      <div className="fs-body">
        {DOCUMENT_ROWS.map((row) => (
          <div key={row.title} className="fs-row">
            {row.image ? (
              <span className="fs-thumb">
                <img src={publicUrl(row.image)} alt="" loading="lazy" />
              </span>
            ) : (
              <span className="fs-thumb is-empty">
                <ImageSquare />
              </span>
            )}
            <span className="fs-text">
              <span className="fs-title">{row.title}</span>
            </span>
            {row.isReceived ? <span className="chip ok">Received</span> : <span className="chip fail">Missing</span>}
          </div>
        ))}
      </div>
    </div>
  )
}

const STATUS_ROWS = [
  { code: 'OT-2463', note: 'Japan' },
  { code: 'OT-2459', note: 'UK' },
  { code: 'OT-2451', note: 'Umrah' },
] as const

function StatusFrag() {
  const fragRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(fragRef, '0px 0px -20% 0px')
  const [sentCount, setSentCount] = useState(0)

  useEffect(() => {
    if (!isInView || sentCount >= STATUS_ROWS.length) return
    const timer = window.setTimeout(() => setSentCount((count) => count + 1), sentCount === 0 ? 700 : 520)
    return () => window.clearTimeout(timer)
  }, [isInView, sentCount])

  return (
    <div className="frag" ref={fragRef}>
      <div className="frag-bar">
        <span>Status updates</span>
        <span className="frag-bar-note">SMS</span>
      </div>
      <div className="fi-body">
        {STATUS_ROWS.map((row, index) => (
          <div key={row.code} className="fi-row" data-fixed={index < sentCount ? '' : undefined}>
            <span>
              <span className="fi-id">
                <code>{row.code}</code>
              </span>
              <span className="fi-note">{row.note}</span>
            </span>
            <span className="fi-chip">
              <span className="chip warn fi-was">Not told</span>
              <span className="chip ok fi-fixed">
                <Check weight="bold" />
                Sent
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

const WEEK = [
  { day: 'Sat', amount: 38 },
  { day: 'Sun', amount: 62 },
  { day: 'Mon', amount: 47 },
  { day: 'Tue', amount: 88 },
  { day: 'Wed', amount: 55 },
  { day: 'Thu', amount: 71 },
  { day: 'Fri', amount: 22 },
] as const

const WEEK_MAX = Math.max(...WEEK.map((entry) => entry.amount))
const WEEK_AVERAGE = WEEK.reduce((sum, entry) => sum + entry.amount, 0) / WEEK.length

function PaymentsFrag() {
  const hotDay = WEEK.findIndex((entry) => entry.amount === WEEK_MAX)

  return (
    <div className="frag">
      <div className="frag-bar">
        <span>Payments</span>
        <span className="frag-bar-note">This week</span>
      </div>
      <div className="fa-kpis">
        <div className="fa-kpi">
          <span>Collected</span>
          <b>৳3.83L</b>
        </div>
        <div className="fa-kpi">
          <span>Still due</span>
          <b>৳1.41L</b>
        </div>
        <div className="fa-kpi">
          <span>Invoices</span>
          <b>19</b>
        </div>
      </div>
      <div className="fa-chart">
        <div className="fa-plot">
          <span className="fa-avg" style={{ bottom: `${(WEEK_AVERAGE / WEEK_MAX) * 100}%` }}>
            <span>avg</span>
          </span>
          {WEEK.map((entry, index) => (
            <span
              key={entry.day}
              className={index === hotDay ? 'fa-col is-hot' : 'fa-col'}
              style={{ '--h': `${(entry.amount / WEEK_MAX) * 100}%`, '--k': index } as CSSProperties}
            >
              <i />
              {index === hotDay ? (
                <span className="fa-tip">
                  <span>৳{entry.amount}k</span>
                </span>
              ) : null}
            </span>
          ))}
        </div>
      </div>
      <div className="fa-axis">
        {WEEK.map((entry) => (
          <span key={entry.day}>{entry.day}</span>
        ))}
      </div>
    </div>
  )
}

const FEATURES = [
  {
    id: 'documents',
    label: 'Documents',
    title: 'See which papers are still missing.',
    frag: <DocumentsFrag />,
  },
  {
    id: 'status',
    label: 'Client updates',
    title: 'Clients check status themselves.',
    frag: <StatusFrag />,
  },
  {
    id: 'payments',
    label: 'Payments',
    title: 'See who paid and what is due.',
    frag: <PaymentsFrag />,
  },
] as const

function isCarouselMode(track: HTMLElement) {
  return track.scrollWidth > track.clientWidth + 8
}

export function FeatureCards() {
  const trackRef = useRef<HTMLDivElement>(null)
  const sectionRef = useRef<HTMLElement>(null)
  const activeRef = useRef(0)
  const pausedUntilRef = useRef(0)
  const [active, setActive] = useState(0)
  const reducedMotion = usePrefersReducedMotion()
  const isInView = useInView(sectionRef, '0px 0px -15% 0px')

  const goTo = (index: number, behavior: ScrollBehavior = 'smooth') => {
    const track = trackRef.current
    if (!track || !isCarouselMode(track)) return
    const cards = track.querySelectorAll<HTMLElement>('.feature')
    const card = cards[index]
    if (!card) return
    const left = card.offsetLeft - (track.clientWidth - card.offsetWidth) / 2
    track.scrollTo({ left: Math.max(0, left), behavior })
  }

  useEffect(() => {
    const track = trackRef.current
    if (!track) return

    const syncActive = () => {
      const cards = [...track.querySelectorAll<HTMLElement>('.feature')]
      if (!cards.length) return
      const mid = track.scrollLeft + track.clientWidth / 2
      let best = 0
      let bestDist = Infinity
      cards.forEach((card, index) => {
        const center = card.offsetLeft + card.offsetWidth / 2
        const dist = Math.abs(center - mid)
        if (dist < bestDist) {
          bestDist = dist
          best = index
        }
      })
      activeRef.current = best
      setActive(best)
    }

    const pauseAuto = () => {
      pausedUntilRef.current = Date.now() + FEATURE_RESUME_MS
    }

    syncActive()
    track.addEventListener('scroll', syncActive, { passive: true })
    track.addEventListener('pointerdown', pauseAuto, { passive: true })
    track.addEventListener('touchstart', pauseAuto, { passive: true })
    track.addEventListener('wheel', pauseAuto, { passive: true })
    window.addEventListener('resize', syncActive)
    return () => {
      track.removeEventListener('scroll', syncActive)
      track.removeEventListener('pointerdown', pauseAuto)
      track.removeEventListener('touchstart', pauseAuto)
      track.removeEventListener('wheel', pauseAuto)
      window.removeEventListener('resize', syncActive)
    }
  }, [])

  useEffect(() => {
    if (reducedMotion || !isInView) return

    const tick = () => {
      const track = trackRef.current
      if (!track || !isCarouselMode(track)) return
      if (Date.now() < pausedUntilRef.current) return
      const next = (activeRef.current + 1) % FEATURES.length
      goTo(next, 'smooth')
    }

    const timer = window.setInterval(tick, FEATURE_AUTO_MS)
    return () => window.clearInterval(timer)
  }, [reducedMotion, isInView])

  return (
    <section
      className="section wrap-wide"
      id="features"
      aria-labelledby="features-title"
      ref={sectionRef}
    >
      <header className="section-head" data-enter>
        <h2 id="features-title">Built for the way agencies work</h2>
      </header>
      <div className="feats is-compact" ref={trackRef} aria-roledescription="carousel">
        {FEATURES.map((feature) => (
          <article key={feature.id} className="feature" data-enter>
            <FeatureArt>{feature.frag}</FeatureArt>
            <div className="feature-copy">
              <span className="feat-label">{feature.label}</span>
              <h3>{feature.title}</h3>
            </div>
          </article>
        ))}
      </div>
      <div className="feats-dots" role="tablist" aria-label="Feature slides">
        {FEATURES.map((feature, index) => (
          <button
            key={feature.id}
            type="button"
            role="tab"
            className="feats-dot"
            aria-label={feature.label}
            aria-selected={index === active}
            data-active={index === active ? '' : undefined}
            onClick={() => {
              pausedUntilRef.current = Date.now() + FEATURE_RESUME_MS
              goTo(index, 'smooth')
            }}
          />
        ))}
      </div>
    </section>
  )
}
