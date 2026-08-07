import { useCallback, useEffect, useMemo } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { AppLayout } from './AppLayout'
import { useAgencyProfile } from './useAgencyProfile'
import { useAuth } from '@/lib/auth'
import { resolveBrandDisplay } from '@/lib/agencyProfile'
import { layoutConfig } from '@/config/layout'
import { queryClient } from '@/lib/queryClient'
import '@/styles/layout-shell.css'

/* Shell-only font weights — login already has Inter 400/500 + PJ 800 */
import '@fontsource/inter/latin-600.css'
import '@fontsource/inter/latin-700.css'

export default function AuthenticatedLayout() {
  const navigate = useNavigate()
  const { status, user, signOut } = useAuth()
  const agencyProfile = useAgencyProfile()

  const brand = useMemo(() => {
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
  }, [agencyProfile])

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

  return (
    <QueryClientProvider client={queryClient}>
      <AppLayout
        {...layoutConfig}
        brand={brand}
        userName={user.name}
        profileSubtext={user.email}
        onSignOut={handleSignOut}
      />
    </QueryClientProvider>
  )
}
