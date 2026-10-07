import { useEffect, useMemo, useState } from 'react'
import {
  AGENCY_PROFILE_EVENT,
  AGENCY_PROFILE_KEY,
  agencyProfileStorageKey,
  readAgencyProfile,
  withBusinessNameFallback,
  type AgencyProfile,
} from '@/lib/agencyProfile'
import { useAuth } from '@/lib/useAuth'
import { useTenantById } from '@/lib/tenantsStore'
import { DEFAULT_TENANT_ID } from '@/types/tenant'

export function useAgencyProfile(): AgencyProfile {
  const { session } = useAuth()
  const tenantId = session?.tenantId ?? DEFAULT_TENANT_ID
  const tenant = useTenantById(tenantId)
  const [profile, setProfile] = useState(() => readAgencyProfile(tenantId))

  useEffect(() => {
    setProfile(readAgencyProfile(tenantId))
  }, [tenantId])

  useEffect(() => {
    const onProfileChange = (event: Event) => {
      const custom = event as CustomEvent<AgencyProfile>
      if (custom.detail) {
        setProfile(readAgencyProfile(tenantId))
        return
      }
      setProfile(readAgencyProfile(tenantId))
    }

    const onStorage = (event: StorageEvent) => {
      if (
        event.key === null ||
        event.key === AGENCY_PROFILE_KEY ||
        event.key === agencyProfileStorageKey(tenantId)
      ) {
        setProfile(readAgencyProfile(tenantId))
      }
    }

    window.addEventListener(AGENCY_PROFILE_EVENT, onProfileChange)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(AGENCY_PROFILE_EVENT, onProfileChange)
      window.removeEventListener('storage', onStorage)
    }
  }, [tenantId])

  return useMemo(
    () => withBusinessNameFallback(profile, tenant?.name),
    [profile, tenant?.name],
  )
}
