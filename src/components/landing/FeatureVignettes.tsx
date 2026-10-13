import { Check, Clock3, Link2, Search, X } from 'lucide-react'

const BOARD_COLUMNS = [
  {
    stage: 'Intake',
    count: 18,
    cards: [
      { country: 'CA', service: 'Student visa', client: 'R. Hossain', tag: 'New' },
      { country: 'JP', service: 'Tourist visa', client: 'K. Das', tag: 'New' },
    ],
  },
  {
    stage: 'Documents',
    count: 32,
    cards: [
      { country: 'GB', service: 'Student visa', client: 'L. Sultana', tag: 'Docs pending' },
      { country: 'SA', service: 'Umrah', client: 'N. Akter', tag: 'Docs pending' },
    ],
  },
  {
    stage: 'Processing',
    count: 42,
    cards: [
      { country: 'AE', service: 'Work permit', client: 'M. Rahman', tag: 'In review' },
      { country: 'IN', service: 'Medical visa', client: 'F. Chowdhury', tag: 'In review' },
    ],
  },
  {
    stage: 'Ready',
    count: 24,
    cards: [
      { country: 'TH', service: 'Tourist visa', client: 'S. Islam', tag: 'Ready' },
      { country: 'MY', service: 'Air ticket', client: 'T. Ahmed', tag: 'Ready' },
    ],
  },
]

export function ServiceBoardVignette() {
  return (
    <div className="lp-vg lp-vg--board" aria-hidden>
      {BOARD_COLUMNS.map((column) => (
        <div className="lp-vg-board__col" key={column.stage}>
          <div className="lp-vg-board__head">
            <span>{column.stage}</span>
            <b>{column.count}</b>
          </div>
          {column.cards.map((card) => (
            <div className="lp-vg-board__card" key={card.client}>
              <span className="lp-vg-board__country">{card.country}</span>
              <span className="lp-vg-board__service">{card.service}</span>
              <span className="lp-vg-board__client">{card.client}</span>
              <span className="lp-vg-board__tag">{card.tag}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

const RECEIPTS = [
  { label: 'Advance received', amount: '৳50,000', date: '02 Oct' },
  { label: 'Second payment', amount: '৳70,000', date: '09 Oct' },
  { label: 'Balance due', amount: '৳65,000', date: '20 Oct', isDue: true },
]

export function InvoiceVignette() {
  return (
    <div className="lp-vg lp-vg--payments" aria-hidden>
      <InvoiceCard />
      <ul className="lp-vg-receipts">
        {RECEIPTS.map((receipt) => (
          <li key={receipt.label} className={receipt.isDue ? 'is-due' : undefined}>
            <span>{receipt.label}</span>
            <b>{receipt.amount}</b>
            <small>{receipt.date}</small>
          </li>
        ))}
      </ul>
    </div>
  )
}

function InvoiceCard() {
  return (
    <div className="lp-vg-invoice">
      <div className="lp-vg-invoice__top">
        <span>INV-2041</span>
        <span className="lp-vg-invoice__pill">Partly paid</span>
      </div>
      <p className="lp-vg-invoice__title">Umrah package · N. Akter</p>
      <dl className="lp-vg-invoice__sums">
        <div>
          <dt>Total</dt>
          <dd>৳1,85,000</dd>
        </div>
        <div>
          <dt>Paid</dt>
          <dd>৳1,20,000</dd>
        </div>
        <div className="lp-vg-invoice__due">
          <dt>Due</dt>
          <dd>৳65,000</dd>
        </div>
      </dl>
      <div className="lp-vg-invoice__bar">
        <span style={{ width: '65%' }} />
      </div>
      <span className="lp-vg-invoice__share">
        <Link2 size={13} strokeWidth={2.25} />
        Share payment link
      </span>
    </div>
  )
}

const DOCUMENT_CHECKLIST = [
  { name: 'Passport scan', state: 'done' },
  { name: 'Photo 35×45 mm', state: 'done' },
  { name: 'Bank statement', state: 'done' },
  { name: 'Employer NOC', state: 'pending' },
  { name: 'Travel insurance', state: 'missing' },
] as const

export function DocumentsVignette() {
  return (
    <ul className="lp-vg lp-vg--docs" aria-hidden>
      {DOCUMENT_CHECKLIST.map((item) => (
        <li key={item.name} className={`lp-vg-docs__item lp-vg-docs__item--${item.state}`}>
          <span className="lp-vg-docs__mark">
            {item.state === 'done' ? <Check size={12} strokeWidth={3} /> : null}
            {item.state === 'pending' ? <Clock3 size={12} strokeWidth={2.5} /> : null}
            {item.state === 'missing' ? <X size={12} strokeWidth={3} /> : null}
          </span>
          {item.name}
        </li>
      ))}
    </ul>
  )
}

const SUB_AGENTS = [
  { initials: 'HT', name: 'Hasan Tours', city: 'Chattogram', clients: 46 },
  { initials: 'BA', name: 'Bari Air Link', city: 'Sylhet', clients: 31 },
  { initials: 'MU', name: 'M. Uddin', city: 'Cumilla', clients: 12 },
]

export function SubAgentsVignette() {
  return (
    <div className="lp-vg lp-vg--agents" aria-hidden>
      {SUB_AGENTS.map((agent) => (
        <div className="lp-vg-agents__row" key={agent.name}>
          <span className="lp-vg-agents__avatar">{agent.initials}</span>
          <span className="lp-vg-agents__who">
            <b>{agent.name}</b>
            <small>{agent.city}</small>
          </span>
          <span className="lp-vg-agents__count">{agent.clients} clients</span>
        </div>
      ))}
      <div className="lp-vg-agents__queue">
        <span className="lp-vg-agents__pulse" />3 submissions waiting for approval
      </div>
    </div>
  )
}

export function TrackingVignette() {
  return (
    <div className="lp-vg lp-vg--track" aria-hidden>
      <div className="lp-vg-track__input">
        <Search size={13} strokeWidth={2.5} />
        A0••••4512
      </div>
      <ol className="lp-vg-track__steps">
        <li className="is-done">Documents received</li>
        <li className="is-done">Submitted to embassy</li>
        <li className="is-current">Awaiting decision</li>
      </ol>
    </div>
  )
}

export function SmsVignette() {
  return (
    <div className="lp-vg lp-vg--sms" aria-hidden>
      <div className="lp-vg-sms__bubble">
        Dear Rahim, your Canada student visa has been submitted. — Skyline Travels
      </div>
      <span className="lp-vg-sms__meta">Sent · 2:14 PM</span>
    </div>
  )
}
