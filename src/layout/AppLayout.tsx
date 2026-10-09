import { Fragment, useCallback, useState, useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { profileNavItem } from '@/config/layout'
import { ADMIN_AGENCIES } from '@/lib/adminPaths'
import { APP_VERSION_LABEL } from '@/lib/appVersion'
import { useTenantById } from '@/lib/tenantsStore'
import { useAuth } from '@/lib/useAuth'
import type { BreadcrumbItem } from '@/components/ui'
import { pageIdentity } from './pageIdentity'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { GlobalSearchProvider } from './GlobalSearchProvider'
import { useBreakpoint } from './useBreakpoint'
import type { AppLayoutConfig, NavItem } from './types'

function adminAgencyIdFromPath(pathname: string): string | undefined {
  const match = pathname.match(/^\/admin\/(?:agencies|tenants)\/([^/]+)/)
  return match?.[1]
}

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
  const navigate = useNavigate()
  const { user, actor, isViewingAs, stopViewAs } = useAuth()
  const { isMobile } = useBreakpoint()
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [exitBusy, setExitBusy] = useState(false)

  const handleStopViewAs = useCallback(async () => {
    setExitBusy(true)
    try {
      await stopViewAs()
      const { takeSupportReturnPath } = await import('@/lib/adminPaths')
      navigate(takeSupportReturnPath('/admin'), { replace: true })
    } finally {
      setExitBusy(false)
    }
  }, [navigate, stopViewAs])

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

  const agencyId = adminAgencyIdFromPath(pathname)
  const agencyTenant = useTenantById(agencyId ?? '')
  const topBarBreadcrumbs: BreadcrumbItem[] | undefined = agencyId
    ? [
        { label: 'Agencies', href: ADMIN_AGENCIES },
        { label: agencyTenant?.name ?? 'Agency' },
      ]
    : undefined

  const isFillPage =
    pathname === '/settings' ||
    pathname.startsWith('/settings/') ||
    pathname.endsWith('/invoice')

  return (
    <GlobalSearchProvider>
      <div
        className={[
          'pd-app-shell',
          isViewingAs ? 'pd-app-shell--support-mode' : '',
          isMobile ? 'pd-app-shell--mobile' : '',
          isMobile && isMobileOpen ? 'pd-app-shell--mobile-nav-open' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {isViewingAs ? (
          <div className="pd-impersonation-banner" role="status">
            <span>
              Support Mode — viewing as{' '}
              <strong>{user?.name ?? 'user'}</strong>
              {actor?.name ? ` · signed in as ${actor.name}` : null}
            </span>
            <button
              type="button"
              className="pd-impersonation-banner__action"
              disabled={exitBusy}
              onClick={() => void handleStopViewAs()}
            >
              Exit
            </button>
          </div>
        ) : null}
        <div className="pd-app-shell__main">
          <Sidebar
            navItems={navItems}
            brand={brand}
            isMobile={isMobile}
            isMobileOpen={isMobileOpen}
            onMobileClose={() => setIsMobileOpen(false)}
          />
          <div className="pd-app-content">
            <div className="pd-app-content-card">
              <TopBar
                title={currentNavItem?.label ?? 'App'}
                titleIcon={currentNavItem?.icon}
                breadcrumbs={topBarBreadcrumbs}
                userName={userName}
                profileSubtext={profileSubtext}
                onSignOut={onSignOut}
                onMobileMenuOpen={() => setIsMobileOpen(true)}
                isMobile={isMobile}
              />
              {/*
               * The only scroll container for page content. It sits below the
               * transparent top bar so page sticky chrome cannot paint over it.
               */}
              <div
                className={[
                  'pd-app-scroll',
                  isFillPage ? 'pd-app-scroll--fill' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <main
                  className={[
                    'pd-app-main',
                    isFillPage ? 'pd-app-main--fill' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <Fragment key={pageIdentity(pathname)}>
                    <Outlet />
                  </Fragment>
                </main>
              </div>
              {/* Outside the scroller: the version label floats so it costs no page height. */}
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
    </GlobalSearchProvider>
  )
}
