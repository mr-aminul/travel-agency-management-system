import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { profileNavItem } from '@/config/layout'
import { APP_VERSION_LABEL } from '@/lib/appVersion'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { useBreakpoint } from './useBreakpoint'
import type { AppLayoutConfig, NavItem } from './types'

interface AppLayoutProps extends AppLayoutConfig {
  profileSubtext?: string
  onSignOut?: () => void
  userName?: string
}

function matchNavItem(
  pathname: string,
  navItems: NavItem[],
): NavItem | undefined {
  for (const item of navItems) {
    if (item.children?.length) {
      const childMatch = matchNavItem(pathname, item.children)
      if (childMatch) return childMatch
    }
    const exact = item.end ?? item.path === '/'
    const matches = exact
      ? pathname === item.path
      : pathname === item.path || pathname.startsWith(`${item.path}/`)
    if (matches) return item
  }
  return undefined
}

export function AppLayout({
  navItems,
  brand,
  profileSubtext,
  onSignOut,
  userName,
}: AppLayoutProps) {
  const { pathname } = useLocation()
  const { isMobile } = useBreakpoint()
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  useEffect(() => {
    if (!isMobile) setIsMobileOpen(false)
  }, [isMobile])

  // Pause shell glow while the tab is hidden — keeps compositor idle in background
  useEffect(() => {
    const syncMotionPause = () => {
      document.documentElement.classList.toggle(
        'pd-motion-paused',
        document.hidden,
      )
    }
    syncMotionPause()
    document.addEventListener('visibilitychange', syncMotionPause)
    return () => {
      document.removeEventListener('visibilitychange', syncMotionPause)
      document.documentElement.classList.remove('pd-motion-paused')
    }
  }, [])

  const currentNavItem =
    pathname === profileNavItem.path ||
      pathname.startsWith(`${profileNavItem.path}/`)
      ? profileNavItem
      : (matchNavItem(pathname, navItems) ?? navItems[0])

  const isFillPage =
    pathname === '/settings' || pathname.startsWith('/settings/')

  return (
    <div
      className={[
        'pd-app-shell',
        isMobile ? 'pd-app-shell--mobile' : '',
        isMobile && isMobileOpen ? 'pd-app-shell--mobile-nav-open' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="pd-app-shell__main">
        <Sidebar
          navItems={navItems}
          brand={brand}
          isMobile={isMobile}
          isMobileOpen={isMobileOpen}
          onMobileClose={() => setIsMobileOpen(false)}
        />
        <div className="pd-app-content">
          <div
            className={[
              'pd-app-content-card',
              isFillPage ? 'pd-app-content-card--fill' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <TopBar
              title={currentNavItem?.label ?? 'App'}
              titleIcon={currentNavItem?.icon}
              userName={userName}
              profileSubtext={profileSubtext}
              onSignOut={onSignOut}
              onMobileMenuOpen={() => setIsMobileOpen(true)}
              isMobile={isMobile}
            />
            <main
              className={[
                'pd-app-main',
                isFillPage ? 'pd-app-main--fill' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <Outlet />
            </main>
            <footer
              className="pd-app-footer"
              title={`App version ${APP_VERSION_LABEL}`}
            >
              <span className="pd-app-footer__version">{APP_VERSION_LABEL}</span>
            </footer>
          </div>
        </div>
      </div>
    </div>
  )
}
