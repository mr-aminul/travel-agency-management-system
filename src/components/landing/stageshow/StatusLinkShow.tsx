import { useCallback, useRef } from 'react'
import {
  ClipboardCheck,
  FileText,
  Handshake,
  Home,
  ListChecks,
  MessageSquare,
  Phone as PhoneIcon,
  PhoneMissed,
  Receipt,
  Share2,
  Upload,
  Users,
  Video,
  type LucideIcon,
} from 'lucide-react'
import { publicUrl } from '@/lib/publicUrl'
import type { Act } from './kit/act'
import type { Rect } from './kit/measure'
import { Stage } from './kit/stage'
import { Window, Bar } from './kit/window'
import { Phone } from './kit/phone'
import { Thread, Bubble, Stamp } from './kit/messages'
import { Avatar } from './kit/parts/Avatar'
import { Check } from './kit/parts/Check'
import { Badge } from './kit/controls/Badge'
import { Camera } from './kit/motion/Camera'
import { Count } from './kit/motion/Count'
import { Roll } from './kit/motion/Roll'
import './file-lands.css'
import './status-link-show.css'
import './file-feature-shows.css'

type DocState = 'done' | 'miss' | 'wait'

type ChipKind = 'nid' | 'bank' | null

type S = {
  call1: boolean
  msg2: boolean
  call2: boolean
  call3: boolean
  msg3: boolean
  alerts: number
  scrap: boolean
  cleared: boolean
  launch: boolean
  desk: boolean
  zoom: Rect | null
  nid: DocState
  bank: DocState
  gap: boolean
  lit: boolean
  /** Missing-docs panel → upload sheet open. */
  upload: boolean
  dropHot: boolean
  /** Which document is currently falling into the drop zone. */
  chip: ChipKind
  /** Fall animation finished; parked thumbnail can take over. */
  chipLand: boolean
  docsReady: boolean
  phone: boolean
  sms: boolean
  /** Invoice card expands inside the same SMS bubble. */
  invoice: boolean
  success: boolean
  /** After docs, the file flips to payments. */
  payments: boolean
  paid: number
  due: number
  advance: boolean
  second: boolean
  balance: boolean
  payLit: boolean
  /** Floating CTA on the empty stage (no app shell), like the OneTrack launch. */
  sendCta: boolean
  /** Green confirmation on the send CTA before the phone appears. */
  sent: boolean
}

const INITIAL: S = {
  call1: false,
  msg2: false,
  call2: false,
  call3: false,
  msg3: false,
  alerts: 1,
  scrap: false,
  cleared: false,
  launch: false,
  desk: false,
  zoom: null,
  nid: 'wait',
  bank: 'wait',
  gap: false,
  lit: false,
  upload: false,
  dropHot: false,
  chip: null,
  chipLand: false,
  docsReady: false,
  phone: false,
  sms: false,
  invoice: false,
  success: false,
  payments: false,
  paid: 0,
  due: 185000,
  advance: false,
  second: false,
  balance: false,
  payLit: false,
  sendCta: false,
  sent: false,
}

const POSTER: S = {
  ...INITIAL,
  call1: true,
  msg2: true,
  call2: true,
  call3: true,
  msg3: true,
  alerts: 6,
  cleared: true,
  desk: false,
  nid: 'done',
  bank: 'done',
  lit: true,
  docsReady: true,
  payments: true,
  paid: 120000,
  due: 65000,
  advance: true,
  second: true,
  balance: true,
  phone: true,
  sms: true,
  invoice: true,
  success: true,
}

/** Park near the action — long corner-to-corner flights look broken. */
const REST = { wide: { x: 520, y: 300 }, compact: { x: 170, y: 260 } }
const SMS_BODY =
  'Hi Rahim — your Canada student file is ready. Track status & docs anytime:'

