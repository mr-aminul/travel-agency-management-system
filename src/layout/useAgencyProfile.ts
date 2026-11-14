import { useEffect, useMemo, useState } from 'react'
import {
  AGENCY_PROFILE_EVENT,
  AGENCY_PROFILE_KEY,
  agencyProfileStorageKey,
  readAgencyProfile,
  seedAgencyProfileBusinessName,
  withBusinessNameFallback,
  type AgencyProfile,
} from '@/lib/agencyProfile'
import { DATA_KEYS } from '@/lib/data/keys'
import { useAuth } from '@/lib/useAuth'
import { useTenantById } from '@/lib/tenantsStore'
import { DEFAULT_TENANT_ID } from '@/types/tenant'

function refreshProfile(
  tenantId: string,
  tenantName?: string,
): AgencyProfile {
  if (tenantName?.trim()) {
    seedAgencyProfileBusinessName(tenantId, tenantName)
  }
  return readAgencyProfile(tenantId)
}

export function useAgencyProfile(): AgencyProfile {
  const { session } = useAuth()
  const tenantId = session?.tenantId ?? DEFAULT_TENANT_ID
  const tenant = useTenantById(tenantId)
  const [profile, setProfile] = useState(() =>
    refreshProfile(tenantId, tenant?.name),
  )

  useEffect(() => {
    setProfile(refreshProfile(tenantId, tenant?.name))
  }, [tenantId, tenant?.name])

  useEffect(() => {
    const sync = () => {
      setProfile(refreshProfile(tenantId, tenant?.name))
    }

    const onStorage = (event: StorageEvent) => {
      if (
        event.key === null ||
        event.key === AGENCY_PROFILE_KEY ||
        event.key === agencyProfileStorageKey(tenantId) ||
        event.key === DATA_KEYS.agencyProfiles
      ) {
        sync()
      }
    }

    window.addEventListener(AGENCY_PROFILE_EVENT, sync)
    window.addEventListener('pd-data-rehydrated', sync)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(AGENCY_PROFILE_EVENT, sync)
      window.removeEventListener('pd-data-rehydrated', sync)
      window.removeEventListener('storage', onStorage)
    }
  }, [tenantId, tenant?.name])

  return useMemo(
    () => withBusinessNameFallback(profile, tenant?.name),
    [profile, tenant?.name],
  )
}
