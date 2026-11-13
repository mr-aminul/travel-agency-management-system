import { useRef, useState, type ReactNode } from 'react'
import { Check, LinkSimple } from '@phosphor-icons/react'
import { publicUrl } from '@/lib/publicUrl'
import { useFitScale } from './sceneHooks'

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
              <td>Rafiq</td>
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
        <p className="nf-bubble">Rafiq bhai er bank statement ki asche?</p>
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

function OneTrackFile() {
  return (
    <div className="nf-layer nf-calm" data-on="">
      <div className="nf-top">
        <span className="pc-brand">
          <img src={publicUrl('images/logo.svg')} alt="" />
          OneTrack
        </span>
        <span className="nf-crumbs">Clients / Rafiq Hasan</span>
        <span className="pc-btn">Move to next stage</span>
      </div>
      <div className="nf-col nf-part" data-on="">
        <div className="nf-client">
          <span className="pc-avatar">RH</span>
          <div>
            <h4>Rafiq Hasan</h4>
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
        <div className="nf-pay nf-part" data-on="">
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
      <div className="nf-doc nf-part" data-on="">
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
      <div className="nf-link nf-part" data-on="">
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

function CompareScreen({
  label,
  tone,
  children,
}: {
  label: string
  tone: 'before' | 'after'
  children: ReactNode
}) {
  const screenRef = useRef<HTMLDivElement>(null)
  useFitScale(screenRef, 880)

  return (
    <figure className={`compare-panel is-${tone}`}>
      <figcaption>{label}</figcaption>
      <div className="compare-screen" ref={screenRef}>
        <div className="nf">{children}</div>
      </div>
    </figure>
  )
}

/**
 * Side-by-side desk comparison — no scroll lock, no step list.
 * Mobile swaps with a segmented control.
 */
export function BeforeAfter() {
  const [view, setView] = useState<'before' | 'after'>('before')

  return (
    <section className="section wrap-wide compare" id="compare" aria-labelledby="compare-title" data-enter>
      <header className="section-head">
        <h2 id="compare-title">From scattered to settled</h2>
      </header>

      <div className="tabs compare-tabs" role="tablist" aria-label="Desk view">
        <button
          type="button"
          role="tab"
          className="tab"
          aria-selected={view === 'before'}
          onClick={() => setView('before')}
        >
          Usual desk
        </button>
        <button
          type="button"
          role="tab"
          className="tab"
          aria-selected={view === 'after'}
          onClick={() => setView('after')}
        >
          OneTrack
        </button>
      </div>

      <div className="compare-panels" data-view={view}>
        <CompareScreen label="Usual desk" tone="before">
          <UsualDesk />
        </CompareScreen>
        <CompareScreen label="OneTrack" tone="after">
          <OneTrackFile />
        </CompareScreen>
      </div>
    </section>
  )
}
