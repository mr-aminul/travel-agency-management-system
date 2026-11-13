import { useState } from 'react'
import {
  ArrowUpRight,
  ChatText,
  HardDrives,
  IdentificationCard,
  LinkSimple,
  Receipt,
  SquaresFour,
  Users,
  UsersThree,
  type Icon,
} from '@phosphor-icons/react'
import {
  ANNUAL_PRICING_PLANS,
  PRICING_PLANS,
  type PricingPerkIcon,
  type PricingPlan,
} from '@/components/landing/landingContent'
import { formatTaka, subscribeUrl } from './landingLinks'

const PERK_ICONS: Record<PricingPerkIcon, Icon> = {
  seats: Users,
  services: SquaresFour,
  payments: Receipt,
  storage: HardDrives,
  sms: ChatText,
  subAgents: UsersThree,
  links: LinkSimple,
  hr: IdentificationCard,
}

function Barcode() {
  return <span className="lp2-barcode" aria-hidden />
}

function PricingTicket({ plan }: { plan: PricingPlan }) {
  return (
    <a
      className={plan.isFeatured ? 'lp2-ticket is-featured' : 'lp2-ticket'}
      href={subscribeUrl(plan.id)}
      aria-label={`Start trial — ${plan.name}`}
    >
      <div className="lp2-ticket__skin">
        {plan.isFeatured ? <span className="lp2-ticket__badge">Popular</span> : null}
        <div className="lp2-ticket__main">
          <h3 className="lp2-ticket__name">{plan.name}</h3>
          <p className="lp2-ticket__fare">
            <span className="lp2-ticket__price">{formatTaka(plan.priceBdt)}</span>
            <span className="lp2-mono">/ {plan.interval === 'year' ? 'yr' : 'mo'}</span>
          </p>
          <ul className="lp2-ticket__perks">
            {plan.perks.map((perk) => {
              const PerkIcon = PERK_ICONS[perk.icon]
              return (
                <li key={perk.label}>
                  <PerkIcon className="lp2-ticket__perk-icon" size={16} weight="bold" aria-hidden />
                  <span>{perk.label}</span>
                </li>
              )
            })}
          </ul>
        </div>
        <div className="lp2-ticket__stub">
          <div>
            <span className="lp2-mono">Seat</span>
            <strong>{plan.seatCode}</strong>
          </div>
          <Barcode />
          <span className="lp2-ticket__board">
            Start trial
            <ArrowUpRight size={15} weight="bold" aria-hidden="true" />
          </span>
        </div>
      </div>
    </a>
  )
}

export function PricingTickets({ onAsk }: { onAsk: () => void }) {
  const [billing, setBilling] = useState<'month' | 'year'>('month')
  const plans = billing === 'year' ? ANNUAL_PRICING_PLANS : PRICING_PLANS

  return (
    <section className="lp2-pricing lp2-paper" id="pricing" aria-labelledby="ot3-pricing-title">
      <div className="lp2-wrap">
        <header className="lp2-section-head lp2-section-head--center" data-enter>
          <h2 id="ot3-pricing-title" className="lp2-section-head__title">
            Pricing
          </h2>
          <p className="lp2-section-head__note body-3">
            Paid in Taka. 14 day trial, no card, no setup fee.
          </p>
          <div className="lp2-pricing__seg" role="group" aria-label="Billing period">
            <button
              type="button"
              className={billing === 'month' ? 'is-active' : undefined}
              aria-pressed={billing === 'month'}
              onClick={() => setBilling('month')}
            >
              Monthly
            </button>
            <button
              type="button"
              className={billing === 'year' ? 'is-active' : undefined}
              aria-pressed={billing === 'year'}
              onClick={() => setBilling('year')}
            >
              Annual · 2 months free
            </button>
          </div>
        </header>
        <div className="lp2-pricing__row" data-enter>
          {plans.map((plan) => (
            <PricingTicket key={plan.id} plan={plan} />
          ))}
        </div>
        <p className="lp2-pricing__foot body-6" data-enter>
          Need more seats?{' '}
          <button type="button" className="lp2-text-btn" onClick={onAsk}>
            Ask Inventive Lab
          </button>
        </p>
      </div>
    </section>
  )
}
