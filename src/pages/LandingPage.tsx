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
  ArrowRight,
  ArrowUpRight,
  ChatText,
  EnvelopeSimple,
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
import { FileLands } from '@/components/landing/stageshow/FileLands'
import { StatusLinkShow } from '@/components/landing/stageshow/StatusLinkShow'
import {
  DocumentsVignette,
  InvoiceVignette,
  ServiceBoardVignette,
  SmsVignette,
  SubAgentsVignette,
  TrackingVignette,
} from '@/components/landing/FeatureVignettes'
import {
  ANNUAL_PRICING_PLANS,
  PRICING_PLANS,
  SALES_EMAIL,
  SERVICE_TYPES,
  LANDING_AUDIENCES,
  LANDING_FEATURE_SHOW,
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

function LandingNav({ onAsk }: { onAsk: () => void }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isHidden, setIsHidden] = useState(false)
  const [isScrolled, setIsScrolled] = useState(
    () => typeof window !== 'undefined' && window.scrollY > 40,
  )
  const panelId = useId()
  const lastScrollY = useRef(0)
  const isOpenRef = useRef(isOpen)
  const isScrolledRef = useRef(isScrolled)

  useEffect(() => {
    isOpenRef.current = isOpen
  }, [isOpen])

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

  useEffect(() => {
    if (isOpen) setIsHidden(false)
  }, [isOpen])

  /** Outer shell stays fixed; inner pill gets `is-scrolled`. Hide only in island mode. */
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const islandEnter = 48
    const islandExit = 12
    const deltaThreshold = 8
    const topAlwaysShow = 64
    let ticking = false

    lastScrollY.current = window.scrollY

    const applyScroll = (currentY: number) => {
      const nextScrolled = isScrolledRef.current
        ? currentY > islandExit
        : currentY > islandEnter

      if (nextScrolled !== isScrolledRef.current) {
        isScrolledRef.current = nextScrolled
        setIsScrolled(nextScrolled)
      }

      if (isOpenRef.current || media.matches) {
        setIsHidden(false)
        return
      }

      const delta = currentY - lastScrollY.current
      if (currentY <= topAlwaysShow || !nextScrolled) {
        setIsHidden(false)
      } else if (delta > deltaThreshold) {
        setIsHidden(true)
      } else if (delta < -deltaThreshold) {
        setIsHidden(false)
      }
    }

    applyScroll(window.scrollY)

    const onScroll = () => {
      if (ticking) return
      ticking = true
      window.requestAnimationFrame(() => {
        const currentY = Math.max(0, window.scrollY)
        applyScroll(currentY)
        lastScrollY.current = currentY
        ticking = false
      })
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const close = () => setIsOpen(false)

  const navClass = [
    'lp2-nav',
    isOpen ? 'is-open' : '',
    isScrolled ? 'is-scrolled' : '',
    isHidden && !isOpen && isScrolled ? 'is-hidden' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <>
      <nav className={navClass} aria-label="Main">
        <div className="lp2-nav__shell">
          <a className="lp2-nav__brand title-3" href="#top" onClick={close} aria-label="OneTrack">
            <img src={publicUrl('images/logo.svg')} alt="" width={28} height={28} />
            <span className="lp2-nav__brand-text">OneTrack</span>
          </a>
          <div className="lp2-nav__end">
            <div className="lp2-nav__links">
              <a className="title-4 lp2-nav__link--desk" href="#features">
                Features
              </a>
              <a className="title-4 lp2-nav__link--desk" href="#product">
                Services
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
          </div>
        </div>
      </nav>
      <div
        id={panelId}
        className={isOpen ? 'lp2-nav__panel is-open' : 'lp2-nav__panel'}
        hidden={!isOpen}
      >
        <a className="heading-4" href="#features" onClick={close}>
          Features
        </a>
        <a className="heading-4" href="#product" onClick={close}>
          Services
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
        <p className="lp2-hero__kicker lp2-rise" style={revealDelay(40)}>
          Bangladesh's #1 Travel Agency Management Software
        </p>
        <h1 className="lp2-hero__title lp2-rise" id="lp2-hero-title" style={revealDelay(80)}>
          <span>Fly everything</span>
          <span className="lp2-hero__title-line">from one terminal</span>
        </h1>
        <div className="lp2-hero__ctas lp2-rise" style={revealDelay(180)}>
          <a className="lp2-btn lp2-btn--navy button-md" href={subscribeUrl('growth')}>
            Start free trial
            <ArrowRight size={18} weight="bold" />
          </a>
        </div>
      </div>
      <div
        className="lp2-hero__product lp2-rise"
        style={revealDelay(360)}
        aria-hidden
        data-ss-wide
        data-ss-fill
      >
        <FileLands />
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
            Made for Your Daily Agency Work
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

function DeskMoments() {
  return (
    <section
      className="lp2-moments lp2-paper"
      id="features"
      aria-labelledby="lp2-moments-title"
    >
      <div className="lp2-wrap lp2-wrap--film">
        <header className="lp2-section-head lp2-section-head--center" data-reveal>
          <h2 id="lp2-moments-title" className="lp2-section-head__title">
            {LANDING_FEATURE_SHOW.title}
          </h2>
        </header>
        <div className="lp2-moments__film" data-reveal aria-hidden>
          <StatusLinkShow />
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

function PricingTicket({ plan }: { plan: PricingPlan }) {
  return (
    <a
      className={plan.isFeatured ? 'lp2-ticket is-featured' : 'lp2-ticket'}
      href={subscribeUrl(plan.id)}
      aria-label={`Start trial — ${plan.name}`}
    >
      <div className="lp2-ticket__skin">
        {plan.isFeatured ? (
          <span className="lp2-ticket__badge">Popular</span>
        ) : null}
        <div className="lp2-ticket__main">
          <h3 className="lp2-ticket__name">{plan.name}</h3>
          <p className="lp2-ticket__fare">
            <span className="lp2-ticket__price">{formatTaka(plan.priceBdt)}</span>
            <span className="lp2-mono">
              / {plan.interval === 'year' ? 'yr' : 'mo'}
            </span>
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

function Pricing({ onAsk }: { onAsk: () => void }) {
  const [billing, setBilling] = useState<'month' | 'year'>('month')
  const plans = billing === 'year' ? ANNUAL_PRICING_PLANS : PRICING_PLANS

  return (
    <section
      className="lp2-pricing lp2-paper"
      id="pricing"
      aria-labelledby="lp2-pricing-title"
    >
      <div className="lp2-wrap">
        <header className="lp2-section-head lp2-section-head--center" data-reveal>
          <h2 id="lp2-pricing-title" className="lp2-section-head__title">
            Pricing Plans
          </h2>
          <p className="lp2-section-head__note body-3">
            Paid in Taka. 14 day trial, no card, no setup fee.
          </p>
          <div
            className="lp2-pricing__seg"
            role="group"
            aria-label="Billing period"
          >
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
              Annual
            </button>
          </div>
        </header>
        <div className="lp2-pricing__row" data-reveal>
          {plans.map((plan) => (
            <PricingTicket key={plan.id} plan={plan} />
          ))}
        </div>
        <p className="lp2-pricing__foot body-6" data-reveal>
          Need more seats or a short walkthrough?{' '}
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
        <h2 id="lp2-final-title" className="lp2-final__title">
          <span>Start Your Next File</span>
          <span>on OneTrack</span>
        </h2>
        <p className="lp2-final__risk body-3">
          Free for 14 days. No card needed. Or ask Inventive Lab for a short demo.
        </p>
        <div className="lp2-final__actions">
          <a className="lp2-btn lp2-btn--navy button-md" href={subscribeUrl('growth')}>
            Start Free Trial
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
              One board for travel and visa agencies in Bangladesh.
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

          {/* Mobile: one compact link strip. Desktop columns stay below. */}
          <nav className="lp2-footer__compact" aria-label="Footer">
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
            <a href="/faq">FAQ</a>
            <a href={appUrl('/login')}>Sign in</a>
            <a href={subscribeUrl('growth')}>Start trial</a>
            <button type="button" className="lp2-text-btn lp2-text-btn--light" onClick={onAsk}>
              Ask us
            </button>
          </nav>

          <nav className="lp2-footer__col lp2-footer__col--desktop" aria-label="Product">
            <p className="lp2-footer__heading">Product</p>
            <a href="#features">Features</a>
            <a href="#product">Services</a>
            <a href="#pricing">Pricing</a>
            <a href={appUrl('/track')}>Track a file</a>
          </nav>

          <nav className="lp2-footer__col lp2-footer__col--desktop" aria-label="Company">
            <p className="lp2-footer__heading">Company</p>
            <button type="button" className="lp2-text-btn lp2-text-btn--light" onClick={onAsk}>
              Ask Inventive Lab
            </button>
            <a href={appUrl('/login')}>Sign in</a>
            <a href={subscribeUrl('growth')}>Start 14 day trial</a>
            <a href={`mailto:${SALES_EMAIL}?subject=Privacy%20policy`}>Privacy</a>
            <a href={`mailto:${SALES_EMAIL}?subject=Terms%20of%20use`}>Terms</a>
          </nav>

          <nav className="lp2-footer__col lp2-footer__col--desktop" aria-label="Help">
            <p className="lp2-footer__heading">Help</p>
            <a href="/faq">FAQ</a>
            <a href={`mailto:${SALES_EMAIL}`}>Email support</a>
            <button type="button" className="lp2-text-btn lp2-text-btn--light" onClick={onAsk}>
              Ask us
            </button>
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
    document.title = 'OneTrack — One board for travel & visa agencies'
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
        <DeskMoments />
        <AudienceTabs />
        <Pricing onAsk={openAsk} />
        <FinalCall onAsk={openAsk} />
      </main>
      <LandingFooter onAsk={openAsk} />
      <LandingAskChat open={askOpen} onOpen={openAsk} onClose={closeAsk} />
      <AnnouncementPopupHost surface="landing" />
    </div>
  )
}
