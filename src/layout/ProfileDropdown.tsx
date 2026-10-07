import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { LogOut, Settings, UserRound } from 'lucide-react'
import { SignOutConfirmModal } from '@/components/ConfirmModal'
import { settingsNavItem, profileNavItem } from '@/config/layout'
import { useAuth } from '@/lib/useAuth'
import { useHoverMenu } from './useHoverMenu'
import { CopyableText } from '@/components/ui'

export function ProfileDropdown({
  userName,
  profileSubtext,
  onSignOut,
  isMobile,
}: {
  userName?: string
  profileSubtext?: string
  onSignOut?: () => void
  isMobile?: boolean
}) {
  const { open, setOpen, containerRef, hoverHandlers, toggle } = useHoverMenu({
    isMobile,
    closeOnEscape: true,
  })
  const { user } = useAuth()
  const isPlatformAdmin = user?.role === 'platform_admin'
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false)
  const handleCloseConfirm = useCallback(() => {
    setShowSignOutConfirm(false)
  }, [])

  const handleConfirmSignOut = useCallback(() => {
    setShowSignOutConfirm(false)
    onSignOut?.()
  }, [onSignOut])

  return (
    <div
      ref={containerRef}
      className="pd-topbar__profile"
      {...hoverHandlers}
    >
      <button
        type="button"
        onClick={toggle}
        className="pd-topbar__profile-avatar pd-topbar__profile-avatar--btn"
        aria-label="Profile menu"
        aria-expanded={open}
      >
        <UserRound size={16} strokeWidth={2} aria-hidden />
      </button>
      {open && (
        <div
          className="pd-topbar__dropdown-panel pd-topbar__dropdown-panel--profile"
          role="menu"
          aria-label="Profile menu"
        >
          <div className="pd-topbar__dropdown-header">
            <span className="pd-topbar__profile-avatar pd-topbar__profile-avatar--menu">
              <UserRound size={14} strokeWidth={2} aria-hidden />
            </span>
            <div className="pd-topbar__dropdown-header-text">
              <div className="pd-topbar__dropdown-title">
                {userName ?? 'User'}
              </div>
              {profileSubtext && (
                <div className="pd-topbar__dropdown-subtitle">
                  <CopyableText value={profileSubtext} />
                </div>
              )}
            </div>
          </div>
          {!isPlatformAdmin ? (
            <>
          <Link
            to={profileNavItem.path}
            className="pd-topbar__dropdown-item"
            onClick={() => setOpen(false)}
            role="menuitem"
          >
            <UserRound size={14} strokeWidth={2} />
            {profileNavItem.label}
          </Link>
          <Link
            to={settingsNavItem.path}
            className="pd-topbar__dropdown-item"
            onClick={() => setOpen(false)}
            role="menuitem"
          >
            <Settings size={14} strokeWidth={2} />
            {settingsNavItem.label}
          </Link>
            </>
          ) : null}
          <button
            type="button"
            className="pd-topbar__dropdown-item pd-topbar__dropdown-item--danger"
            onClick={() => {
              setOpen(false)
              setShowSignOutConfirm(true)
            }}
            role="menuitem"
          >
            <LogOut size={14} strokeWidth={2} />
            Sign out
          </button>
        </div>
      )}
      <SignOutConfirmModal
        open={showSignOutConfirm}
        onClose={handleCloseConfirm}
        onConfirm={handleConfirmSignOut}
      />
    </div>
  )
}
