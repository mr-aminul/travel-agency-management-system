import { Link, Navigate } from 'react-router-dom'
import {
  ClipboardList,
  FileText,
  Handshake,
  HelpCircle,
  Kanban,
  UserRoundSearch,
  Users,
  UsersRound,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { HomeGlobalSearch } from '@/components/home/HomeGlobalSearch'
import { PlatformTour } from '@/components/onboarding/PlatformTour'
import { isPathAllowed } from '@/lib/modules'
import { useActiveTenant } from '@/lib/useActiveTenant'
import { useAuth } from '@/lib/useAuth'
import '@/styles/layout-home.css'

type QuickLink = {
  path: string
  label: string
  description: string
  icon: LucideIcon
}

const QUICK_LINKS: QuickLink[] = [
  {
    path: '/clients',
    label: 'Clients',
    description: 'People & organizations',
    icon: Users,
  },
  {
    path: '/services',
    label: 'Services',
    description: 'Open services',
    icon: ClipboardList,
  },
  {
    path: '/service-board',
    label: 'Service Board',
    description: 'Who is ready for which step',
    icon: Kanban,
  },
  {
    path: '/payments',
    label: 'Payments',
    description: 'Collections & balances',
    icon: Wallet,
  },
  {
    path: '/documents',
    label: 'Documents',
    description: 'Files & records',
    icon: FileText,
  },
  {
    path: '/hr',
    label: 'HR',
    description: 'Employees, attendance & payroll',
    icon: UsersRound,
  },
  {
    path: '/sub-agents',
    label: 'Sub Agents',
    description: 'Referring agencies',
    icon: Handshake,
  },
  {
    path: '/track',
    label: 'Track client',
    description: 'Public passport lookup',
    icon: UserRoundSearch,
  },
  {
    path: '/help',
    label: 'Help',
    description: 'Everyday staff paths',
    icon: HelpCircle,
  },
]

export default function HomePage() {
  const { user } = useAuth()
  const tenant = useActiveTenant()

  if (user?.role === 'platform_admin') {
    return <Navigate to="/admin/tenants" replace />
  }

  const links = QUICK_LINKS.filter((item) =>
    isPathAllowed(
      item.path,
      tenant.enabledModules,
      user?.role ?? 'agency_user',
    ),
  )

  return (
    <div className="pd-page pd-home" aria-label="Home">
      <header className="pd-home__header">
        <p className="pd-home__eyebrow">Quick access</p>
        <h1 className="pd-home__title">Select a workspace</h1>
        <p className="pd-home__subtitle">
          Jump into a frequently used area to continue your work.
        </p>
      </header>

      <HomeGlobalSearch />

      <PlatformTour />

      <nav
        className="pd-home-quick"
        aria-label="Quick links"
        data-tour="home-quick-links"
      >
        {links.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.path}
              to={item.path}
              className="pd-home-quick__tile"
            >
              <span className="pd-home-quick__watermark" aria-hidden="true">
                <Icon size={148} strokeWidth={1.15} />
              </span>
              <span className="pd-home-quick__icon" aria-hidden="true">
                <Icon size={26} strokeWidth={1.6} />
              </span>
              <span className="pd-home-quick__label">{item.label}</span>
              <span className="pd-home-quick__description">
                {item.description}
              </span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
