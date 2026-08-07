import { useEffect, useState } from 'react'
import {
  AGENCY_PROFILE_EVENT,
  AGENCY_PROFILE_KEY,
  readAgencyProfile,
  type AgencyProfile,
} from '@/lib/agencyProfile'

export function useAgencyProfile(): AgencyProfile {
  const [profile, setProfile] = useState(readAgencyProfile)

  useEffect(() => {
    const onProfileChange = (event: Event) => {
      const custom = event as CustomEvent<AgencyProfile>
      if (custom.detail) {
        setProfile(custom.detail)
        return
      }
      setProfile(readAgencyProfile())
    }

    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === AGENCY_PROFILE_KEY) {
        setProfile(readAgencyProfile())
      }
    }

    window.addEventListener(AGENCY_PROFILE_EVENT, onProfileChange)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(AGENCY_PROFILE_EVENT, onProfileChange)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  return profile
}
