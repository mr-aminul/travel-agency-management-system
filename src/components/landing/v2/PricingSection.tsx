import { useState } from 'react'
import {
  ArrowRight,
  ChatText,
  HardDrives,
  IdentificationCard,
  LinkSimple,
  Receipt,
  SquaresFour,
  Tag,
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

const BILLING_OPTIONS = [
  { id: 'month', label: 'Monthly', plans: PRICING_PLANS },
  { id: 'year', label: 'Annual · 2 months free', plans: ANNUAL_PRICING_PLANS },
] as const

function PlanCell({ plan }: { plan: PricingPlan }) {
  return (
    <li className="plan">
      <div className="plan-head">
        <h3 className="plan-name">{plan.name}</h3>
        {plan.isFeatured ? <span className="chip blue">Popular</span> : null}
      </div>
      <p className="plan-price">
        <b>{formatTaka(plan.priceBdt)}</b>
        <span>/ {plan.interval === 'year' ? 'year' : 'month'}</span>
      </p>
      <ul className="plan-perks">
        {plan.perks.map((perk) => {
          const PerkIcon = PERK_ICONS[perk.icon]
          return (
            <li key={perk.label}>
              <PerkIcon weight="duotone" aria-hidden />
              {perk.label}
            </li>
          )
        })}
      </ul>
      <a className={plan.isFeatured ? 'btn btn-dark' : 'btn btn-light'} href={subscribeUrl(plan.id)}>
        Start free trial
        <ArrowRight className="arrow" weight="bold" />
      </a>
    </li>
  )
}

export function PricingSection({ onAsk }: { onAsk: () => void }) {
  const [billingIndex, setBillingIndex] = useState(0)
  const billing = BILLING_OPTIONS[billingIndex]

  return (
    <section className="section wrap-wide" id="pricing" aria-labelledby="pricing-title">
      <header className="section-head" data-enter>
        <p className="eyebrow">
          <Tag weight="bold" />
          Pricing
        </p>
        <h2 id="pricing-title">Paid in Taka. No setup fee.</h2>
        <p>Every plan starts with 14 days free and no card.</p>
      </header>
      <div className="pricing-tabs" data-enter>
        <div className="tabs" role="tablist" aria-label="Billing period">
          {BILLING_OPTIONS.map((option, index) => (
            <button
              key={option.id}
              type="button"
              role="tab"
              className="tab"
              aria-selected={index === billingIndex}
              onClick={() => setBillingIndex(index)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <ul className="cells plans" data-enter>
        {billing.plans.map((plan) => (
          <PlanCell key={plan.id} plan={plan} />
        ))}
      </ul>
      <p className="pricing-foot">
        Need more seats?{' '}
        <button type="button" className="link" onClick={onAsk}>
          Ask Inventive Lab
        </button>
      </p>
    </section>
  )
}
