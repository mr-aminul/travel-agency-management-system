import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Check, ImageSquare, MagnifyingGlass, Sparkle } from '@phosphor-icons/react'
import { publicUrl } from '@/lib/publicUrl'
import { useInView } from './sceneHooks'

function FxArt({ children }: { children: ReactNode }) {
  return (
    <div className="feature-art">
      <div className="fx" aria-hidden>
        <span className="fx-bg" />
        <span className="fx-glow" />
        <span className="fx-rings">
          <span className="fx-ring" />
          <span className="fx-ring fx-ring-2" />
        </span>
        <span className="fx-line fx-t" />
        <span className="fx-line fx-b" />
        <span className="fx-line fx-l" />
        <span className="fx-line fx-r" />
        <span className="fx-mark fx-m1" />
        <span className="fx-mark fx-m2" />
        <span className="fx-mark fx-m3" />
        <span className="fx-mark fx-m4" />
      </div>
      <div className="feat-float">
        <span className="fx-sheet fx-s2" aria-hidden />
        <span className="fx-sheet fx-s1" aria-hidden />
        {children}
      </div>
    </div>
  )
}

const SEARCH_QUERY = 'Nusrat Jahan'

const DOCUMENT_ROWS = [
  { title: 'Passport, bio page', meta: 'Uploaded 9 Nov · Sylhet desk', image: 'images/landing/doc-passport-bio.png', isReceived: true },
  { title: 'National ID, front', meta: 'Uploaded 9 Nov · Sylhet desk', image: 'images/landing/doc-nid-front.png', isReceived: true },
  { title: 'Bank statement', meta: 'Asked by SMS on 10 Nov', image: null, isReceived: false },
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
              <span className="fs-meta">{row.meta}</span>
            </span>
            {row.isReceived ? <span className="chip ok">Received</span> : <span className="chip fail">Missing</span>}
          </div>
        ))}
      </div>
      <div className="frag-foot">
        <span>2 of 3 received</span>
        <span className="frag-ok">
          <Check weight="bold" />
          Client reminded
        </span>
      </div>
    </div>
  )
}

const STATUS_ROWS = [
  { code: 'OT-2463', note: 'Japan · submitted to embassy' },
  { code: 'OT-2459', note: 'UK · biometrics booked' },
  { code: 'OT-2451', note: 'Umrah · visa approved' },
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
        <span className="frag-bar-note">SMS + link</span>
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
      <div className="frag-foot">
        <span>
          {sentCount} of {STATUS_ROWS.length} clients told
        </span>
        <span className="frag-ok">
          <Check weight="bold" />
          No calls needed
        </span>
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
          <b>৳3,83,000</b>
          <em>+12%</em>
        </div>
        <div className="fa-kpi">
          <span>Still due</span>
          <b>৳1,40,500</b>
          <em className="is-due">6 files</em>
        </div>
        <div className="fa-kpi">
          <span>Invoices</span>
          <b>19</b>
          <em>sent</em>
        </div>
      </div>
      <div className="fa-chart">
        <div className="fa-head">Collected per day, in thousand Taka</div>
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
    look: '',
    label: 'Documents',
    title: 'See which papers are still missing.',
    body: 'Every passport, NID and statement sits on the client file. Missing ones stand out before the embassy date.',
    meta: 'Passport, NID, bank statement',
    frag: <DocumentsFrag />,
  },
  {
    id: 'status',
    look: 'flip is-dark',
    label: 'Client updates',
    title: 'Clients see their stage without calling.',
    body: 'Move a file forward and the client gets an SMS with a tracking link. Your phone rings less.',
    meta: 'SMS tracking link',
    frag: <StatusFrag />,
  },
  {
    id: 'payments',
    look: 'is-dawn',
    label: 'Payments',
    title: 'Know who paid and who still owes.',
    body: 'Advance, balance and due date live next to the visa status. Send an invoice from the same screen.',
    meta: 'Advance, balance, invoice',
    frag: <PaymentsFrag />,
  },
] as const

export function FeatureCards() {
  return (
    <section className="section wrap-wide" id="features" aria-labelledby="features-title">
      <header className="section-head" data-enter>
        <p className="eyebrow">
          <Sparkle weight="fill" />
          Features
        </p>
        <h2 id="features-title">Built for the way agencies work.</h2>
        <p>Three things every desk chases each day, handled on the file itself.</p>
      </header>
      <div className="feats">
        {FEATURES.map((feature) => (
          <article key={feature.id} className={`feature ${feature.look}`.trim()} data-enter>
            <FxArt>{feature.frag}</FxArt>
            <div className="feature-copy">
              <span className="feat-label">{feature.label}</span>
              <h3>{feature.title}</h3>
              <p>{feature.body}</p>
              <span className="feat-meta">{feature.meta}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
