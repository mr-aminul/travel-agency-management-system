import { useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react'
import { ArrowRight } from '@phosphor-icons/react'
import { SALES_EMAIL } from '@/components/landing/landingContent'
import { publicUrl } from '@/lib/publicUrl'
import { appUrl } from '@/lib/siteOrigins'
import { subscribeUrl } from './landingLinks'
import { clamp01, usePrefersReducedMotion } from './sceneHooks'

/** 0 while the sunrise is below the fold, 1 once it is fully on screen. */
function useSunriseProgress(ref: RefObject<HTMLDivElement | null>, isEnabled: boolean): number {
  const [progress, setProgress] = useState(isEnabled ? 0 : 1)

  useEffect(() => {
    if (!isEnabled) return
    let frame = 0
    const measure = () => {
      frame = 0
      const element = ref.current
      if (!element) return
      const rect = element.getBoundingClientRect()
      setProgress(clamp01((window.innerHeight - rect.top) / rect.height))
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure)
    }
    measure()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
  }, [ref, isEnabled])

  return progress
}

export function SiteFooter({ onAsk }: { onAsk: () => void }) {
  const sunriseRef = useRef<HTMLDivElement>(null)
  const isLive = !usePrefersReducedMotion()
  const sunrise = useSunriseProgress(sunriseRef, isLive)

  return (
    <footer className="site-footer" data-nav-dark>
      <div className="wrap-wide">
        <div className="foot-cta">
          <h2 data-enter>Put your next file on OneTrack.</h2>
          <div className="foot-install" data-enter style={{ '--enter-i': 2 } as CSSProperties}>
            <a className="btn btn-light foot-cta-btn" href={subscribeUrl()}>
              Start 14 day free trial
              <ArrowRight className="arrow" weight="bold" />
            </a>
          </div>
          <p data-enter style={{ '--enter-i': 3 } as CSSProperties}>
            No card needed. Pick a plan when the trial ends.
          </p>
        </div>

        <div className="foot-grid">
          <div className="foot-brand">
            <a className="nav-logo" href="#top">
              <img src={publicUrl('images/logo.svg')} alt="" width={22} height={22} />
              OneTrack
            </a>
            <p>One board for travel and visa agencies in Bangladesh. Made by Inventive Lab in Dhaka.</p>
          </div>
          <nav className="foot-col" aria-label="Product">
            <h3>Product</h3>
            <ul>
              <li>
                <a href="#features">Features</a>
              </li>
              <li>
                <a href="#pricing">Pricing</a>
              </li>
              <li>
                <a href={appUrl('/track')}>Track a file</a>
              </li>
            </ul>
          </nav>
          <nav className="foot-col" aria-label="Account">
            <h3>Account</h3>
            <ul>
              <li>
                <a href={subscribeUrl()}>Start free trial</a>
              </li>
              <li>
                <a href={appUrl('/login')}>Sign in</a>
              </li>
              <li>
                <button type="button" onClick={onAsk}>
                  Ask Inventive Lab
                </button>
              </li>
            </ul>
          </nav>
          <nav className="foot-col" aria-label="Help">
            <h3>Help</h3>
            <ul>
              <li>
                <a href="#faq">FAQ</a>
              </li>
              <li>
                <a href={`mailto:${SALES_EMAIL}`}>Email support</a>
              </li>
              <li>
                <a href={`mailto:${SALES_EMAIL}?subject=Privacy%20policy`}>Privacy</a>
              </li>
            </ul>
          </nav>
        </div>

        <div className="foot-legal">
          <span>© {new Date().getFullYear()} Inventive Lab · Dhaka</span>
          <a href={`mailto:${SALES_EMAIL}`}>{SALES_EMAIL}</a>
        </div>
      </div>

      <div
        className="foot-sunrise"
        ref={sunriseRef}
        aria-hidden
        data-awake={sunrise > 0.2 ? '' : undefined}
        style={
          {
            '--fs-drop': `${0.28 * (1 - sunrise)}em`,
            '--fs-scale': 0.72 + 0.28 * sunrise,
            '--fs-o': 0.4 + 0.6 * sunrise,
            '--fs-mark': sunrise,
          } as CSSProperties
        }
      >
        <span className="fs-glow" />
        <div className="fs-brand">
          <img className="fs-mark" src={publicUrl('images/logo.svg')} alt="" />
          <span className="fs-name">OneTrack</span>
        </div>
      </div>
    </footer>
  )
}
