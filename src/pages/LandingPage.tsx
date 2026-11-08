import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
} from 'react'
import '@fontsource-variable/geist/wght.css'
import {
  Airplane,
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Buildings,
  ChatText,
  EnvelopeSimple,
  FolderPlus,
  HardDrives,
  IdentificationCard,
  LinkSimple,
  MapPin,
  Receipt,
  SquaresFour,
  Users,
  UsersThree,
  type Icon,
} from '@phosphor-icons/react'
import { LandingAskChat } from '@/components/landing/LandingAskChat'
import {
  CustomizeDocsMotion,
  CustomizeFieldsMotion,
  CustomizeServicesMotion,
  CustomizeStagesMotion,
} from '@/components/landing/CustomizeMotions'
import { HowToDemo } from '@/components/landing/HowToDemo'
import { usePrefersReducedMotion } from '@/components/landing/usePrefersReducedMotion'
import {
  DocumentsVignette,
  FeatureBoardPeek,
  FeaturePayPeek,
  FeatureTrackPeek,
  InvoiceVignette,
  ServiceBoardVignette,
  SmsVignette,
  SubAgentsVignette,
  TrackingVignette,
} from '@/components/landing/FeatureVignettes'
import {
  PRICING_PLANS,
  SALES_EMAIL,
  SERVICE_TYPES,
  LANDING_AUDIENCES,
  LANDING_CUSTOMIZATIONS,
  LANDING_FEATURES,
  LANDING_SWITCH_STEPS,
  type PricingPerkIcon,
  type PricingPlan,
} from '@/components/landing/landingContent'
import { publicUrl } from '@/lib/publicUrl'
import { appUrl } from '@/lib/siteOrigins'
import { AnnouncementPopupHost } from '@/components/announcements/AnnouncementPopupHost'
import '@/styles/layout-landing.css'

function subscribeUrl(planId?: string): string {
  const path = planId
    ? `/subscribe?plan=${encodeURIComponent(planId)}`
    : '/subscribe?plan=growth'
  return appUrl(path)
}

function formatTaka(amount: number): string {
  return `৳${amount.toLocaleString('en-IN')}`
}

function revealDelay(ms: number): CSSProperties {
  return { '--d': `${ms}ms` } as CSSProperties
}

function useRevealOnScroll<T extends HTMLElement>() {
  const rootRef = useRef<T>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const targets = root.querySelectorAll<HTMLElement>('[data-reveal]')
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          entry.target.classList.add('is-revealed')
          observer.unobserve(entry.target)
        }
      },
      { rootMargin: '0px 0px -6% 0px', threshold: 0.05 },
    )
    targets.forEach((target) => observer.observe(target))
    return () => observer.disconnect()
  }, [])

  return rootRef
}

function useIntroRustFont() {
  useEffect(() => {
    const styleId = 'lp2-intro-rust-font'
    if (document.getElementById(styleId)) return
    const style = document.createElement('style')
    style.id = styleId
    const woff2 = publicUrl('fonts/intro-rust/IntroRust-Base.woff2')
    const woff = publicUrl('fonts/intro-rust/IntroRust-Base.woff')
    style.textContent = `
@font-face {
  font-family: 'Intro Rust';
  src: url('${woff2}') format('woff2'), url('${woff}') format('woff');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}`
    document.head.appendChild(style)
  }, [])
}

type AudienceVignetteKey = (typeof LANDING_AUDIENCES)[number]['vignette']

const VIGNETTES: Record<AudienceVignetteKey, ReactNode> = {
  board: <ServiceBoardVignette />,
  invoice: <InvoiceVignette />,
  documents: <DocumentsVignette />,
  subAgents: <SubAgentsVignette />,
  tracking: <TrackingVignette />,
  sms: <SmsVignette />,
}

const FEATURE_PEEKS: Record<(typeof LANDING_FEATURES)[number]['peek'], ReactNode> = {
  board: <FeatureBoardPeek />,
  pay: <FeaturePayPeek />,
  track: <FeatureTrackPeek />,
}

