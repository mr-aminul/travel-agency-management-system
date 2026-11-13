import { useRef, type CSSProperties } from 'react'
import { ArrowsClockwise, Check, LinkSimple } from '@phosphor-icons/react'
import { publicUrl } from '@/lib/publicUrl'
import { clamp01, progressBetween, useFitScale, usePrefersReducedMotion, useScrollProgress } from './sceneHooks'

const STEPS = [
  {
    title: 'The usual desk',
    desc: 'Passports in a drawer, payments in Excel, status in a WhatsApp thread nobody can search.',
  },
  { title: 'One file per client', desc: 'Name, passport, service and stage sit together on one file.' },
  { title: 'Papers in place', desc: 'Upload each document once. See what is still missing at a glance.' },
  { title: 'Money on the file', desc: 'Advance, balance and due date sit beside the visa status.' },
  { title: 'A link for the client', desc: 'Clients open their own tracking page. Fewer calls to your desk.' },
] as const

/** Scroll progress at which each step becomes active. */
const STEP_MARKS = [0, 0.18, 0.4, 0.62, 0.84] as const

function activeStepAt(progress: number): number {
  let active = 0
  STEP_MARKS.forEach((mark, index) => {
    if (progress >= mark) active = index
  })
  return active
}

function UsualDesk() {
  return (
    <div className="nf-layer nf-slop">
      <div className="nf-sheet">
        <div className="nf-sheet-bar">
          <span>visa_clients_FINAL_v7.xlsx</span>
          <span>Sheet3</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Passport</th>
              <th>Country</th>
              <th>Paid</th>
              <th>Status??</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Nusrat</td>
              <td>A0...921</td>
              <td>Canada</td>
              <td className="hl">20000 (bkash?)</td>
              <td className="red">ASK EMBASSY</td>
            </tr>
            <tr>
              <td>arif chowdhury</td>
              <td>-</td>
              <td>JAPAN</td>
              <td>15k</td>
              <td className="grn">done?</td>
            </tr>
            <tr>
              <td>Mitu B</td>
              <td>B1..33</td>
              <td>malaysia</td>
              <td className="hl">due</td>
              <td>call back</td>
            </tr>
            <tr>
              <td>Kamal</td>
              <td className="red">#REF!</td>
              <td>Dubai</td>
              <td>4,00,000</td>
              <td>medical pending</td>
            </tr>
            <tr>
              <td>Rokeya</td>
              <td>C2...10</td>
              <td>S'pore</td>
              <td>???</td>
              <td className="red">LATE</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="nf-chat">
        <div className="nf-chat-head">
          Visa Team (Office)
          <small>Rafi, Sumi, Boss, +7</small>
        </div>
        <p className="nf-bubble">Nusrat apa er bank statement ki asche?</p>
        <p className="nf-bubble me">check the drawer</p>
        <p className="nf-bubble">client called 4 times today 😓</p>
        <p className="nf-bubble">who has Arif passport???</p>
        <p className="nf-bubble me">sheet e dekho</p>
      </div>
      <p className="nf-note">
        CALL ARIF!!
        <br />
        embassy date - Thu?
        <br />
        Kamal 2.9L due
      </p>
    </div>
  )
}

