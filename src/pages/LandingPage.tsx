import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { ArrowRight, ArrowUpRight, Plane } from 'lucide-react'
import '@fontsource/inter/latin-400.css'
import '@fontsource/inter/latin-500.css'
import '@fontsource/inter/latin-600.css'
import '@fontsource/inter/latin-700.css'
import '@fontsource/plus-jakarta-sans/latin-600.css'
import '@fontsource/plus-jakarta-sans/latin-700.css'
import '@fontsource-variable/fraunces/opsz.css'
import '@fontsource/ibm-plex-mono/latin-500.css'
import {
  DocumentsVignette,
  InvoiceVignette,
  ServiceBoardVignette,
  SmsVignette,
  SubAgentsVignette,
  TrackingVignette,
} from '@/components/landing/FeatureVignettes'
import {
  JOURNEY_STOPS,
  PRICING_PLANS,
  SALES_EMAIL,
  SERVICE_TYPES,
  type PricingPlan,
} from '@/components/landing/landingContent'
import { publicUrl } from '@/lib/publicUrl'
import { appUrl } from '@/lib/siteOrigins'
import '@/styles/layout-landing.css'

const TRIAL_MAILTO = `mailto:${SALES_EMAIL}?subject=${encodeURIComponent(
  'OneTrack 14-day trial for our agency',
)}`

function formatTaka(amount: number): string {
  return `৳${amount.toLocaleString('en-IN')}`
}

function revealDelay(ms: number): CSSProperties {
  return { '--d': `${ms}ms` } as CSSProperties
}

/** Adds `is-revealed` to `[data-reveal]` descendants as they scroll into view. */
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
      { rootMargin: '0px 0px -12% 0px', threshold: 0.15 },
    )
    targets.forEach((target) => observer.observe(target))
    return () => observer.disconnect()
  }, [])

  return rootRef
}

