import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type TransitionEvent,
} from 'react'
import '@fontsource-variable/geist/wght.css'
import {
  Airplane,
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Buildings,
  CaretDown,
  ChatText,
  FolderPlus,
  HardDrives,
  IdentificationCard,
  LinkSimple,
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
  V2_AUDIENCES,
  V2_CUSTOMIZATIONS,
  V2_FAQS,
  V2_FEATURES,
  V2_SWITCH_STEPS,
  type PricingPerkIcon,
  type PricingPlan,
} from '@/components/landing/landingV2Content'
import { publicUrl } from '@/lib/publicUrl'
import { appUrl } from '@/lib/siteOrigins'
import { AnnouncementPopupHost } from '@/components/announcements/AnnouncementPopupHost'
import '@/styles/layout-landing-v2.css'

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

type AudienceVignetteKey = (typeof V2_AUDIENCES)[number]['vignette']

const VIGNETTES: Record<AudienceVignetteKey, ReactNode> = {
  board: <ServiceBoardVignette />,
  invoice: <InvoiceVignette />,
  documents: <DocumentsVignette />,
  subAgents: <SubAgentsVignette />,
  tracking: <TrackingVignette />,
  sms: <SmsVignette />,
}

const FEATURE_PEEKS: Record<(typeof V2_FEATURES)[number]['peek'], ReactNode> = {
  board: <FeatureBoardPeek />,
  pay: <FeaturePayPeek />,
  track: <FeatureTrackPeek />,
}