function OneTrackFile({ activeStep }: { activeStep: number }) {
  const shows = (step: number) => (activeStep >= step ? '' : undefined)

  return (
    <div className="nf-layer nf-calm">
      <div className="nf-top">
        <span className="pc-brand">
          <img src={publicUrl('images/logo.svg')} alt="" />
          OneTrack
        </span>
        <span className="nf-crumbs">Clients / Nusrat Jahan</span>
        <span className="pc-btn">Move to next stage</span>
      </div>
      <div className="nf-col nf-part" data-on={shows(1)}>
        <div className="nf-client">
          <span className="pc-avatar">NJ</span>
          <div>
            <h4>Nusrat Jahan</h4>
            <p>Canada · Student visa · OT-2468</p>
          </div>
        </div>
        <dl className="pc-kv">
          <div>
            <dt>Passport</dt>
            <dd>A0••••921</dd>
          </div>
          <div>
            <dt>Stage</dt>
            <dd>
              <span className="pc-chip blue">Documents</span>
            </dd>
          </div>
          <div>
            <dt>Embassy date</dt>
            <dd>Thu, 21 Nov</dd>
          </div>
        </dl>
        <div className="nf-pay nf-part" data-on={shows(3)}>
          <div className="nf-pay-row">
            <span>Advance</span>
            <b>৳20,000</b>
          </div>
          <div className="nf-pay-row">
            <span>Balance due 25 Nov</span>
            <b>৳45,000</b>
          </div>
          <div className="pc-bar">
            <i style={{ width: '31%' }} />
          </div>
        </div>
      </div>
      <div className="nf-doc nf-part" data-on={shows(2)}>
        <h4>
          Documents <span>4 of 5</span>
        </h4>
        <ul>
          {['Passport', 'National ID', 'Offer letter', 'Photo'].map((label) => (
            <li key={label} className="done">
              <span className="nf-check">
                <Check weight="bold" />
              </span>
              {label}
              <span className="pc-chip ok">Received</span>
            </li>
          ))}
          <li>
            <span className="nf-check" />
            Bank statement
            <span className="pc-chip fail">Missing</span>
          </li>
        </ul>
      </div>
      <div className="nf-link nf-part" data-on={shows(4)}>
        <span className="nf-link-icon">
          <LinkSimple weight="bold" />
        </span>
        <span>
          Tracking link sent by SMS
          <span className="nf-link-sub">Client opens on phone</span>
        </span>
        <span className="pc-chip ok">Opened</span>
      </div>
    </div>
  )
}

export function BeforeAfter() {
  const sceneRef = useRef<HTMLElement>(null)
  const screenRef = useRef<HTMLDivElement>(null)
  const isLive = !usePrefersReducedMotion()
  const progress = useScrollProgress(sceneRef, isLive)
  useFitScale(screenRef, 880)

  const activeStep = isLive ? activeStepAt(progress) : STEPS.length - 1
  const reveal = progressBetween(progress, 0.1, 0.24)
  const screenStyle = {
    '--ring-r': `${clamp01(reveal * 1.15) * 80}%`,
    '--calm-r': `${reveal * 80}%`,
  } as CSSProperties

  const railFill = (index: number) => {
    const start = STEP_MARKS[index]
    const end = STEP_MARKS[index + 1] ?? 1
    return progressBetween(progress, start, end)
  }

  const scrollToStep = (index: number) => {
    const scene = sceneRef.current
    if (!scene || !isLive) return
    const range = scene.offsetHeight - window.innerHeight
    window.scrollTo({ top: scene.offsetTop + range * (STEP_MARKS[index] + 0.02), behavior: 'smooth' })
  }

  return (
    <section
      className={isLive ? 'scene showcase is-live' : 'scene showcase'}
      aria-labelledby="ba-title"
      ref={sceneRef}
      style={{ '--hold': 3 } as CSSProperties}
    >
      <div className="scene-stage ba-stage">
        <div className="ba-grid">
          <div className="ba-side">
            <header className="section-head">
              <p className="eyebrow">
                <ArrowsClockwise weight="bold" />
                Before and after
              </p>
              <h2 id="ba-title">From scattered to settled.</h2>
              <p>The same client file, before OneTrack and after.</p>
            </header>
            <ol className="ba-steps">
              {STEPS.map((step, index) => (
                <li key={step.title} className="ba-step" data-on={index === activeStep ? '' : undefined}>
                  <span className="ba-rail" aria-hidden>
                    <i style={{ '--fill': railFill(index) } as CSSProperties} />
                  </span>
                  <button type="button" onClick={() => scrollToStep(index)}>
                    <span className="ba-title">{step.title}</span>
                    <span className="ba-desc">
                      <span>{step.desc}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </div>
          <div className="ba-frame">
            <div className="ba-screen" ref={screenRef} style={screenStyle}>
              <div className="nf">
                <UsualDesk />
                <div className="nf-layer nf-ring" />
                <OneTrackFile activeStep={activeStep} />
              </div>
            </div>
            <span className="ba-chip" aria-live="polite">
              <b aria-hidden={activeStep !== 0}>Before</b>
              <b aria-hidden={activeStep === 0}>OneTrack</b>
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
