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
import { filterNavItems, isPathAllowed, signedInHomePath } from '@/lib/modules'
import { queryClient } from '@/lib/queryClient'
import { useActiveTenant } from '@/lib/useActiveTenant'
import '@/styles/layout-shell.css'
import '@/styles/layout-search.css'

/* Shell-only font weights — login already has Inter 400/500 + PJ 800 */
import '@fontsource/inter/latin-600.css'
import '@fontsource/inter/latin-700.css'

export default function AuthenticatedLayout() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { status, user, signOut } = useAuth()
  const agencyProfile = useAgencyProfile()
  const tenant = useActiveTenant()

  const navItems = useMemo(
    () =>
      filterNavItems(
        layoutConfig.navItems,
        tenant.enabledModules,
        user?.role ?? 'agency_user',
      ),
    [tenant.enabledModules, user?.role],
  )

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
    )
    return {
      ...layoutConfig.brand,
      name: resolved.name,
      subtitle: resolved.subtitle,
      logoUrl: resolved.logoUrl,
      isCustomLogo: resolved.isCustomLogo,
      preserveSubtitleCase: resolved.hasCustomName,
    }
  }, [agencyProfile, user?.role])

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

  if (!isPathAllowed(pathname, tenant.enabledModules, user.role)) {
    return <Navigate to={signedInHomePath(user.role)} replace />
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