function useHasScrolled(threshold = 24): boolean {
  const [hasScrolled, setHasScrolled] = useState(false)
  useEffect(() => {
    const handleScroll = () => setHasScrolled(window.scrollY > threshold)
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [threshold])
  return hasScrolled
}

function LandingNav() {
  const hasScrolled = useHasScrolled()
  return (
    <nav className={hasScrolled ? 'lp-nav is-scrolled' : 'lp-nav'} aria-label="Main">
      <a className="lp-nav__brand" href="#top">
        <img src={publicUrl('images/logo.svg')} alt="" width={30} height={30} />
        OneTrack
      </a>
      <div className="lp-nav__links">
        <a href="#features">Features</a>
        <a href="#journey">How it works</a>
        <a href="#pricing">Pricing</a>
      </div>
      <div className="lp-nav__actions">
        <a className="lp-nav__signin" href={appUrl('/login')}>
          Sign In
        </a>
        <a className="lp-btn lp-btn--solid-light lp-btn--sm" href={TRIAL_MAILTO}>
          <span className="lp-nav__cta-full">Start Free Trial</span>
          <span className="lp-nav__cta-short">Trial</span>
        </a>
      </div>
    </nav>
  )
}

function Hero() {
  return (
    <section className="lp-hero" id="top" aria-labelledby="lp-hero-title">
      <img
        className="lp-hero__sky"
        src={publicUrl('images/landing/starry-sky-clouds-background.jpg')}
        alt=""
        width={1920}
        height={1080}
        decoding="async"
        fetchPriority="high"
      />
      <div className="lp-hero__inner">
        <h1 className="lp-hero__title lp-rise" id="lp-hero-title" style={revealDelay(80)}>
          <span>Fly everything</span>
          <span className="lp-hero__title-line">from one terminal.</span>
        </h1>
        <div className="lp-hero__ctas lp-rise" style={revealDelay(280)}>
          <a className="lp-btn lp-btn--navy" href={TRIAL_MAILTO}>
            Start 14-Day Trial
            <ArrowRight size={18} strokeWidth={2.25} />
          </a>
          <a className="lp-btn lp-btn--solid-light" href="#features">
            Features
          </a>
        </div>
      </div>
    </section>
  )
}

function ServiceTicker() {
  const items = [...SERVICE_TYPES, ...SERVICE_TYPES]
  return (
    <div className="lp-ticker" aria-label={`Services: ${SERVICE_TYPES.join(', ')}`}>
      <div className="lp-ticker__track" aria-hidden>
        {items.map((service, index) => (
          <span key={`${service}-${index}`}>
            {service}
            <Plane size={14} strokeWidth={2} />
          </span>
        ))}
      </div>
    </div>
  )
}

function Manifesto() {
  return (
    <section className="lp-manifesto lp-paper" aria-labelledby="lp-manifesto-title">
      <div className="lp-wrap lp-manifesto__grid">
        <p className="lp-margin-note" data-reveal>
          <span className="lp-mono">§ 01</span>
          Why agencies switch
        </p>
        <h2 id="lp-manifesto-title" className="lp-manifesto__text" data-reveal>
          Most agencies run on WhatsApp and{' '}
          <mark>one person who remembers everything.</mark>{' '}
          OneTrack puts that memory on one board.
        </h2>
      </div>
    </section>
  )
}

type Feature = {
  number: string
  kicker: string
  title: string
  body: string
  vignette: ReactNode
  size: 'wide' | 'tall' | 'regular'
}

const FEATURES: readonly Feature[] = [
  {
    number: '01',
    kicker: 'Service board',
    title: 'See every file at once.',
    body: 'All eight services, stage by stage, on one board.',
    vignette: <ServiceBoardVignette />,
    size: 'wide',
  },
  {
    number: '02',
    kicker: 'Payments',
    title: 'Know who owes what.',
    body: 'Invoices, partial payments and a shareable link.',
    vignette: <InvoiceVignette />,
    size: 'tall',
  },
  {
    number: '03',
    kicker: 'Documents',
    title: 'Passports you can find.',
    body: 'Checklists and a vault per service.',
    vignette: <DocumentsVignette />,
    size: 'regular',
  },
  {
    number: '04',
    kicker: 'Sub agents',
    title: 'Grow through your network.',
    body: 'Each sub agent gets a link. You approve.',
    vignette: <SubAgentsVignette />,
    size: 'regular',
  },
  {
    number: '05',
    kicker: 'Client tracking',
    title: 'Fewer "any update?" calls.',
    body: 'Clients check status with a passport number.',
    vignette: <TrackingVignette />,
    size: 'regular',
  },
  {
    number: '06',
    kicker: 'SMS updates',
    title: 'Updates that send themselves.',
    body: 'Templated SMS, filled in for you.',
    vignette: <SmsVignette />,
    size: 'wide',
  },
]

function Features() {
  return (
    <section className="lp-features lp-paper" id="features" aria-labelledby="lp-features-title">
      <div className="lp-wrap">
        <header className="lp-section-head" data-reveal>
          <p className="lp-mono lp-section-head__kicker">Features</p>
          <h2 id="lp-features-title" className="lp-section-head__title">
            One desk. <em>One</em> board.
          </h2>
        </header>
        <div className="lp-features__grid">
          {FEATURES.map((feature, index) => (
            <article
              key={feature.number}
              className={`lp-feature lp-feature--${feature.size}`}
              data-reveal
              style={revealDelay((index % 3) * 90)}
            >
              <div className="lp-feature__meta">
                <span className="lp-mono">{feature.number}</span>
                <span className="lp-mono">{feature.kicker}</span>
              </div>
              <div className="lp-feature__stage">{feature.vignette}</div>
              <h3 className="lp-feature__title">{feature.title}</h3>
              <p className="lp-feature__body">{feature.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function Journey() {
  return (
    <section className="lp-journey" id="journey" aria-labelledby="lp-journey-title">
      <div className="lp-wrap">
        <header className="lp-section-head lp-section-head--dark" data-reveal>
          <p className="lp-mono lp-section-head__kicker">How it works</p>
          <h2 id="lp-journey-title" className="lp-section-head__title">
            Intake to <em>delivered.</em>
          </h2>
        </header>
        <div className="lp-route" data-reveal>
          <span className="lp-route__line" aria-hidden />
          <span className="lp-route__plane" aria-hidden>
            <Plane size={20} strokeWidth={1.75} />
          </span>
          <ol className="lp-route__stops">
            {JOURNEY_STOPS.map((stop, index) => (
              <li
                key={stop.code}
                className="lp-route__stop"
                style={revealDelay(300 + index * 220)}
              >
                <span className="lp-route__dot" aria-hidden />
                <span className="lp-route__code">{stop.code}</span>
                <h3>{stop.title}</h3>
                <p>{stop.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}

function Barcode() {
  return <span className="lp-barcode" aria-hidden />
}

function PricingTicket({ plan, index }: { plan: PricingPlan; index: number }) {
  return (
    <article
      className={plan.isFeatured ? 'lp-ticket is-featured' : 'lp-ticket'}
      data-reveal
      style={revealDelay(index * 110)}
    >
      <div className="lp-ticket__main">
        <div className="lp-ticket__top">
          <span className="lp-mono">Class</span>
          {plan.isFeatured ? <span className="lp-ticket__badge">Most booked</span> : null}
        </div>
        <h3 className="lp-ticket__name">{plan.name}</h3>
        <p className="lp-ticket__tagline">{plan.tagline}</p>
        <p className="lp-ticket__fare">
          <span className="lp-ticket__price">{formatTaka(plan.priceBdt)}</span>
          <span className="lp-mono">/ month</span>
        </p>
        <ul className="lp-ticket__perks">
          {plan.perks.map((perk) => (
            <li key={perk}>{perk}</li>
          ))}
        </ul>
      </div>
      <div className="lp-ticket__stub">
        <div>
          <span className="lp-mono">Seat</span>
          <strong>{plan.seatCode}</strong>
        </div>
        <div>
          <span className="lp-mono">Gate</span>
          <strong>0{index + 1}</strong>
        </div>
        <Barcode />
        <a className="lp-ticket__board" href={TRIAL_MAILTO}>
          Board
          <ArrowUpRight size={16} strokeWidth={2.25} />
        </a>
      </div>
    </article>
  )
}

function Pricing() {
  return (
    <section className="lp-pricing lp-paper" id="pricing" aria-labelledby="lp-pricing-title">
      <div className="lp-wrap">
        <header className="lp-section-head" data-reveal>
          <p className="lp-mono lp-section-head__kicker">Pricing · BDT / month</p>
          <h2 id="lp-pricing-title" className="lp-section-head__title">
            Choose your <em>class.</em>
          </h2>
          <p className="lp-section-head__lede">
            14 days free on Growth. All services on every plan.
          </p>
        </header>
        <div className="lp-pricing__row">
          {PRICING_PLANS.map((plan, index) => (
            <PricingTicket key={plan.id} plan={plan} index={index} />
          ))}
        </div>
      </div>
    </section>
  )
}

function FinalCall() {
  return (
    <section className="lp-final" aria-labelledby="lp-final-title">
      <div className="lp-wrap lp-final__inner" data-reveal>
        <p className="lp-mono lp-final__gate">
          <span className="lp-board__lamp" aria-hidden />
          Gate open
        </p>
        <h2 id="lp-final-title" className="lp-final__title">
          Now <em>boarding.</em>
        </h2>
        <p className="lp-final__lede">Your agency. One board. This week.</p>
        <div className="lp-hero__ctas">
          <a className="lp-btn lp-btn--amber" href={TRIAL_MAILTO}>
            Start a 14-day trial
            <ArrowRight size={18} strokeWidth={2.25} />
          </a>
          <a className="lp-btn lp-btn--ghost" href={appUrl('/login')}>
            Sign in
          </a>
        </div>
      </div>
    </section>
  )
}

function LandingFooter() {
  return (
    <footer className="lp-footer">
      <div className="lp-wrap lp-footer__inner">
        <a className="lp-nav__brand" href="#top">
          <img src={publicUrl('images/logo.svg')} alt="" width={26} height={26} />
          OneTrack
        </a>
        <nav className="lp-footer__links" aria-label="Footer">
          <a href={appUrl('/login')}>Sign in</a>
          <a href={appUrl('/track')}>Track a file</a>
          <a href={`mailto:${SALES_EMAIL}`}>{SALES_EMAIL}</a>
        </nav>
        <p className="lp-mono">© {new Date().getFullYear()} Inventive Lab · Dhaka</p>
      </div>
    </footer>
  )
}

function useIntroRustFont() {
  useEffect(() => {
    const styleId = 'lp-intro-rust-font'
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

export default function LandingPage() {
  const rootRef = useRevealOnScroll<HTMLDivElement>()
  useIntroRustFont()

  useEffect(() => {
    document.title = 'OneTrack · The operations desk for travel agencies'
  }, [])

  return (
    <div className="lp" ref={rootRef}>
      <LandingNav />
      <main>
        <Hero />
        <ServiceTicker />
        <Manifesto />
        <Features />
        <Journey />
        <Pricing />
        <FinalCall />
      </main>
      <LandingFooter />
    </div>
  )
}
