import { useCallback, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeftRight,
  Crown,
  IdCard,
  LogOut,
  Settings,
  Undo2,
} from 'lucide-react'
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
  const navigate = useNavigate()
  const {
    user,
    actor,
    session,
    isViewingAs,
    requestWorkspacePicker,
    stopViewAs,
  } = useAuth()
  const agencyProfile = useAgencyProfile()
  const isPlatformAdmin = user?.role === 'platform_admin'
  const isAgencyUser = user?.role === 'agency_user'
  const canSwitchWorkspace =
    !isViewingAs && (session?.workspaces?.length ?? 0) > 1
  const [exitViewAsBusy, setExitViewAsBusy] = useState(false)
  const member =
    user && isAgencyUser
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
            <Link
              to={profileNavItem.path}
              className="pd-topbar__dropdown-item"
              onClick={() => setOpen(false)}
              role="menuitem"
            >
              <ProfileIcon size={14} strokeWidth={2} />
              {profileNavItem.label}
            </Link>
          ) : null}
          {isAgencyUser ? (
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
          ) : null}
          {isViewingAs ? (
            <button
              type="button"
              className="pd-topbar__dropdown-item"
              disabled={exitViewAsBusy}
              onClick={() => {
                void (async () => {
                  setExitViewAsBusy(true)
                  try {
                    await stopViewAs()
                    setOpen(false)
                    navigate('/admin/tenants', { replace: true })
                  } finally {
                    setExitViewAsBusy(false)
                  }
                })()
              }}
              role="menuitem"
            >
              <Undo2 size={14} strokeWidth={2} />
              Back to {actor?.name ?? 'admin'}
            </button>
          ) : null}
          {canSwitchWorkspace ? (
            <button
              type="button"
              className="pd-topbar__dropdown-item"
              onClick={() => {
                setOpen(false)
                requestWorkspacePicker()
                navigate('/choose-workspace')
              }}
              role="menuitem"
            >
              <ArrowLeftRight size={14} strokeWidth={2} />
              Switch workspace
            </button>
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
