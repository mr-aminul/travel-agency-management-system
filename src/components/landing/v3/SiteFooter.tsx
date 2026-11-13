import { ChatCircle, EnvelopeSimple, MagnifyingGlass, MapPin } from '@phosphor-icons/react'
import { SALES_EMAIL } from '@/components/landing/landingContent'
import { publicUrl } from '@/lib/publicUrl'
import { appUrl } from '@/lib/siteOrigins'
import { subscribeUrl } from './landingLinks'

export function SiteFooter({ onAsk }: { onAsk: () => void }) {
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

            <div className="lp2-footer__actions" aria-label="Quick links">
              <a
                className="lp2-footer__action"
                href={`mailto:${SALES_EMAIL}`}
                aria-label="Email support"
              >
                <EnvelopeSimple size={18} weight="bold" aria-hidden />
              </a>
              <button
                type="button"
                className="lp2-footer__action"
                onClick={onAsk}
                aria-label="Ask us"
              >
                <ChatCircle size={18} weight="bold" aria-hidden />
              </button>
              <a className="lp2-footer__action" href={appUrl('/track')} aria-label="Track a file">
                <MagnifyingGlass size={18} weight="bold" aria-hidden />
              </a>
            </div>

            <nav className="lp2-footer__compact" aria-label="Footer">
              <a href="#features">Features</a>
              <a href="#pricing">Pricing</a>
              <a href="#faq">FAQ</a>
              <a href={appUrl('/track')}>Track a file</a>
              <a href={appUrl('/login')}>Sign in</a>
              <a href={subscribeUrl()}>Start trial</a>
              <button type="button" className="lp2-text-btn lp2-text-btn--light" onClick={onAsk}>
                Ask us
              </button>
            </nav>

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

          <nav className="lp2-footer__col lp2-footer__col--desktop" aria-label="Product">
            <p className="lp2-footer__heading">Product</p>
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
            <a href={appUrl('/track')}>Track a file</a>
          </nav>

          <nav className="lp2-footer__col lp2-footer__col--desktop" aria-label="Company">
            <p className="lp2-footer__heading">Company</p>
            <button type="button" className="lp2-text-btn lp2-text-btn--light" onClick={onAsk}>
              Ask Inventive Lab
            </button>
            <a href={appUrl('/login')}>Sign in</a>
            <a href={subscribeUrl()}>Start 14 day trial</a>
            <a href={`mailto:${SALES_EMAIL}?subject=Privacy%20policy`}>Privacy</a>
            <a href={`mailto:${SALES_EMAIL}?subject=Terms%20of%20use`}>Terms</a>
          </nav>

          <nav className="lp2-footer__col lp2-footer__col--desktop" aria-label="Help">
            <p className="lp2-footer__heading">Help</p>
            <a href="#faq">FAQ</a>
            <a href={`mailto:${SALES_EMAIL}`}>Email support</a>
            <button type="button" className="lp2-text-btn lp2-text-btn--light" onClick={onAsk}>
              Ask us
            </button>
          </nav>
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
