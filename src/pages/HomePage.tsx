import { Link } from 'react-router-dom'
import {
  BookOpen,
  Folder,
  LayoutDashboard,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { JOURNEY_SPINE } from '@/lib/glossary'
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
    description: 'Who — people & identity',
    icon: Users,
  },
  {
    path: '/cases',
    label: 'Cases',
    description: 'Why — purposes & steps',
    icon: Folder,
  },
  {
    path: '/dashboard',
    label: 'Dashboard',
    description: 'Overview & metrics',
    icon: LayoutDashboard,
  },
  {
    path: '/finance',
    label: 'Finance',
    description: 'Payments & balances',
    icon: Wallet,
  },
  {
    path: '/settings?section=glossary',
    label: 'How it works',
    description: 'Glossary & journey spine',
    icon: BookOpen,
  },
]

export default function HomePage() {
  return (
    <div className="pd-page pd-home" aria-label="Home">
      <header className="pd-home__header">
        <p className="pd-home__eyebrow">Learn once, use every day</p>
        <h1 className="pd-home__title">Client → Case → Documents</h1>
        <p className="pd-home__subtitle">{JOURNEY_SPINE}</p>
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
                <Icon size={22} strokeWidth={2.1} />
              </span>
              <span className="pd-home-quick__label">{item.label}</span>
              <span className="pd-home-quick__description">{item.description}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
