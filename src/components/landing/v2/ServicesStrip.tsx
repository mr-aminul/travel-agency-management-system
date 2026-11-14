import type { CSSProperties, ReactNode } from 'react'
import {
  AirplaneTilt,
  ArrowRight,
  ArrowUpRight,
  Bed,
  Briefcase,
  FirstAidKit,
  GraduationCap,
  MapTrifold,
  MoonStars,
  Mountains,
} from '@phosphor-icons/react'
import { subscribeUrl } from './landingLinks'

const SERVICES: readonly { name: string; desc: string; icon: ReactNode }[] = [
  { name: 'Tourist Visa', desc: 'Papers, embassy date and decision on one file.', icon: <Mountains weight="duotone" /> },
  { name: 'Student Visa', desc: 'Offer letter and bank statement in view.', icon: <GraduationCap weight="duotone" /> },
  { name: 'Work Permit', desc: 'Medical, police clearance and job papers.', icon: <Briefcase weight="duotone" /> },
  { name: 'Hajj & Umrah', desc: 'Groups, advance and balance per pilgrim.', icon: <MoonStars weight="duotone" /> },
  { name: 'Medical Visa', desc: 'Hospital letter and attendant on the same file.', icon: <FirstAidKit weight="duotone" /> },
  { name: 'Air Tickets', desc: 'PNR and fare kept with the visa.', icon: <AirplaneTilt weight="duotone" /> },
  { name: 'Hotel Booking', desc: 'Vouchers attached to the trip.', icon: <Bed weight="duotone" /> },
  { name: 'Tour Packages', desc: 'Every traveller, payment and day plan.', icon: <MapTrifold weight="duotone" /> },
]

export function ServicesStrip() {
  return (
    <section className="section wrap-wide sponsors" id="services" aria-labelledby="services-title">
      <header className="section-head" data-enter>
        <h2 id="services-title">One board for all eight services</h2>
      </header>
      <ul className="cells">
        {SERVICES.map((service, index) => (
          <li key={service.name} data-enter style={{ '--enter-i': index } as CSSProperties}>
            <a className="sponsor" href={subscribeUrl()}>
              <span className="sponsor-icon" aria-hidden>
                {service.icon}
              </span>
              <span className="sponsor-name">{service.name}</span>
              <span className="sponsor-desc">{service.desc}</span>
              <ArrowUpRight weight="bold" aria-hidden />
            </a>
          </li>
        ))}
      </ul>
      <div className="hang">
        <a href={subscribeUrl()}>
          Start with the files open today. <b>14 day free trial</b>
          <ArrowRight size={13} weight="bold" aria-hidden />
        </a>
      </div>
    </section>
  )
}