function LandingNavV2({ onAsk }: { onAsk: () => void }) {
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
        <a className="heading-4" href="#faq" onClick={close}>
          FAQ
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

function HeroV2() {
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
          <span className="lp2-hero__title-line">from one terminal.</span>
        </h1>
        <p className="lp2-hero__sub body-3 lp2-rise" style={revealDelay(180)}>
          Bangladesh's #1 travel agency management software
        </p>
        <div className="lp2-hero__ctas lp2-rise" style={revealDelay(280)}>
          <a className="lp2-btn lp2-btn--navy button-md" href={subscribeUrl('growth')}>
            Subscribe now
            <ArrowRight size={18} weight="bold" />
          </a>
        </div>
      </div>
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
  const [activeId, setActiveId] = useState<(typeof V2_AUDIENCES)[number]['id']>(
    V2_AUDIENCES[0].id,
  )
  const active = V2_AUDIENCES.find((item) => item.id === activeId) ?? V2_AUDIENCES[0]
  const tablistId = useId()

  return (
    <section
      className="lp2-audiences lp2-paper"
      id="product"
      aria-labelledby="lp2-audiences-title"
    >
      <div className="lp2-wrap">
        <header className="lp2-display-head" data-reveal>
          <p className="lp2-display-head__eyebrow">Built for your desk</p>
          <h2 id="lp2-audiences-title" className="lp2-display-head__title">
            The work you already do
          </h2>
          <p className="lp2-display-head__note body-3">
            Same board for visas, packages, tickets, and your sub agent network.
          </p>
        </header>
        <div
          className="lp2-audiences__tabs"
          role="tablist"
          aria-labelledby="lp2-audiences-title"
          id={tablistId}
          data-reveal
        >
          {V2_AUDIENCES.map((item) => {
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
        <header className="lp2-display-head" data-reveal>
          <p className="lp2-display-head__eyebrow">Why switch</p>
          <h2 id="lp2-problem-title" className="lp2-display-head__title">
            From scattered work to one clear file
          </h2>
        </header>
        <div className="lp2-problem__grid" data-reveal>
          <article className="lp2-problem__card">
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
            <p className="lp2-problem__label caption-3">Today</p>
            <h3 className="lp2-problem__caption">
              Chats, sheets, and missed calls run the desk
            </h3>
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
            <p className="lp2-problem__label caption-3">With OneTrack</p>
            <h3 className="lp2-problem__caption">
              Docs, payments, and status in one place
            </h3>
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
          {V2_FEATURES.map((feature, index) => (
            <article
              key={feature.title}
              className="lp2-feature"
              data-reveal
              style={revealDelay(index * 70)}
            >
              <h3 className="lp2-feature__title">{feature.title}</h3>
              <div className="lp2-feature__visual">{FEATURE_PEEKS[feature.peek]}</div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

const CUSTOMIZE_MOTIONS: Record<(typeof V2_CUSTOMIZATIONS)[number]['icon'], ReactNode> = {
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
        <header className="lp2-section-head" data-reveal>
          <h2 id="lp2-customize-title" className="lp2-section-head__title">
            Make it match your desk
          </h2>
          <p className="lp2-section-head__note body-3">
            Services, stages, docs, and fields follow how you already work.
          </p>
        </header>
        <div className="lp2-customize__grid">
          {V2_CUSTOMIZATIONS.map((item, index) => (
            <article
              key={item.title}
              className="lp2-customize__card"
              data-reveal
              style={revealDelay(index * 70)}
            >
              <div className="lp2-customize__stage">{CUSTOMIZE_MOTIONS[item.icon]}</div>
              <h3 className="lp2-customize__title">{item.title}</h3>
              <p className="lp2-customize__detail body-6">{item.detail}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

const STEP_ICONS: Record<(typeof V2_SWITCH_STEPS)[number]['icon'], Icon> = {
  agency: Buildings,
  files: FolderPlus,
  link: LinkSimple,
}

const STEP_PHOTOS: Record<(typeof V2_SWITCH_STEPS)[number]['icon'], string> = {
  agency: 'images/landing/mockup-agency-desk.jpg',
  files: 'images/landing/mockup-service-board.jpg',
  link: 'images/landing/mockup-client-track.jpg',
}

const HOWTO_STEP_COUNT = V2_SWITCH_STEPS.length
const HOWTO_SLIDES = [...V2_SWITCH_STEPS, V2_SWITCH_STEPS[0]]

function HowItWorks() {
  const [slide, setSlide] = useState(0)
  const [withMotion, setWithMotion] = useState(true)
  const active = slide >= HOWTO_STEP_COUNT ? 0 : slide
  const progress = HOWTO_STEP_COUNT <= 1 ? 1 : active / (HOWTO_STEP_COUNT - 1)

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (media.matches) return

    const timer = window.setInterval(() => {
      setWithMotion(true)
      setSlide((current) => (current >= HOWTO_STEP_COUNT ? current : current + 1))
    }, 2000)

    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (withMotion || slide !== 0) return
    const frame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setWithMotion(true))
    })
    return () => window.cancelAnimationFrame(frame)
  }, [withMotion, slide])

  const handleTrackTransitionEnd = (event: TransitionEvent<HTMLDivElement>) => {
    if (event.propertyName !== 'transform') return
    if (slide < HOWTO_STEP_COUNT) return
    setWithMotion(false)
    setSlide(0)
  }

  return (
    <section
      className="lp2-howto lp2-paper"
      id="how-it-works"
      aria-labelledby="lp2-howto-title"
    >
      <div className="lp2-wrap">
        <header className="lp2-howto__head" data-reveal>
          <h2 id="lp2-howto-title" className="lp2-howto__title">
            Getting started
          </h2>
          <p className="lp2-howto__note body-3">
            Create your agency, add files, share a link.
          </p>
        </header>

        <div className="lp2-howto__layout" data-reveal>
          <div className="lp2-howto__visual">
            <div className="lp2-howto__photo">
              <div
                className={withMotion ? 'lp2-howto__track' : 'lp2-howto__track is-instant'}
                style={{ transform: `translate3d(-${slide * 100}%, 0, 0)` }}
                onTransitionEnd={handleTrackTransitionEnd}
              >
                {HOWTO_SLIDES.map((step, index) => (
                  <div className="lp2-howto__slide" key={`${step.icon}-${index}`}>
                    <img
                      src={publicUrl(STEP_PHOTOS[step.icon])}
                      alt=""
                      width={720}
                      height={720}
                      loading={index === 0 ? 'eager' : 'lazy'}
                      decoding="async"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <ol className="lp2-howto__steps" style={{ '--howto-progress': String(progress) } as CSSProperties}>
            {V2_SWITCH_STEPS.map((step, index) => {
              const StepIcon = STEP_ICONS[step.icon]
              const isActive = index === active
              return (
                <li key={step.number}>
                  <button
                    type="button"
                    className={isActive ? 'lp2-howto__step is-active' : 'lp2-howto__step'}
                    aria-current={isActive ? 'step' : undefined}
                    onClick={() => {
                      setWithMotion(true)
                      setSlide(index)
                    }}
                  >
                    <span className="lp2-howto__icon" aria-hidden>
                      <StepIcon size={28} weight="bold" />
                    </span>
                    <span className="lp2-howto__copy">
                      <span className="lp2-howto__step-title">{step.title}</span>
                      <span className="lp2-howto__step-detail">{step.detail}</span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ol>
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

function Faq() {
  return (
    <section className="lp2-faq lp2-paper" id="faq" aria-labelledby="lp2-faq-title">
      <div className="lp2-wrap">
        <header className="lp2-section-head" data-reveal>
          <h2 id="lp2-faq-title" className="lp2-section-head__title">
            Common questions
          </h2>
        </header>
        <div className="lp2-faq__list">
          {V2_FAQS.map((item, index) => (
            <details
              key={item.question}
              className="lp2-faq__item"
              data-reveal
              style={revealDelay((index % 4) * 40)}
            >
              <summary className="title-3">
                {item.question}
                <CaretDown className="lp2-faq__chevron" size={18} weight="bold" />
              </summary>
              <p className="body-6">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}

function FinalCall({ onAsk }: { onAsk: () => void }) {
  return (
    <section className="lp2-final lp2-paper" aria-labelledby="lp2-final-title">
      <div className="lp2-wrap lp2-final__inner" data-reveal>
        <p className="lp2-display-head__eyebrow">OneTrack</p>
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

function LandingFooterV2({ onAsk }: { onAsk: () => void }) {
  return (
    <footer className="lp2-footer">
      <div className="lp2-wrap lp2-footer__inner">
        <a className="lp2-nav__brand title-3" href="#top">
          <img src={publicUrl('images/logo.svg')} alt="" width={24} height={24} />
          OneTrack
        </a>
        <nav className="lp2-footer__links" aria-label="Footer">
          <a className="caption-2" href={appUrl('/login')}>
            Sign in
          </a>
          <a className="caption-2" href={appUrl('/track')}>
            Track a file
          </a>
          <button type="button" className="caption-2 lp2-text-btn lp2-text-btn--light" onClick={onAsk}>
            Ask us
          </button>
          <a className="caption-2" href={`mailto:${SALES_EMAIL}?subject=Privacy%20policy`}>
            Privacy
          </a>
          <a className="caption-2" href={`mailto:${SALES_EMAIL}?subject=Terms%20of%20use`}>
            Terms
          </a>
          <a className="caption-2" href={`mailto:${SALES_EMAIL}`}>
            {SALES_EMAIL}
          </a>
        </nav>
        <p className="caption-5">
          © {new Date().getFullYear()} Inventive Lab · Dhaka
        </p>
      </div>
    </footer>
  )
}

export default function LandingPageV2() {
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
      <LandingNavV2 onAsk={openAsk} />
      <main id="main">
        <HeroV2 />
        <ServiceTicker />
        <AudienceTabs />
        <ProblemSolution />
        <Features />
        <Customize />
        <HowItWorks />
        <Pricing onAsk={openAsk} />
        <Faq />
        <FinalCall onAsk={openAsk} />
      </main>
      <LandingFooterV2 onAsk={openAsk} />
      <LandingAskChat open={askOpen} onOpen={openAsk} onClose={closeAsk} />
      <AnnouncementPopupHost surface="landing" />
    </div>
  )
}
