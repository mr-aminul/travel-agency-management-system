import type { ReactNode } from 'react'
import {
  ClipboardCheck,
  FileText,
  Handshake,
  Home,
  ListChecks,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { publicUrl } from '@/lib/publicUrl'
import type { Act } from './kit/act'
import { Stage } from './kit/stage'
import type { Point } from './kit/measure'
import { Bar, Window } from './kit/window'
import { Avatar } from './kit/parts/Avatar'
import { Badge } from './kit/controls/Badge'
import { Count } from './kit/motion/Count'
import { Roll } from './kit/motion/Roll'
import './file-lands.css'

type Col = 'intake' | 'docs'

type S = {
  col: Col
  lifted: boolean
  at: Point | null
  over: Col | null
  intake: number
  docs: number
}

const INITIAL: S = { col: 'intake', lifted: false, at: null, over: null, intake: 18, docs: 32 }
const POSTER: S = { col: 'docs', lifted: false, at: null, over: null, intake: 17, docs: 33 }
const REST = { wide: { x: 28, y: 150 }, compact: { x: 20, y: 8 } }
const CARD_H = 82

const landOf = (col: Col) => (col === 'intake' ? 'land-intake' : 'land-docs')

async function carry(a: Act<S>, from: Col, to: Col) {
  const origin = a.rect(landOf(from))
  const grab = { x: origin.x + 36, y: origin.y + 28 }
  await a.move(grab)
  await a.wait(140)
  const dest = a.rect(landOf(to))
  await a.drag(
    { x: dest.x + (grab.x - origin.x), y: dest.y + (grab.y - origin.y) },
    (p) => {
      const at = { x: p.x - (grab.x - origin.x), y: p.y - (grab.y - origin.y) }
      const intake = a.rect('col-intake')
      const over: Col = at.x + origin.width / 2 >= intake.x + intake.width ? 'docs' : 'intake'
      a.put({ lifted: true, at, over })
    },
    { duration: from === 'intake' ? 1100 : 760 },
  )
  await a.set({ lifted: false, at: null, over: null, col: to })
  await a.wait(160)
  await a.set(to === 'docs' ? { intake: 17, docs: 33 } : { intake: 18, docs: 32 })
}

async function script(a: Act<S>) {
  await a.wait(700)
  await carry(a, 'intake', 'docs')
  await a.wait(1600)
  await carry(a, 'docs', 'intake')
  await a.move(a.layout === 'compact' ? REST.compact : REST.wide)
  await a.wait(420)
}

function Quiet() {
  return (
    <div className="fl-quiet">
      <Avatar plain size={22} />
      <span className="fl-quiet__lines">
        <Bar w={78} h={8} tone={5} />
        <Bar w={48} h={6} tone={4} />
      </span>
    </div>
  )
}

function Person({ name, detail }: { name: string; detail: string }) {
  return (
    <div className="fl-quiet">
      <Avatar name={name} size={22} />
      <span className="fl-quiet__lines">
        <span className="fl-quiet__name">{name}</span>
        <span className="fl-quiet__meta">{detail}</span>
      </span>
    </div>
  )
}

function Column({
  id,
  title,
  count,
  open,
  slot,
  children,
}: {
  id: string
  title: string
  count: number
  open?: boolean
  slot?: boolean
  children: ReactNode
}) {
  return (
    <section className="fl-col" data-target={`col-${id}`}>
      <header className="fl-col__head">
        <span>{title}</span>
        <span className="fl-count">
          <Count value={count} />
        </span>
      </header>
      {slot && (
        <>
          <div className="fl-land" data-target={`land-${id}`} />
          <div className="fl-slot" data-open={open || undefined}>
            <div className="fl-slot__box" />
          </div>
        </>
      )}
      {children}
    </section>
  )
}

const NAV: { label: string; icon: LucideIcon; active?: boolean; section?: string }[] = [
  { label: 'Home', icon: Home },
  { label: 'Clients', icon: Users, section: 'Work' },
  { label: 'Services', icon: ListChecks, active: true, section: 'Work' },
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

/**
 * Landing hero. A cursor carries L. Sultana's student-visa file
 * from Intake into Documents, then brings it back.
 */
export function FileLands() {
  return (
    <Stage<S>
      width={960}
      height={520}
      compact={{ below: 640, width: 358, height: 480 }}
      initial={INITIAL}
      poster={POSTER}
      script={script}
      cursor={{ at: REST }}
      accent="#0c2d79"
      tokens={{
        '--ss-font': "'Geist Variable', Geist, system-ui, sans-serif",
        '--ss-canvas': '#f4f5f7',
        '--ss-chrome': '#ffffff',
        '--ss-radius-window': '16px',
      }}
      className="fl"
    >
      {(s, rect) => {
        const home = rect(landOf(s.col))
        const width = home.width || rect('land-intake').width
        const pos = s.lifted && s.at ? s.at : { x: home.x, y: home.y }
        const hole = (col: Col) => (s.col === col && !s.lifted) || (s.lifted && (s.over ?? s.col) === col)
        const mark = s.lifted && s.over && s.over !== s.col ? rect(landOf(s.over)) : null
        const filed = s.col === 'docs'
        return (
          <>
            <Window className="fl-window" sidebar={<ShellNav />} sidebarWidth={248}>
              <div className="fl-page">
                <div className="fl-topbar">
                  <ListChecks size={18} strokeWidth={1.75} />
                  Services
                </div>
                <div className="fl-canvas">
              <div className="fl-board">
                <Column id="intake" title="Intake" count={s.intake} slot open={hole('intake')}>
                  <Person name="R. Hossain" detail="Tourist visa" />
                  <Quiet />
                </Column>
                <Column id="docs" title="Documents" count={s.docs} slot open={hole('docs')}>
                  <Person name="N. Akter" detail="Umrah" />
                  <Quiet />
                </Column>
                <Column id="processing" title="Processing" count={42}>
                  <Quiet />
                  <Quiet />
                </Column>
                <Column id="ready" title="Ready" count={24}>
                  <Quiet />
                  <Quiet />
                </Column>
              </div>
                </div>
              </div>
            </Window>
            {mark && mark.width > 0 && (
              <div className="fl-target" style={{ left: mark.x, top: mark.y, width: mark.width, height: CARD_H }} />
            )}
            {width > 0 && (
              <div
                className="fl-card"
                data-dragging={s.lifted || undefined}
                data-lifted={s.lifted || undefined}
                data-cursor="pointer"
                style={{ left: pos.x, top: pos.y, width, height: CARD_H }}
              >
                <Avatar name="L. Sultana" size={22} tone="accent" />
                <span className="fl-card__lines">
                  <span className="fl-card__name">L. Sultana</span>
                  <span className="fl-card__meta">Student visa · GB</span>
                  <Badge tone={filed ? 'warning' : 'accent'}>
                    <Roll>{filed ? 'Docs pending' : 'New'}</Roll>
                  </Badge>
                </span>
              </div>
            )}
          </>
        )
      }}
    </Stage>
  )
}
