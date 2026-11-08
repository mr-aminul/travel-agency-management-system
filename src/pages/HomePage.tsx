import { Navigate } from 'react-router-dom'
import { BusinessProfileSetupNotice } from '@/components/BusinessProfileSetupNotice'
import { HomeGlobalSearch } from '@/components/home/HomeGlobalSearch'
import { TodayFollowUps } from '@/components/home/TodayFollowUps'
import { PlatformTour } from '@/components/onboarding/PlatformTour'
import { useAgencyProfile } from '@/layout/useAgencyProfile'
import { agencyProfileIsIncomplete } from '@/lib/agencyProfileGaps'
import {
  dismissBusinessProfileNudge,
  useBusinessProfileNudgeState,
} from '@/lib/onboardingStore'
import { useAuth } from '@/lib/useAuth'
import '@/styles/layout-home.css'

export default function HomePage() {
  const { user } = useAuth()
  const agencyProfile = useAgencyProfile()
  const { dismissed: profileNudgeDismissed } = useBusinessProfileNudgeState()
  const showProfileNudge =
    agencyProfileIsIncomplete(agencyProfile) && !profileNudgeDismissed

  if (user?.role === 'platform_admin') {
    return <Navigate to="/admin" replace />
  }

  return (
    <div className="pd-page pd-page--elevated pd-home" aria-label="Home">
      {showProfileNudge ? (
        <BusinessProfileSetupNotice
          profile={agencyProfile}
          variant="home"
          onDismiss={() => dismissBusinessProfileNudge()}
        />
      ) : null}

      <HomeGlobalSearch />

      <TodayFollowUps />

      <PlatformTour />
    </div>
  )
}
