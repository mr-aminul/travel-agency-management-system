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
import { layoutConfig } from '@/config/layout'
import { findTenantMemberForUser } from '@/lib/tenantMembersStore'
import { canAccessPath } from '@/lib/pageAccess'
import { getPageAccessLevel } from '@/lib/userAccessStore'
import { buildAccessPageColumns } from '@/lib/accessPages'
import {
  filterNavItems,
  isPathAllowed,
  signedInHomePath,
} from '@/lib/modules'
import { queryClient } from '@/lib/queryClient'
import { useActiveTenant } from '@/lib/useActiveTenant'
import '@/styles/layout-shell.css'
import '@/styles/layout-search.css'

/* Shell-only font weights — login already has Inter 400/500 + PJ 800 */
import '@fontsource/inter/latin-600.css'
import '@fontsource/inter/latin-700.css'

const ACCESS_PAGES = buildAccessPageColumns(layoutConfig.navItems)

export default function AuthenticatedLayout() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { status, user, signOut } = useAuth()
  const agencyProfile = useAgencyProfile()
  const tenant = useActiveTenant()

  const member =
    user && user.role !== 'platform_admin'
      ? findTenantMemberForUser(tenant.id, user.id, user.email)
      : undefined

  const navItems = useMemo(() => {
    const role = user?.role ?? 'agency_user'
    const moduleFiltered = filterNavItems(
      layoutConfig.navItems,
      tenant.enabledModules,
      role,
    )
    if (role === 'platform_admin' || !user) return moduleFiltered

    const subjectId = member?.id ?? user.id
    return moduleFiltered.flatMap((item) => {
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
  }, [tenant.enabledModules, user, member?.id])

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
      subtitle: resolved.subtitle,
      logoUrl: resolved.logoUrl,
      isCustomLogo: resolved.isCustomLogo,
      preserveSubtitleCase: resolved.hasCustomName,
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

  if (user.role !== 'platform_admin' && member?.status === 'disabled') {
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