const ALERT_PILE: { kind: 'msg' | 'call'; title: string; body: string }[] = [
  { kind: 'msg', title: 'Rahim Hossain', body: 'Bhai status?' },
  { kind: 'call', title: 'Missed voice call', body: 'Rahim Hossain' },
  { kind: 'msg', title: 'Rahim Hossain', body: 'Update diben?' },
  { kind: 'call', title: 'Missed voice call', body: 'Rahim Hossain' },
  { kind: 'call', title: 'Missed voice call', body: 'Rahim Hossain' },
  { kind: 'msg', title: 'Rahim Hossain', body: 'Missed your call. Status?' },
]

function taka(n: number) {
  return `৳${n.toLocaleString('en-IN')}`
}

/**
 * Camera language (keep it boring on purpose):
 * - Settle once on the client file through docs + payments
 * - Clear the app shell, then a floating send CTA (like the OneTrack launch)
 * - Phone only after that click — tracking + invoice in one SMS
 */
async function script(a: Act<S>, beat: (n: number) => void = () => {}) {
  beat(0)
  await a.move(a.layout === 'compact' ? REST.compact : REST.wide, { duration: 280 })
  await a.wait(420)
  await a.set({ call1: true, alerts: 2 })
  await a.wait(380)
  await a.set({ msg2: true, alerts: 3 })
  await a.wait(420)
  await a.set({ call2: true, alerts: 4 })
  await a.wait(360)
  await a.set({ call3: true, alerts: 5 })
  await a.wait(380)
  await a.set({ msg3: true, alerts: 6 })
  await a.wait(520)

  await a.set({ scrap: true })
  await a.wait(560)
  await a.set({ cleared: true, scrap: false, launch: true })
  beat(1)
  await a.wait(200)
  // Short hop onto the launch card (not a corner-to-center flight)
  await a.move({ at: 'ot-icon', x: 0.15, y: 1.35 }, { duration: 300 })
  await a.wait(160)
  await a.click({ at: 'ot-icon', x: 0.5, y: 0.5 })
  await a.wait(100)
  await a.set({ desk: true, launch: false })
  await a.wait(480)

  // One settle on the file — missing docs are already visible
  beat(2)
  const file = a.rect('sl-file', { layout: true })
  if (file.width > 0) {
    await a.set({
      zoom: file,
      lit: true,
      nid: 'miss',
      bank: 'miss',
      gap: true,
    })
    await a.wait(780)
  } else {
    await a.set({ lit: true, nid: 'miss', bank: 'miss', gap: true })
    await a.wait(420)
  }

  // Park beside upload, then click — short hop, not a full-stage flight
  await a.move({ at: 'sl-upload', x: -0.2, y: 0.5 }, { duration: 280 })
  await a.click({ at: 'sl-upload', x: 0.5, y: 0.5 })
  await a.set({ upload: true })
  await a.wait(360)

  // NID leaves the tray and drops into the zone
  await a.set({ chip: 'nid', chipLand: false, dropHot: true })
  await a.wait(480)
  await a.set({ chipLand: true })
  await a.wait(80)
  await a.set({ nid: 'done', chip: null, chipLand: false, dropHot: false })
  await a.wait(240)

  // Bank statement follows
  await a.set({ chip: 'bank', chipLand: false, dropHot: true })
  await a.wait(480)
  await a.set({ chipLand: true })
  await a.wait(80)
  await a.set({
    bank: 'done',
    chip: null,
    chipLand: false,
    dropHot: false,
    gap: false,
    docsReady: true,
  })
  await a.wait(280)
  await a.set({ upload: false })
  await a.wait(320)

  // Payments on the same file
  beat(3)
  await a.set({ payments: true })
  await a.wait(60)
  const filePay = a.rect('sl-file', { layout: true })
  if (filePay.width > 0) await a.set({ zoom: filePay })
  await a.wait(480)

  await a.set({ advance: true, paid: 50000, due: 135000 })
  await a.wait(360)
  await a.set({
    second: true,
    paid: 120000,
    due: 65000,
    payLit: true,
  })
  await a.wait(340)
  await a.set({ balance: true })
  await a.wait(720)

  // App shell clears — floating send CTA, like the OneTrack launch card
  await a.set({ zoom: null })
  await a.wait(240)
  await a.set({ desk: false })
  await a.wait(280)
  await a.set({ sendCta: true })
  beat(4)
  await a.move({ at: 'sl-send', x: 0.2, y: 1.2 }, { duration: 300 })
  await a.wait(360)
  await a.click({ at: 'sl-send', x: 0.5, y: 0.5 })
  await a.wait(80)
  await a.set({ sent: true })
  await a.wait(380)
  beat(5)
  await a.set({ phone: true })
  await a.wait(480)
  await a.set({ sms: true })
  await a.wait(300)
  await a.set({ invoice: true })
  await a.wait(380)
  await a.set({ success: true })
  await a.wait(1000)

  beat(0)
  await a.snap({
    call1: false,
    msg2: false,
    call2: false,
    call3: false,
    msg3: false,
    alerts: 1,
    scrap: false,
    cleared: false,
    launch: false,
    desk: false,
    zoom: null,
    nid: 'wait',
    bank: 'wait',
    gap: false,
    lit: false,
    upload: false,
    dropHot: false,
    chip: null,
    chipLand: false,
    docsReady: false,
    phone: false,
    sms: false,
    invoice: false,
    success: false,
    payments: false,
    paid: 0,
    due: 185000,
    advance: false,
    second: false,
    balance: false,
    payLit: false,
    sendCta: false,
    sent: false,
  })
  await a.wait(240)
}

