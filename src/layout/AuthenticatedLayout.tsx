import { useCallback, useEffect, useMemo } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { AppLayout } from './AppLayout'
import { useAgencyProfile } from './useAgencyProfile'
import { useAuth } from '@/lib/auth'
import {
  DEFAULT_BRAND_NAME,
  resolveBrandDisplay,
} from '@/lib/agencyProfile'
import { settingsNavAlertCount } from '@/lib/agencyProfileGaps'
import { layoutConfig } from '@/config/layout'
import { findTenantMemberForUser } from '@/lib/tenantMembersStore'
import { canAccessPath } from '@/lib/pageAccess'
import { getPageAccessLevel } from '@/lib/userAccessStore'
import { buildAccessPageColumns } from '@/lib/accessPages'
import { useOpenPendingChangeCount } from '@/lib/subAgentPendingChanges'
import {
  filterNavItems,
  isPathAllowed,
  signedInHomePath,
} from '@/lib/modules'
import { queryClient } from '@/lib/queryClient'
import { useActiveTenant } from '@/lib/useActiveTenant'
import '@/styles/layout-shell.css'
import '@/styles/layout-search.css'

/* Shell-only font weights — login already has Inter 400/500 + PJ 800.
   PJ 500/700 are needed so top-bar breadcrumbs can stay medium vs bold
   instead of falling back to the only loaded PJ weight (800). */
import '@fontsource/inter/latin-600.css'
import '@fontsource/inter/latin-700.css'
import '@fontsource/plus-jakarta-sans/latin-500.css'
import '@fontsource/plus-jakarta-sans/latin-700.css'

const ACCESS_PAGES = buildAccessPageColumns(layoutConfig.navItems)

export default function AuthenticatedLayout() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { status, user, session, signOut } = useAuth()
  const agencyProfile = useAgencyProfile()
  const tenant = useActiveTenant()

  const member =
    user && user.role === 'agency_user'
      ? findTenantMemberForUser(tenant.id, user.id, user.email)
      : undefined
  const pendingApprovals = useOpenPendingChangeCount(tenant.id)

  const navItems = useMemo(() => {
    const role = user?.role ?? 'agency_user'
    const moduleFiltered = filterNavItems(
      layoutConfig.navItems,
      tenant.enabledModules,
      role,
    )
    const settingsBadge =
      role === 'platform_admin' || role === 'sub_agent'
        ? 0
        : settingsNavAlertCount(agencyProfile)

    const withBadges = (items: typeof moduleFiltered) =>
      items.map((item) => {
        if (item.path === '/settings' && settingsBadge > 0) {
          return { ...item, badgeCount: settingsBadge }
        }
        if (
          item.path === '/approvals' &&
          role === 'agency_user' &&
          pendingApprovals > 0
        ) {
          return { ...item, badgeCount: pendingApprovals }
        }
        return item
      })

    if (role === 'platform_admin' || role === 'sub_agent' || !user) {
      return withBadges(moduleFiltered)
    }

    const subjectId = member?.id ?? user.id
    const accessFiltered = moduleFiltered.flatMap((item) => {
      if (item.children?.length) {
        const children = item.children.filter((child) => {
          const col = ACCESS_PAGES.find((page) => page.path === child.path)
          if (!col) return true
          return getPageAccessLevel(subjectId, col.path) !== 'none'
        })
        if (children.length === 0) return []
        return [{ ...item, children }]
      }
      const col = ACCESS_PAGES.find((page) => page.path === item.path)
      if (!col) return [item]
      return getPageAccessLevel(subjectId, col.path) === 'none' ? [] : [item]
    })
    return withBadges(accessFiltered)
  }, [
    agencyProfile,
    tenant.enabledModules,
    user,
    member?.id,
    pendingApprovals,
  ])

  const brand = useMemo(() => {
    if (user?.role === 'platform_admin') {
      return {
        ...layoutConfig.brand,
        name: DEFAULT_BRAND_NAME,
        subtitle: 'Platform',
        logoUrl: layoutConfig.brand.logoUrl,
        isCustomLogo: false,
        preserveSubtitleCase: true,
      }
    }

    const resolved = resolveBrandDisplay(
      agencyProfile,
      layoutConfig.brand.logoUrl,
      tenant.name,
    )
    return {
      ...layoutConfig.brand,
      name: resolved.name,
      subtitle:
        user?.role === 'sub_agent'
          ? 'Sub agent portal'
          : resolved.subtitle,
      logoUrl: resolved.logoUrl,
      isCustomLogo: resolved.isCustomLogo,
      preserveSubtitleCase:
        user?.role === 'sub_agent' ? true : resolved.hasCustomName,
    }
  }, [agencyProfile, tenant.name, user?.role])

  useEffect(() => {
    document.title = brand.name
  }, [brand.name])

  const handleSignOut = useCallback(async () => {
    queryClient.clear()
    await signOut()
    navigate('/login', { replace: true })
  }, [navigate, signOut])

  if (status !== 'authenticated' || !user) {
    return <Navigate to="/login" replace />
  }

  if (session?.workspacePending) {
    return <Navigate to="/choose-workspace" replace />
  }

  if (user.role !== 'platform_admin' && tenant.status === 'suspended') {
    return (
      <div className="pd-page" aria-label="Suspended">
        <p role="alert">
          This agency is suspended. Contact support, then sign in again.
        </p>
        <button type="button" onClick={() => void handleSignOut()}>
          Sign out
        </button>
      </div>
    )
  }

  if (
    user.role === 'agency_user' &&
    member?.status === 'disabled'
  ) {
    return (
      <div className="pd-page" aria-label="Disabled">
        <p role="alert">
          Your account is disabled. Contact your agency owner.
        </p>
        <button type="button" onClick={() => void handleSignOut()}>
          Sign out
        </button>
      </div>
    )
  }

  const homePath = signedInHomePath(user.role)
  const pathBlocked =
    !isPathAllowed(pathname, tenant.enabledModules, user.role) ||
    !canAccessPath({
      role: user.role,
      userId: user.id,
      email: user.email,
      tenantId: tenant.id,
      pathname,
    })

  if (pathBlocked) {
    // Redirecting home→home loops forever and paints a blank shell.
    if (pathname === homePath) {
      return (
        <div className="pd-page" aria-label="No access">
          <p role="alert">
            You do not have access to this workspace. Contact your agency
            owner, then sign in again.
          </p>
          <button type="button" onClick={() => void handleSignOut()}>
            Sign out
          </button>
        </div>
      )
    }
    return <Navigate to={homePath} replace />
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AppLayout
        {...layoutConfig}
        navItems={navItems}
        brand={brand}
        userName={user.name}
        profileSubtext={user.email}
        onSignOut={handleSignOut}
      />
    </QueryClientProvider>
  )
}
