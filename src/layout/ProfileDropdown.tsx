import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { Crown, IdCard, LogOut, Settings } from 'lucide-react'
import { SignOutConfirmModal } from '@/components/ConfirmModal'
import { settingsNavItem, profileNavItem } from '@/config/layout'
import { settingsNavAlertCount } from '@/lib/agencyProfileGaps'
import { getActiveTenantId } from '@/lib/authApi'
import { findTenantMemberForUser } from '@/lib/tenantMembersStore'
import { useAuth } from '@/lib/useAuth'
import { avatarKindForMemberRole, CopyableText } from '@/components/ui'
import { useAgencyProfile } from './useAgencyProfile'
import { useHoverMenu } from './useHoverMenu'

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
  const agencyProfile = useAgencyProfile()
  const isPlatformAdmin = user?.role === 'platform_admin'
  const member =
    user && !isPlatformAdmin
      ? findTenantMemberForUser(getActiveTenantId(), user.id, user.email)
      : undefined
  const ProfileIcon =
    avatarKindForMemberRole(member?.role) === 'owner' ? Crown : IdCard
  const settingsBadge =
    isPlatformAdmin ? 0 : settingsNavAlertCount(agencyProfile)
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
      data-tour="topbar-profile"
      {...hoverHandlers}
    >
      <button
        type="button"
        onClick={toggle}
        className="pd-topbar__profile-avatar pd-topbar__profile-avatar--btn"
        aria-label="Profile menu"
        aria-expanded={open}
      >
        <ProfileIcon size={16} strokeWidth={2} aria-hidden />
      </button>
      {open && (
        <div
          className="pd-topbar__dropdown-panel pd-topbar__dropdown-panel--profile"
          role="menu"
          aria-label="Profile menu"
        >
          <div className="pd-topbar__dropdown-header">
            <span className="pd-topbar__profile-avatar pd-topbar__profile-avatar--menu">
              <ProfileIcon size={14} strokeWidth={2} aria-hidden />
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
            <ProfileIcon size={14} strokeWidth={2} />
            {profileNavItem.label}
          </Link>
          <Link
            to={settingsNavItem.path}
            className="pd-topbar__dropdown-item"
            onClick={() => setOpen(false)}
            role="menuitem"
            aria-label={
              settingsBadge > 0
                ? `${settingsNavItem.label}, ${settingsBadge} needing attention`
                : undefined
            }
          >
            <Settings size={14} strokeWidth={2} />
            <span className="pd-topbar__dropdown-item-label">
              {settingsNavItem.label}
            </span>
            {settingsBadge > 0 ? (
              <span
                className="pd-topbar__dropdown-badge"
                aria-hidden
                title={`${settingsBadge} needing attention`}
              >
                {settingsBadge}
              </span>
            ) : null}
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
