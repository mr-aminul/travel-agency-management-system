import { Link } from 'react-router-dom'
import '@/styles/layout-ops.css'
import { PageHeader } from '@/components/ui'

const cards = [
  {
    step: '01',
    title: 'Register a client',
    body: 'Open Clients and fill identity and passport details. Add extra fields in Settings → Client fields. Attach a sub agent when they referred the person.',
    to: '/clients?new=1',
    cta: 'Go to Clients',
  },
  {
    step: '02',
    title: 'Add a service',
    body: 'A client is the person. A service file is what they need. Open it from the client or the Services queue. The checklist for each line lives in Settings → Service catalog.',
    to: '/services?new=1',
    cta: 'Add a service',
  },
  {
    step: '03',
    title: 'Share tracking',
    body: 'Recipients only need the passport number. No login is required on the public tracking page.',
    to: '/track',
    cta: 'Open public tracking',
  },
] as const

export default function HelpPage() {
  return (
    <div className="pd-page pd-ops" aria-label="Help">
      <PageHeader
        title="Help"
        description="Short paths for the work staff do every day."
      />
      <div className="pd-help-grid">
        {cards.map((card) => (
          <article key={card.title} className="pd-help-card">
            <p className="pd-help-card__step">Step {card.step}</p>
            <h3>{card.title}</h3>
            <p>{card.body}</p>
            <Link to={card.to}>{card.cta}</Link>
          </article>
        ))}
      </div>
    </div>
  )
}
