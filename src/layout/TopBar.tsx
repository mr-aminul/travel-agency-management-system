import type { LucideIcon } from 'lucide-react'
import { Menu } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import {
  Breadcrumbs,
  type BreadcrumbItem,
} from '@/components/ui'
import { TopBarDarkMode } from './TopBarDarkMode'
import { TopBarSearch } from './TopBarSearch'
import { ProfileDropdown } from './ProfileDropdown'

interface TopBarProps {
  title: string
  titleIcon?: LucideIcon
  breadcrumbs?: BreadcrumbItem[]
  userName?: string
  profileSubtext?: string
  onSignOut?: () => void
  onMobileMenuOpen: () => void
  isMobile?: boolean
}

export function TopBar({
  title,
  titleIcon: TitleIcon,
  breadcrumbs,
  userName,
  profileSubtext,
  onSignOut,
  onMobileMenuOpen,
  isMobile = false,
}: TopBarProps) {
  const { pathname } = useLocation()
  const showTopBarSearch = pathname !== '/'

  const titleBlock = (
    <div className="pd-topbar__title">
      {TitleIcon ? (
        <TitleIcon
          size={18}
          strokeWidth={1.75}
          className="pd-topbar__title-icon"
          aria-hidden
        />
      ) : null}
      {breadcrumbs && breadcrumbs.length > 0 ? (
        <Breadcrumbs
          className="pd-topbar__breadcrumbs"
          items={breadcrumbs}
        />
      ) : (
        <span className="pd-topbar__title-text">{title}</span>
      )}
    </div>
  )

  const actions = (
    <div className="pd-topbar__actions">
      <TopBarDarkMode />
      <ProfileDropdown
        userName={userName}
        profileSubtext={profileSubtext}
        onSignOut={onSignOut}
        isMobile={isMobile}
      />
    </div>
  )

  if (isMobile) {
    return (
      <header className="pd-topbar pd-topbar--mobile">
        <div className="pd-topbar__row">
          <button
            type="button"
            className="pd-topbar__icon-btn"
            onClick={onMobileMenuOpen}
            aria-label="Open menu"
          >
            <Menu size={18} strokeWidth={2} />
          </button>
          <div className="pd-topbar__center">
            {showTopBarSearch ? <TopBarSearch /> : titleBlock}
          </div>
          {actions}
        </div>
      </header>
    )
  }

  return (
    <header className="pd-topbar pd-topbar--desktop">
      {titleBlock}
      <div className="pd-topbar__center">
        {showTopBarSearch ? <TopBarSearch /> : null}
      </div>
      {actions}
    </header>
  )
}
