import { useEffect, useRef, useState } from 'react'
import { ArrowRight } from '@phosphor-icons/react'
import { publicUrl } from '@/lib/publicUrl'
import { appUrl } from '@/lib/siteOrigins'
import { subscribeUrl } from './landingLinks'

const NAV_LINKS = [
  { href: '#features', label: 'Features' },
  { href: '#pricing', label: 'Pricing' },
  { href: '#faq', label: 'FAQ' },
] as const

const NAV_PROBE_Y = 43

type NavLook = { isOnLight: boolean; isDark: boolean; isTucked: boolean }

function readNavLook(previousY: number, wasTucked: boolean): NavLook {
  const y = window.scrollY
  const heroTop = document.querySelector('.hero-top')
  const heroBottom = heroTop ? heroTop.getBoundingClientRect().bottom : 0
  const isOnLight = heroBottom < NAV_PROBE_Y + 30

  const isDark = Array.from(document.querySelectorAll('[data-nav-dark]')).some((section) => {
    const rect = section.getBoundingClientRect()
    return rect.top <= NAV_PROBE_Y && rect.bottom >= NAV_PROBE_Y
  })

  const delta = y - previousY
  let isTucked = wasTucked
  if (y < 120) isTucked = false
  else if (delta > 6) isTucked = true
  else if (delta < -6) isTucked = false

  return { isOnLight, isDark, isTucked }
}

export function SiteNav() {
  const [look, setLook] = useState<NavLook>({ isOnLight: false, isDark: false, isTucked: false })
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const lastYRef = useRef(0)

  useEffect(() => {
    let frame = 0
    const update = () => {
      frame = 0
      setLook((previous) => {
        const next = readNavLook(lastYRef.current, previous.isTucked)
        lastYRef.current = window.scrollY
        const isSame =
          next.isOnLight === previous.isOnLight &&
          next.isDark === previous.isDark &&
          next.isTucked === previous.isTucked
        return isSame ? previous : next
      })
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
  }, [])

  const classNames = ['nav', look.isOnLight && 'on-light', look.isDark && 'is-dark'].filter(Boolean).join(' ')
  const closeMenu = () => setIsMenuOpen(false)

  return (
    <nav className={classNames} data-tucked={look.isTucked && !isMenuOpen} aria-label="Main">
      <a className="nav-logo" href="#top">
        <img src={publicUrl('images/logo.svg')} alt="" width={22} height={22} />
        OneTrack
      </a>
      <div className="nav-links">
        {NAV_LINKS.map((link) => (
          <a key={link.href} href={link.href}>
            {link.label}
          </a>
        ))}
      </div>
      <div className="nav-end">
        <a className="nav-signin" href={appUrl('/login')}>
          Sign in
        </a>
        <a className="nav-cta" href={subscribeUrl()}>
          Start free trial
          <ArrowRight weight="bold" />
        </a>
        <button
          type="button"
          className="nav-menu-btn"
          aria-expanded={isMenuOpen}
          aria-controls="nav-panel"
          aria-label="Menu"
          onClick={() => setIsMenuOpen((open) => !open)}
        >
          <span />
        </button>
      </div>
      <div className="nav-panel" id="nav-panel" data-open={isMenuOpen}>
        {NAV_LINKS.map((link) => (
          <a key={link.href} href={link.href} onClick={closeMenu}>
            {link.label}
          </a>
        ))}
        <a href={appUrl('/track')} onClick={closeMenu}>
          Track a file
        </a>
        <a href={appUrl('/login')} onClick={closeMenu}>
          Sign in
        </a>
      </div>
    </nav>
  )
}
