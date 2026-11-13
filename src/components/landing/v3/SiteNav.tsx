import { useEffect, useId, useRef, useState } from 'react'
import { publicUrl } from '@/lib/publicUrl'
import { appUrl } from '@/lib/siteOrigins'
import { subscribeUrl } from './landingLinks'

const LINKS = [
  { href: '#features', label: 'Features' },
  { href: '#pricing', label: 'Pricing' },
  { href: '#faq', label: 'FAQ' },
] as const

export function SiteNav({ onAsk }: { onAsk: () => void }) {
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
              {LINKS.map((link) => (
                <a key={link.href} className="title-4" href={link.href}>
                  {link.label}
                </a>
              ))}
            </div>
            <div className="lp2-nav__actions">
              <a className="lp2-nav__signin button-sm" href={appUrl('/login')}>
                Sign in
              </a>
              <a className="lp2-btn lp2-btn--solid button-sm" href={subscribeUrl()}>
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
        {LINKS.map((link) => (
          <a key={link.href} className="heading-4" href={link.href} onClick={close}>
            {link.label}
          </a>
        ))}
        <a className="heading-4" href={appUrl('/track')} onClick={close}>
          Track a file
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
        <a className="lp2-btn lp2-btn--amber button-md" href={subscribeUrl()} onClick={close}>
          Start free trial
        </a>
      </div>
    </>
  )
}