function LandingNav({ onAsk }: { onAsk: () => void }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isHidden, setIsHidden] = useState(false)
  const panelId = useId()
  const lastScrollY = useRef(0)

  useEffect(() => {
    if (!isOpen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [isOpen])

  /** Hide-on-scroll-down / show-on-scroll-up (smart sticky nav). */
  useEffect(() => {
    if (isOpen) {
      setIsHidden(false)
      return
    }

    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (media.matches) {
      setIsHidden(false)
      return
    }

    const deltaThreshold = 6
    const topAlwaysShow = 48
    let ticking = false
    lastScrollY.current = window.scrollY

    const onScroll = () => {
      if (ticking) return
      ticking = true
      window.requestAnimationFrame(() => {
        const currentY = Math.max(0, window.scrollY)
        const delta = currentY - lastScrollY.current

        if (currentY <= topAlwaysShow) {
          setIsHidden(false)
        } else if (delta > deltaThreshold) {
          setIsHidden(true)
        } else if (delta < -deltaThreshold) {
          setIsHidden(false)
        }

        lastScrollY.current = currentY
        ticking = false
      })
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [isOpen])

  const close = () => setIsOpen(false)

  const navClass = [
    'lp2-nav',
    isOpen ? 'is-open' : '',
    isHidden && !isOpen ? 'is-hidden' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <>
      <nav className={navClass} aria-label="Main">
        <a className="lp2-nav__brand title-3" href="#top" onClick={close}>
          <img src={publicUrl('images/logo.svg')} alt="" width={28} height={28} />
          OneTrack
        </a>
        <div className="lp2-nav__links">
          <a className="title-4" href="#product">
            Product
          </a>
          <a className="title-4" href="#features">
            Features
          </a>
          <a className="title-4" href="#how-it-works">
            How it works
          </a>
          <a className="title-4" href="#pricing">
            Pricing
          </a>
        </div>
        <div className="lp2-nav__actions">
          <a className="lp2-nav__signin button-sm" href={appUrl('/login')}>
            Sign in
          </a>
          <a className="lp2-btn lp2-btn--solid button-sm" href={subscribeUrl('growth')}>
            Start free trial
          </a>
          <button
            type="button"
            className="lp2-nav__menu-btn"
            aria-expanded={isOpen}
            aria-controls={panelId}
            aria-label={isOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setIsOpen((open) => !open)}
          >
            <span className="lp2-menu-icon" aria-hidden>
              <span />
              <span />
              <span />
            </span>
          </button>
        </div>
      </nav>
      <div
        id={panelId}
        className={isOpen ? 'lp2-nav__panel is-open' : 'lp2-nav__panel'}
        hidden={!isOpen}
      >
        <a className="heading-4" href="#product" onClick={close}>
          Product
        </a>
        <a className="heading-4" href="#features" onClick={close}>
          Features
        </a>
        <a className="heading-4" href="#how-it-works" onClick={close}>
          How it works
        </a>
        <a className="heading-4" href="#pricing" onClick={close}>
          Pricing
        </a>
        <a className="heading-4" href={appUrl('/login')} onClick={close}>
          Sign in
        </a>
        <button
          type="button"
          className="heading-4 lp2-nav__panel-ask"
          onClick={() => {
            close()
            onAsk()
          }}
        >
          Ask Inventive Lab
        </button>
        <a
          className="lp2-btn lp2-btn--amber button-md"
          href={subscribeUrl('growth')}
          onClick={close}
        >
          Start free trial
        </a>
      </div>
    </>
  )
}

function Hero() {
  return (
    <section className="lp2-hero" id="top" aria-labelledby="lp2-hero-title">
      <img
        className="lp2-hero__sky"
        src={publicUrl('images/landing/starry-sky-clouds-background.jpg')}
        alt=""
        width={1920}
        height={1080}
        decoding="async"
        fetchPriority="high"
      />
      <div className="lp2-hero__inner">
        <h1 className="lp2-hero__title lp2-rise" id="lp2-hero-title" style={revealDelay(80)}>
          <span>Fly everything</span>
          <span className="lp2-hero__title-line">from one terminal</span>
        </h1>
        <p className="lp2-hero__sub body-3 lp2-rise" style={revealDelay(180)}>
          Desk software for travel and visa agencies in Bangladesh.
        </p>
        <div className="lp2-hero__ctas lp2-rise" style={revealDelay(280)}>
          <a className="lp2-btn lp2-btn--navy button-md" href={subscribeUrl('growth')}>
            Start free trial
            <ArrowRight size={18} weight="bold" />
          </a>
        </div>
      </div>
      <div className="lp2-hero__product lp2-rise" style={revealDelay(360)} aria-hidden>
        <ServiceBoardVignette />
      </div>
      <ServiceTicker />
    </section>
  )
}

function ServiceTicker() {
  const items = [...SERVICE_TYPES, ...SERVICE_TYPES]
  return (
    <div className="lp2-ticker" aria-label={`Services: ${SERVICE_TYPES.join(', ')}`}>
      <div className="lp2-ticker__track" aria-hidden>
        {items.map((service, index) => (
          <span key={`${service}-${index}`}>
            {service}
            <Airplane size={14} weight="bold" />
          </span>
        ))}
      </div>
    </div>
  )
}

function AudienceTabs() {
  const [activeId, setActiveId] = useState<(typeof LANDING_AUDIENCES)[number]['id']>(
    LANDING_AUDIENCES[0].id,
  )
  const active = LANDING_AUDIENCES.find((item) => item.id === activeId) ?? LANDING_AUDIENCES[0]
  const tablistId = useId()

  return (
    <section
      className="lp2-audiences lp2-paper"
      id="product"
      aria-labelledby="lp2-audiences-title"
    >
      <div className="lp2-wrap">
        <header className="lp2-section-head lp2-section-head--center" data-reveal>
          <h2 id="lp2-audiences-title" className="lp2-section-head__title">
            One board for every service
          </h2>
        </header>
        <div
          className="lp2-audiences__tabs"
          role="tablist"
          aria-labelledby="lp2-audiences-title"
          id={tablistId}
          data-reveal
        >
          {LANDING_AUDIENCES.map((item) => {
            const selected = item.id === active.id
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                id={`${tablistId}-${item.id}`}
                aria-selected={selected}
                aria-controls={`${tablistId}-panel`}
                className={
                  selected
                    ? 'lp2-audiences__tab is-active title-4'
                    : 'lp2-audiences__tab title-4'
                }
                onClick={() => setActiveId(item.id)}
              >
                {item.label}
              </button>
            )
          })}
        </div>
        <div
          className="lp2-audiences__panel"
          role="tabpanel"
          id={`${tablistId}-panel`}
          aria-labelledby={`${tablistId}-${active.id}`}
          data-reveal
        >
          <div className="lp2-audiences__copy">
            <h3 className="lp2-audiences__title">{active.title}</h3>
            <p className="body-3">{active.detail}</p>
            <a className="lp2-btn lp2-btn--navy button-sm" href={subscribeUrl('growth')}>
              Start free trial
              <ArrowRight size={16} weight="bold" />
            </a>
          </div>
          <div className="lp2-audiences__stage" aria-hidden>
            {VIGNETTES[active.vignette]}
          </div>
        </div>
      </div>
    </section>
  )
}

function ProblemSolution() {
  return (
    <section className="lp2-problem lp2-paper" aria-labelledby="lp2-problem-title">
      <div className="lp2-wrap">
        <header className="lp2-section-head lp2-section-head--center" data-reveal>
          <h2 id="lp2-problem-title" className="lp2-section-head__title">
            From scattered work to one clear file
          </h2>
        </header>
        <div className="lp2-problem__grid" data-reveal>
          <article className="lp2-problem__card">
            <p className="lp2-problem__label caption-3">Today</p>
            <h3 className="lp2-problem__caption">
              Chats, sheets, and missed calls run the desk
            </h3>
            <div className="lp2-problem__visual">
              <img
                className="lp2-problem__image"
                src={publicUrl('images/landing/why-switch-today.png')}
                alt="Stressed agent surrounded by client passports, NID, WhatsApp, and a messy spreadsheet"
                width={720}
                height={540}
                loading="lazy"
                decoding="async"
              />
            </div>
          </article>
          <div className="lp2-problem__bridge" aria-hidden>
            <ArrowRight
              className="lp2-problem__bridge-icon lp2-problem__bridge-icon--desk"
              size={22}
              weight="bold"
            />
            <ArrowDown
              className="lp2-problem__bridge-icon lp2-problem__bridge-icon--mobile"
              size={20}
              weight="bold"
            />
          </div>
          <article className="lp2-problem__card">
            <p className="lp2-problem__label caption-3">With OneTrack</p>
            <h3 className="lp2-problem__caption">
              Docs, payments, and status in one place
            </h3>
            <div className="lp2-problem__visual">
              <img
                className="lp2-problem__image"
                src={publicUrl('images/landing/why-switch-onetrack.png')}
                alt="Calm agent with one client file, docs checked, and auto SMS updates"
                width={720}
                height={540}
                loading="lazy"
                decoding="async"
              />
            </div>
          </article>
        </div>
      </div>
    </section>
  )
}

function Features() {
  return (
    <section
      className="lp2-features lp2-paper"
      id="features"
      aria-labelledby="lp2-features-title"
    >
      <div className="lp2-wrap">
        <header className="lp2-section-head" data-reveal>
          <h2 id="lp2-features-title" className="lp2-section-head__title">
            Files, payments, and status
          </h2>
        </header>
        <div className="lp2-features__grid">
          {LANDING_FEATURES.map((feature, index) => (
            <article
              key={feature.title}
              className={feature.isPrimary ? 'lp2-feature is-primary' : 'lp2-feature'}
              data-reveal
              style={revealDelay(index * 70)}
            >
              <div className="lp2-feature__copy">
                <h3 className="lp2-feature__title">{feature.title}</h3>
                <p className="lp2-feature__detail body-6">{feature.detail}</p>
              </div>
              <div className="lp2-feature__visual">{FEATURE_PEEKS[feature.peek]}</div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

const CUSTOMIZE_MOTIONS: Record<(typeof LANDING_CUSTOMIZATIONS)[number]['icon'], ReactNode> = {
  services: <CustomizeServicesMotion />,
  stages: <CustomizeStagesMotion />,
  docs: <CustomizeDocsMotion />,
  fields: <CustomizeFieldsMotion />,
}

function Customize() {
  return (
    <section
      className="lp2-customize lp2-paper"
      id="customize"
      aria-labelledby="lp2-customize-title"
    >
      <div className="lp2-wrap">
        <div className="lp2-customize__panel">
          <header className="lp2-section-head" data-reveal>
            <h2 id="lp2-customize-title" className="lp2-section-head__title">
              Bend it to your agency
            </h2>
          </header>
          <div className="lp2-customize__grid">
            {LANDING_CUSTOMIZATIONS.map((item, index) => (
              <article
                key={item.title}
                className="lp2-customize__card"
                data-reveal
                style={revealDelay(index * 70)}
              >
                <div className="lp2-customize__stage">{CUSTOMIZE_MOTIONS[item.icon]}</div>
                <h3 className="lp2-customize__title">{item.title}</h3>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

const STEP_ICONS: Record<(typeof LANDING_SWITCH_STEPS)[number]['icon'], Icon> = {
  agency: Buildings,
  files: FolderPlus,
  link: LinkSimple,
}

function HowItWorks() {
  const prefersReducedMotion = usePrefersReducedMotion()
  const [active, setActive] = useState(0)
  const stepCount = LANDING_SWITCH_STEPS.length

  useEffect(() => {
    if (prefersReducedMotion) return
    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % stepCount)
    }, 4200)
    return () => window.clearInterval(timer)
  }, [prefersReducedMotion, stepCount])

  const demoStep = Math.min(Math.max(active, 0), 2) as 0 | 1 | 2

  return (
    <section
      className="lp2-howto lp2-paper"
      id="how-it-works"
      aria-labelledby="lp2-howto-title"
    >
      <div className="lp2-wrap">
        <header className="lp2-section-head lp2-section-head--center" data-reveal>
          <h2 id="lp2-howto-title" className="lp2-section-head__title">
            Open your desk
          </h2>
        </header>

        <ol className="lp2-howto__rail" data-reveal>
          {LANDING_SWITCH_STEPS.map((step, index) => {
            const StepIcon = STEP_ICONS[step.icon]
            const isActive = index === active
            const isDone = index < active
            return (
              <li key={step.number}>
                <button
                  type="button"
                  className={[
                    'lp2-howto__card',
                    isActive ? 'is-active' : '',
                    isDone ? 'is-done' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  aria-current={isActive ? 'step' : undefined}
                  onClick={() => setActive(index)}
                >
                  <span className="lp2-howto__card-icon" aria-hidden>
                    <StepIcon size={22} weight="bold" />
                  </span>
                  <span className="lp2-howto__card-copy">
                    <span className="lp2-howto__card-title">{step.title}</span>
                    <span className="lp2-howto__card-detail">{step.detail}</span>
                  </span>
                </button>
              </li>
            )
          })}
        </ol>

        <div className="lp2-howto__stage" data-reveal>
          <HowToDemo step={demoStep} />
        </div>
      </div>
    </section>
  )
}

function Barcode() {
  return <span className="lp2-barcode" aria-hidden />
}

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

function PricingTicket({ plan, index }: { plan: PricingPlan; index: number }) {
  return (
    <div data-reveal style={revealDelay(index * 110)}>
      <a
        className={plan.isFeatured ? 'lp2-ticket is-featured' : 'lp2-ticket'}
        href={subscribeUrl(plan.id)}
        aria-label={`Start trial — ${plan.name}`}
      >
        <div className="lp2-ticket__skin">
          <div className="lp2-ticket__main">
            {plan.isFeatured ? (
              <div className="lp2-ticket__top">
                <span className="lp2-ticket__badge">Popular</span>
              </div>
            ) : null}
            <h3 className="lp2-ticket__name">{plan.name}</h3>
            <p className="lp2-ticket__fare">
              <span className="lp2-ticket__price">{formatTaka(plan.priceBdt)}</span>
              <span className="lp2-mono">/ mo</span>
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
    </div>
  )
}

function Pricing({ onAsk }: { onAsk: () => void }) {
  return (
    <section
      className="lp2-pricing lp2-paper"
      id="pricing"
      aria-labelledby="lp2-pricing-title"
    >
      <div className="lp2-wrap">
        <header className="lp2-section-head" data-reveal>
          <h2 id="lp2-pricing-title" className="lp2-section-head__title">
            Plans and prices
          </h2>
          <p className="lp2-section-head__note body-3">
            Paid monthly in Taka. 14 day trial, no card, no setup fee.
          </p>
        </header>
        <div className="lp2-pricing__row">
          {PRICING_PLANS.map((plan, index) => (
            <PricingTicket key={plan.id} plan={plan} index={index} />
          ))}
        </div>
        <p className="lp2-pricing__foot body-6" data-reveal>
          Need a custom desk setup?{' '}
          <button type="button" className="lp2-text-btn" onClick={onAsk}>
            Ask Inventive Lab
          </button>
          .
        </p>
      </div>
    </section>
  )
}

function FinalCall({ onAsk }: { onAsk: () => void }) {
  return (
    <section className="lp2-final lp2-paper" aria-labelledby="lp2-final-title">
      <div className="lp2-wrap lp2-final__inner" data-reveal>
        <p className="lp2-final__eyebrow">OneTrack</p>
        <h2 id="lp2-final-title" className="lp2-final__title">
          <span>Ready to fly</span>
          <span>from one terminal?</span>
        </h2>
        <p className="lp2-final__risk body-3">
          Start a 14 day trial with no card. Or ask Inventive Lab for a short walkthrough.
        </p>
        <div className="lp2-final__actions">
          <a className="lp2-btn lp2-btn--navy button-md" href={subscribeUrl('growth')}>
            Start 14 day trial
            <ArrowRight size={18} weight="bold" />
          </a>
          <button type="button" className="lp2-btn lp2-btn--ghost button-md" onClick={onAsk}>
            Ask Inventive Lab
          </button>
        </div>
      </div>
    </section>
  )
}

function LandingFooter({ onAsk }: { onAsk: () => void }) {
  const newsletterId = useId()

  function submitNewsletter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const email = new FormData(form).get('email')
    const address = typeof email === 'string' ? email.trim() : ''
    if (!address) return
    const subject = encodeURIComponent('OneTrack newsletter')
    const body = encodeURIComponent(`Please add ${address} to OneTrack updates.`)
    window.location.href = `mailto:${SALES_EMAIL}?subject=${subject}&body=${body}`
    form.reset()
  }

  return (
    <footer className="lp2-footer">
      <div className="lp2-footer__banner" aria-hidden="true">
        <img
          src={publicUrl('images/landing/footer-travel-banner.jpg')}
          alt=""
          width={2752}
          height={1536}
          loading="lazy"
          decoding="async"
        />
      </div>
      <div className="lp2-wrap lp2-footer__panel">
        <div className="lp2-footer__grid">
          <div className="lp2-footer__brand">
            <a className="lp2-nav__brand title-3" href="#top">
              <img src={publicUrl('images/logo.svg')} alt="" width={24} height={24} />
              OneTrack
            </a>
            <p className="lp2-footer__tagline body-6">
              Desk software for travel and visa agencies in Bangladesh.
            </p>
            <ul className="lp2-footer__contact">
              <li>
                <EnvelopeSimple size={16} weight="bold" aria-hidden />
                <a href={`mailto:${SALES_EMAIL}`}>{SALES_EMAIL}</a>
              </li>
              <li>
                <MapPin size={16} weight="bold" aria-hidden />
                <span>Dhaka, Bangladesh</span>
              </li>
            </ul>
          </div>

          <nav className="lp2-footer__col" aria-label="Product">
            <p className="lp2-footer__heading">Product</p>
            <a href="#features">Features</a>
            <a href="#how-it-works">How it works</a>
            <a href="#pricing">Pricing</a>
            <a href={appUrl('/track')}>Track a file</a>
            <a href={appUrl('/login')}>Sign in</a>
            <a href={subscribeUrl('growth')}>Start 14 day trial</a>
          </nav>

          <nav className="lp2-footer__col" aria-label="Company">
            <p className="lp2-footer__heading">Company</p>
            <a href="/faq">FAQ</a>
            <button type="button" className="lp2-text-btn lp2-text-btn--light" onClick={onAsk}>
              Ask Inventive Lab
            </button>
            <a href={`mailto:${SALES_EMAIL}?subject=Privacy%20policy`}>Privacy</a>
            <a href={`mailto:${SALES_EMAIL}?subject=Terms%20of%20use`}>Terms</a>
          </nav>

          <nav className="lp2-footer__col" aria-label="Help">
            <p className="lp2-footer__heading">Help</p>
            <a href="/faq">FAQ</a>
            <a href={appUrl('/track')}>Track a file</a>
            <button type="button" className="lp2-text-btn lp2-text-btn--light" onClick={onAsk}>
              Ask us
            </button>
            <a href={`mailto:${SALES_EMAIL}`}>Email support</a>
            <a href={subscribeUrl('growth')}>Start 14 day trial</a>
          </nav>

          <div className="lp2-footer__col lp2-footer__newsletter">
            <p className="lp2-footer__heading">
              <label htmlFor={newsletterId}>Newsletter</label>
            </p>
            <form className="lp2-footer__newsletter-form" onSubmit={submitNewsletter}>
              <input
                id={newsletterId}
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="Business email"
              />
              <button type="submit" aria-label="Subscribe">
                <ArrowRight size={18} weight="bold" />
              </button>
            </form>
          </div>
        </div>

        <div className="lp2-footer__legal">
          <p className="caption-5">© {new Date().getFullYear()} Inventive Lab · Dhaka</p>
          <nav className="lp2-footer__legal-links" aria-label="Legal">
            <a className="caption-5" href={`mailto:${SALES_EMAIL}?subject=Privacy%20policy`}>
              Privacy Policy
            </a>
            <a className="caption-5" href={`mailto:${SALES_EMAIL}?subject=Terms%20of%20use`}>
              Terms of Service
            </a>
          </nav>
        </div>
      </div>
    </footer>
  )
}

export default function LandingPage() {
  const rootRef = useRevealOnScroll<HTMLDivElement>()
  const [askOpen, setAskOpen] = useState(false)
  const openAsk = () => setAskOpen(true)
  const closeAsk = () => setAskOpen(false)
  useIntroRustFont()

  useEffect(() => {
    document.title = 'OneTrack — Desk software for travel & visa agencies'
    const description =
      'OneTrack helps travel and visa agencies in Bangladesh run every client file from one board. Start a 14 day trial with no card.'
    let meta = document.querySelector('meta[name="description"]')
    if (!meta) {
      meta = document.createElement('meta')
      meta.setAttribute('name', 'description')
      document.head.appendChild(meta)
    }
    meta.setAttribute('content', description)

    let robots = document.querySelector('meta[name="robots"]')
    if (!robots) {
      robots = document.createElement('meta')
      robots.setAttribute('name', 'robots')
      document.head.appendChild(robots)
    }
    robots.setAttribute('content', 'index, follow')
  }, [])

  return (
    <div className="lp2" ref={rootRef}>
      <a className="lp2-skip button-sm" href="#main">
        Skip to content
      </a>
      <LandingNav onAsk={openAsk} />
      <main id="main">
        <Hero />
        <ProblemSolution />
        <Features />
        <AudienceTabs />
        <Customize />
        <HowItWorks />
        <Pricing onAsk={openAsk} />
        <FinalCall onAsk={openAsk} />
      </main>
      <LandingFooter onAsk={openAsk} />
      <LandingAskChat open={askOpen} onOpen={openAsk} onClose={closeAsk} />
      <AnnouncementPopupHost surface="landing" />
    </div>
  )
}