const NAV: { label: string; icon: LucideIcon; active?: boolean; section?: string }[] = [
  { label: 'Home', icon: Home },
  { label: 'Clients', icon: Users, active: true, section: 'Work' },
  { label: 'Services', icon: ListChecks, section: 'Work' },
  { label: 'Documents', icon: FileText, section: 'Work' },
  { label: 'Sub Agents', icon: Handshake, section: 'Network' },
  { label: 'Approvals', icon: ClipboardCheck, section: 'Network' },
]

function ShellNav() {
  let section = ''
  return (
    <div className="fl-side">
      <div className="fl-brand">
        <img className="fl-brand__logo" src={publicUrl('images/logo.svg')} alt="" />
        <span className="fl-brand__text">
          <span className="fl-brand__name">OneTrack</span>
          <span className="fl-brand__sub">Travel Management System</span>
        </span>
      </div>
      <div className="fl-side__rule" />
      <nav className="fl-nav">
        {NAV.map((item) => {
          const showSection = item.section && item.section !== section
          if (item.section) section = item.section
          const Icon = item.icon
          return (
            <div key={item.label} className="fl-nav__entry">
              {showSection ? <div className="fl-nav__section">{item.section}</div> : null}
              <div className={`fl-nav__item${item.active ? ' is-active' : ''}`}>
                <span className="fl-nav__icon">
                  <Icon size={17} strokeWidth={1.75} />
                </span>
                {item.label}
              </div>
            </div>
          )
        })}
      </nav>
    </div>
  )
}

function QuietClient({ wide }: { wide: number }) {
  return (
    <div className="sl-quiet">
      <Avatar plain size={22} />
      <span className="sl-quiet__lines">
        <Bar w={wide} h={8} tone={5} />
        <Bar w={Math.round(wide * 0.55)} h={6} tone={4} />
      </span>
    </div>
  )
}

function DocRow({
  name,
  state,
  spotlight,
  target,
}: {
  name: string
  state: DocState
  spotlight?: boolean
  target?: string
}) {
  return (
    <li
      className={`sl-doc is-${state}`}
      data-gap={spotlight || undefined}
      data-target={target}
    >
      <span>{name}</span>
      <em>{state === 'done' ? 'In' : state === 'miss' ? 'Missing' : 'Waiting'}</em>
    </li>
  )
}

