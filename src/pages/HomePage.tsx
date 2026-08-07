import { Link } from 'react-router-dom'
import {
  BarChart3,
  FileText,
  Folder,
  LayoutDashboard,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import '@/styles/layout-home.css'

type QuickLink = {
  path: string
  label: string
  description: string
  icon: LucideIcon
}

const QUICK_LINKS: QuickLink[] = [
  {
    path: '/dashboard',
    label: 'Dashboard',
    description: 'Overview & metrics',
    icon: LayoutDashboard,
  },
  {
    path: '/clients',
    label: 'Clients',
    description: 'People & organizations',
    icon: Users,
  },
  {
    path: '/cases',
    label: 'Cases',
    description: 'Manpower, student, travel',
    icon: Folder,
  },
  {
    path: '/finance',
    label: 'Finance',
    description: 'Payments & balances',
    icon: Wallet,
  },
  {
    path: '/documents',
    label: 'Documents',
    description: 'Files & records',
    icon: FileText,
  },
  {
    path: '/reporting',
    label: 'Reporting',
    description: 'Reports & insights',
    icon: BarChart3,
  },
]

export default function HomePage() {
  return (
    <div className="pd-page pd-home" aria-label="Home">
      <header className="pd-home__header">
        <p className="pd-home__eyebrow">Quick access</p>
        <h1 className="pd-home__title">Select a workspace</h1>
        <p className="pd-home__subtitle">
          Jump into a frequently used area to continue your work.
        </p>
      </header>

      <nav className="pd-home-quick" aria-label="Quick links">
        {QUICK_LINKS.map((item) => {
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
