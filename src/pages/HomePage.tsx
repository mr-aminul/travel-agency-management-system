import { Link, Navigate } from 'react-router-dom'
import {
  ClipboardList,
  FileText,
  Handshake,
  LayoutDashboard,
  UserRoundSearch,
  Users,
  UsersRound,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { BusinessProfileSetupNotice } from '@/components/BusinessProfileSetupNotice'
import { HomeGlobalSearch } from '@/components/home/HomeGlobalSearch'
import { TodayFollowUps } from '@/components/home/TodayFollowUps'
import { PlatformTour } from '@/components/onboarding/PlatformTour'
import { useAgencyProfile } from '@/layout/useAgencyProfile'
import { agencyProfileIsIncomplete } from '@/lib/agencyProfileGaps'
import { useClients } from '@/lib/clientsStore'
import { isPathAllowed } from '@/lib/modules'
import {
  dismissBusinessProfileNudge,
  useBusinessProfileNudgeState,
} from '@/lib/onboardingStore'
import { useActiveTenant } from '@/lib/useActiveTenant'
import { useAuth } from '@/lib/useAuth'
import '@/styles/layout-home.css'

type QuickLink = {
  path: string
  label: string
  icon: LucideIcon
}

const QUICK_LINKS: QuickLink[] = [
  { path: '/clients', label: 'Clients', icon: Users },
  { path: '/services', label: 'Services', icon: ClipboardList },
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/payments', label: 'Payments', icon: Wallet },
  { path: '/documents', label: 'Documents', icon: FileText },
  { path: '/hr', label: 'HR', icon: UsersRound },
  { path: '/sub-agents', label: 'Sub Agents', icon: Handshake },
  { path: '/track', label: 'Track client', icon: UserRoundSearch },
]

export default function HomePage() {
  const { user } = useAuth()
  const tenant = useActiveTenant()
  const clients = useClients()
  const agencyProfile = useAgencyProfile()
  const { dismissed: profileNudgeDismissed } = useBusinessProfileNudgeState()
  const showProfileNudge =
    agencyProfileIsIncomplete(agencyProfile) && !profileNudgeDismissed
  const isFirstRun = clients.length === 0
  const canAddClient = isPathAllowed(
    '/clients',
    tenant.enabledModules,
    user?.role ?? 'agency_user',
  )

  if (user?.role === 'platform_admin') {
    return <Navigate to="/admin" replace />
  }

  const links = QUICK_LINKS.filter((item) =>
    isPathAllowed(
      item.path,
      tenant.enabledModules,
      user?.role ?? 'agency_user',
    ),
  )

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

      <TodayFollowUps
        emptyAction={
          isFirstRun && canAddClient
            ? { label: 'Add your first client', to: '/clients?new=1' }
            : undefined
        }
      />

      {links.length > 0 ? (
        <nav
          className="pd-home-quick"
          aria-label="Quick links"
          data-tour="home-quick-links"
        >
          {links.map((item) => {
            const Icon = item.icon
            const isPrimary = isFirstRun && item.path === '/clients'
            return (
              <Link
                key={item.path}
                to={
                  isPrimary && canAddClient ? '/clients?new=1' : item.path
                }
                className={
                  isPrimary
                    ? 'pd-home-quick__tile pd-home-quick__tile--primary'
                    : 'pd-home-quick__tile'
                }
              >
                <span className="pd-home-quick__watermark" aria-hidden="true">
                  <Icon size={148} strokeWidth={1.15} />
                </span>
                <span className="pd-home-quick__icon" aria-hidden="true">
                  <Icon size={26} strokeWidth={1.6} />
                </span>
                <span className="pd-home-quick__label">
                  {isPrimary ? 'Add client' : item.label}
                </span>
              </Link>
            )
          })}
        </nav>
      ) : null}

      <PlatformTour />
    </div>
  )
}