function MissedCall({ time }: { time: string }) {
  return (
    <div className="sl-missed">
      <span className="sl-missed__main">
        <PhoneMissed size={13} strokeWidth={2.4} />
        <span className="sl-missed__text">
          Missed voice call
          <em>Tap to call back</em>
        </span>
      </span>
      <span className="sl-missed__time">{time}</span>
    </div>
  )
}

export function StatusLinkShow({ onBeat }: { onBeat?: (beat: number) => void } = {}) {
  const beatRef = useRef(onBeat)
  beatRef.current = onBeat
  const run = useCallback((a: Act<S>) => script(a, (n) => beatRef.current?.(n)), [])

  return (
    <Stage<S>
      width={1100}
      height={600}
      compact={{ below: 520, width: 358, height: 520 }}
      initial={INITIAL}
      poster={POSTER}
      script={run}
      cursor={{ at: REST }}
      accent="#0c2d79"
      tokens={{
        '--ss-font': "'Geist Variable', Geist, system-ui, sans-serif",
        '--ss-canvas': 'transparent',
        '--ss-chrome': '#ffffff',
        '--ss-radius-window': '16px',
      }}
      className="sl ff"
    >
      {(s, _rect, layout) => (
        <>
          <div className="sl-desk" data-show={s.desk || undefined}>
            <Camera focus={s.zoom} max={1.28} pad={40} feather={0} duration={1400} ease="house">
              <Window className="sl-window" sidebar={<ShellNav />} sidebarWidth={228}>
                <div className="fl-page">
                  <div className="fl-topbar">
                    <Users size={18} strokeWidth={1.75} />
                    Clients
                  </div>
                  <div className="fl-canvas sl-canvas">
                    <aside className="sl-list" aria-hidden>
                      <p className="sl-list__label">Open files</p>
                      <QuietClient wide={96} />
                      <div className="sl-list__row is-active">
                        <Avatar name="Rahim Hossain" size={22} tone="accent" />
                        <span className="sl-list__who">
                          <b>Rahim Hossain</b>
                          <small>Student · CA</small>
                        </span>
                      </div>
                      <QuietClient wide={80} />
                      <QuietClient wide={100} />
                      <QuietClient wide={72} />
                      <QuietClient wide={88} />
                    </aside>

                    <article className="sl-file" data-target="sl-file">
                      <header className="sl-file__head">
                        <Avatar name="Rahim Hossain" size={36} tone="accent" />
                        <div className="sl-file__who">
                          <strong>Rahim Hossain</strong>
                          <span>A0••••4512 · Canada · Student visa</span>
                        </div>
                        <Badge
                          tone={
                            s.payLit
                              ? 'warning'
                              : s.docsReady
                                ? 'success'
                                : s.lit
                                  ? 'warning'
                                  : 'accent'
                          }
                        >
                          <Roll>
                            {s.payLit
                              ? 'Partly paid'
                              : s.docsReady
                                ? 'Docs ready'
                                : s.lit
                                  ? 'Docs pending'
                                  : 'Intake'}
                          </Roll>
                        </Badge>
                      </header>

                      {!s.payments ? (
                        <>
                          <div className="sl-file__grid">
                            <section className="sl-file__panel">
                              <p className="sl-file__label">Journey</p>
                              <ol className="sl-file__steps">
                                <li className={s.lit || s.docsReady ? 'is-done' : 'is-now'}>
                                  Intake
                                </li>
                                <li
                                  className={
                                    s.docsReady ? 'is-done' : s.lit ? 'is-now' : undefined
                                  }
                                >
                                  Documents
                                </li>
                                <li>Embassy</li>
                                <li>Decision</li>
                              </ol>
                            </section>

                            <section
                              className="sl-file__panel"
                              data-target="sl-docs"
                              data-gap={s.gap || undefined}
                            >
                              <p className="sl-file__label">Documents</p>
                              <ul className="sl-file__docs">
                                <DocRow name="Passport scan" state="done" />
                                <DocRow
                                  name="NID copy"
                                  state={s.nid}
                                  spotlight={s.gap && s.nid === 'miss'}
                                />
                                <DocRow
                                  name="Bank statement"
                                  state={s.bank}
                                  spotlight={s.gap && s.bank === 'miss'}
                                />
                                <DocRow name="Offer letter" state="wait" />
                              </ul>
                              <p className="ff-docs__note" data-show={s.gap || undefined}>
                                2 documents still block embassy
                              </p>
                            </section>
                          </div>

                          <footer className="sl-file__foot">
                            {!s.docsReady ? (
                              <span
                                className="sl-file__link"
                                data-target="sl-upload"
                                data-cursor="pointer"
                              >
                                <Upload size={14} strokeWidth={2.25} />
                                Upload missing docs
                              </span>
                            ) : (
                              <span className="sl-file__link" data-sent="">
                                <Check on size={14} />
                                Docs ready
                              </span>
                            )}
                          </footer>
                        </>
                      ) : (
                        <div
                          className="ff-pay"
                          data-target="sl-pay"
                          data-lit={s.payLit || undefined}
                        >
                          <dl className="ff-pay__sums">
                            <div>
                              <dt>Total</dt>
                              <dd>৳1,85,000</dd>
                            </div>
                            <div>
                              <dt>Paid</dt>
                              <dd>
                                <Count value={s.paid} format={taka} duration={720} />
                              </dd>
                            </div>
                            <div className="is-due" data-pulse={s.balance || undefined}>
                              <dt>Due</dt>
                              <dd>
                                <Count value={s.due} format={taka} duration={720} />
                              </dd>
                            </div>
                          </dl>

                          <div className="ff-pay__bar" aria-hidden>
                            <span
                              style={{
                                width: `${Math.max(0, Math.min(100, Math.round((s.paid / 185000) * 100)))}%`,
                              }}
                            />
                            <em>
                              {Math.max(0, Math.min(100, Math.round((s.paid / 185000) * 100)))}%
                            </em>
                          </div>

                          <ul className="ff-pay__ledger">
                            <li data-show={s.advance || undefined}>
                              <span>
                                <Receipt size={13} strokeWidth={2.25} />
                                Advance · 02 Oct
                              </span>
                              <b>৳50,000</b>
                            </li>
                            <li data-show={s.second || undefined}>
                              <span>
                                <Receipt size={13} strokeWidth={2.25} />
                                Second payment · 09 Oct
                              </span>
                              <b>৳70,000</b>
                            </li>
                            <li className="is-due" data-show={s.balance || undefined}>
                              <span>Balance · due 20 Oct</span>
                              <b>৳65,000</b>
                            </li>
                          </ul>
                        </div>
                      )}
                    </article>
                  </div>
                </div>
              </Window>

              <div
                className="sl-upload-veil"
                data-show={s.upload || undefined}
                aria-hidden
              />

              <div
                className="sl-upload"
                data-show={s.upload || undefined}
                aria-hidden={!s.upload}
              >
                <header className="sl-upload__head">
                  <Upload size={16} strokeWidth={2.25} />
                  <div>
                    <strong>Upload missing docs</strong>
                    <span>Rahim Hossain · Student visa</span>
                  </div>
                </header>

                <div className="sl-upload__board">
                  <div className="sl-upload__tray" aria-hidden>
                    <figure
                      className="sl-upload__doc is-nid"
                      data-wait={s.nid !== 'done' && s.chip !== 'nid' ? '' : undefined}
                    >
                      <img
                        src={publicUrl('images/landing/doc-nid-front.png')}
                        alt=""
                        width={120}
                        height={74}
                      />
                      <figcaption>NID copy</figcaption>
                    </figure>
                    <figure
                      className="sl-upload__doc is-bank"
                      data-wait={s.bank !== 'done' && s.chip !== 'bank' ? '' : undefined}
                    >
                      <div className="sl-upload__bank">
                        <strong>Prime Bank</strong>
                        <span>Statement · Sep 2025</span>
                        <i />
                        <i />
                        <i />
                      </div>
                      <figcaption>Bank statement</figcaption>
                    </figure>
                  </div>

                  <div
                    className="sl-upload__drop"
                    data-target="sl-drop"
                    data-hot={s.dropHot || undefined}
                  >
                    {s.chip ? (
                      <figure
                        className={`sl-upload__flying is-${s.chip}`}
                        data-land={s.chipLand || undefined}
                      >
                        {s.chip === 'nid' ? (
                          <img
                            src={publicUrl('images/landing/doc-nid-front.png')}
                            alt=""
                            width={140}
                            height={86}
                          />
                        ) : (
                          <div className="sl-upload__bank is-lg">
                            <strong>Prime Bank</strong>
                            <span>Statement · Sep 2025</span>
                            <i />
                            <i />
                            <i />
                          </div>
                        )}
                      </figure>
                    ) : null}

                    {s.nid === 'done' ? (
                      <figure className="sl-upload__parked is-nid">
                        <img
                          src={publicUrl('images/landing/doc-nid-front.png')}
                          alt=""
                          width={72}
                          height={44}
                        />
                        <figcaption>
                          <Check on size={10} />
                          NID
                        </figcaption>
                      </figure>
                    ) : null}
                    {s.bank === 'done' ? (
                      <figure className="sl-upload__parked is-bank">
                        <div className="sl-upload__bank is-sm">
                          <strong>Prime Bank</strong>
                          <i />
                          <i />
                        </div>
                        <figcaption>
                          <Check on size={10} />
                          Bank
                        </figcaption>
                      </figure>
                    ) : null}

                    {s.nid !== 'done' && s.bank !== 'done' && !s.chip ? (
                      <p className="sl-upload__hint">Drop documents here</p>
                    ) : null}
                  </div>
                </div>
              </div>
            </Camera>
          </div>

          <div className="sl-phone" data-show={s.phone || undefined}>
            <Phone width={layout === 'compact' ? 198 : 232} className="sl-phone__device">
              <div className="sl-sms">
                <header className="sl-sms__head">
                  <Avatar name="OneTrack" tone="accent" size={36} />
                  <div className="sl-sms__who">
                    <strong>OneTrack</strong>
                    <span>SMS</span>
                  </div>
                </header>
                <Thread app="sms" className="sl-sms__thread">
                  <Stamp>Today 2:41 PM</Stamp>
                  {s.sms ? (
                    <Bubble from="them" className="sl-sms__rich">
                      <span className="sl-sms__copy">{SMS_BODY}</span>
                      <a className="sl-sms__link" href="#track" tabIndex={-1}>
                        onetrack.app/t/r8k2
                      </a>
                      {s.invoice ? (
                        <div className="sl-invoice" data-enter="">
                          <header className="sl-invoice__head">
                            <img
                              src={publicUrl('images/logo.svg')}
                              alt=""
                              width={18}
                              height={18}
                            />
                            <strong>Invoice</strong>
                            <em>INV-2041</em>
                          </header>
                          <p className="sl-invoice__who">Rahim Hossain · Student visa</p>
                          <dl className="sl-invoice__sums">
                            <div>
                              <dt>Paid</dt>
                              <dd>৳1,20,000</dd>
                            </div>
                            <div className="is-due">
                              <dt>Due</dt>
                              <dd>৳65,000</dd>
                            </div>
                          </dl>
                          <span className="sl-invoice__track">
                            <MessageSquare size={11} strokeWidth={2.25} />
                            Open tracking
                          </span>
                        </div>
                      ) : null}
                    </Bubble>
                  ) : null}
                </Thread>
              </div>
            </Phone>

            <div
              className="sl-success"
              data-show={s.success || undefined}
              aria-hidden={!s.success}
            >
              <span className="sl-success__ring" />
              <span className="sl-success__ring sl-success__ring--late" />
              <span className="sl-success__ring sl-success__ring--last" />
              {Array.from({ length: 8 }, (_, i) => (
                <span
                  key={i}
                  className="sl-success__spark"
                  data-small={i % 2 === 1 || undefined}
                  style={{ ['--sl-spark' as string]: String(i) }}
                />
              ))}
              <Check on={s.success} size={44} className="sl-success__check" />
              <span className="sl-success__label">Delivered</span>
            </div>
          </div>

          <aside
            className="sl-chat"
            data-scrap={s.scrap || undefined}
            data-gone={s.cleared || s.desk || undefined}
            aria-hidden={s.cleared || s.desk || undefined}
          >
            <div className="sl-chat__stage">
              <div className="sl-chat__card">
                <header className="sl-chat__head">
                  <span className="sl-chat__avatar">
                    <Avatar name="Rahim Hossain" size={34} tone="person" />
                    <span
                      className="sl-chat__badge"
                      key={s.alerts}
                      data-hot={s.alerts >= 4 || undefined}
                      data-count={s.alerts}
                    >
                      {s.alerts}
                    </span>
                  </span>
                  <div className="sl-chat__who">
                    <strong>Rahim Hossain</strong>
                    <em>online</em>
                  </div>
                  <span className="sl-chat__actions" aria-hidden>
                    <Video size={17} strokeWidth={1.9} />
                    <PhoneIcon size={16} strokeWidth={1.9} />
                  </span>
                </header>
                <Thread app="sms" className="sl-thread">
                  <Bubble from="them">Bhai status?</Bubble>
                  {s.call1 ? <MissedCall time="10:14 AM" /> : null}
                  {s.msg2 ? <Bubble from="them">Update diben?</Bubble> : null}
                  {s.call2 ? <MissedCall time="11:02 AM" /> : null}
                  {s.call3 ? <MissedCall time="1:40 PM" /> : null}
                  {s.msg3 ? <Bubble from="them">Missed your call. Status?</Bubble> : null}
                </Thread>
              </div>

              <div className="sl-pile" aria-hidden>
                {ALERT_PILE.map((alert, index) => {
                  const shown = index < s.alerts
                  const depth = Math.max(0, s.alerts - 1 - index)
                  return (
                    <div
                      key={`${alert.kind}-${index}`}
                      className="sl-pile__card"
                      data-kind={alert.kind}
                      data-in={shown || undefined}
                      data-top={(shown && depth === 0) || undefined}
                      style={{
                        ['--sl-depth' as string]: String(depth),
                        zIndex: index + 1,
                      }}
                    >
                      <span className="sl-pile__icon">
                        {alert.kind === 'call' ? (
                          <PhoneMissed size={14} strokeWidth={2.25} />
                        ) : (
                          <MessageSquare size={14} strokeWidth={2.25} />
                        )}
                      </span>
                      <span className="sl-pile__copy">
                        <strong>{alert.title}</strong>
                        <em>{alert.body}</em>
                      </span>
                      {shown && depth === 0 ? (
                        <span
                          className="sl-pile__ball"
                          data-hot={s.alerts >= 4 || undefined}
                        >
                          {s.alerts}
                        </span>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </div>
          </aside>

          <button
            type="button"
            className="sl-launch"
            data-show={s.launch || undefined}
            data-target="ot-icon"
            data-cursor="pointer"
            aria-label="Open OneTrack"
            tabIndex={-1}
            aria-hidden={!s.launch}
          >
            <span className="sl-launch__icon">
              <img src={publicUrl('images/logo.svg')} alt="" />
            </span>
            <span className="sl-launch__name">OneTrack</span>
          </button>

          <button
            type="button"
            className="sl-send"
            data-show={s.sendCta || undefined}
            data-sent={s.sent || undefined}
            data-target="sl-send"
            data-cursor="pointer"
            aria-label="Share link and invoice"
            tabIndex={-1}
            aria-hidden={!s.sendCta}
          >
            {s.sent ? (
              <>
                <Check on size={14} />
                Sent via SMS
              </>
            ) : (
              <>
                <Share2 size={14} strokeWidth={2.25} />
                Share link and invoice
              </>
            )}
          </button>
        </>
      )}
    </Stage>
  )
}
