import { buildAccessPageColumns } from '@/lib/accessPages'
import { layoutConfig } from '@/config/layout'
import { findTenantMemberForUser } from '@/lib/tenantMembersStore'
import { getPageAccessLevel } from '@/lib/userAccessStore'
import { pathAccess } from '@/lib/modules'
import type { PageAccessLevel } from '@/types/userAccess'
import type { UserRole } from '@/types/tenant'

const PAGE_COLUMNS = buildAccessPageColumns(layoutConfig.navItems)

function longestMatchingPath(pathname: string): string | undefined {
  const path =
    pathname.endsWith('/') && pathname.length > 1
      ? pathname.slice(0, -1)
      : pathname
  const matches = PAGE_COLUMNS.map((col) => col.path)
    .filter(
      (pagePath) => path === pagePath || path.startsWith(`${pagePath}/`),
    )
    .sort((left, right) => right.length - left.length)
  return matches[0]
}

/**
 * Resolve page access for the signed-in agency user.
 * Platform admins always get edit. Owners default to edit when unset.
 */
export function resolveUserPageAccess(input: {
  role: UserRole
  userId: string
  email: string
  tenantId: string
  pathname: string
}): PageAccessLevel {
  if (input.role === 'platform_admin') return 'edit'
  const pagePath = longestMatchingPath(input.pathname)
  if (!pagePath) {
    // Core pages not in the matrix (home, readiness, settings, profile, trash)
    return 'edit'
  }
  const member = findTenantMemberForUser(
    input.tenantId,
    input.userId,
    input.email,
  )
  if (!member || member.status === 'disabled') return 'none'
  if (member.role === 'owner') {
    return getPageAccessLevel(member.id, pagePath)
  }
  return getPageAccessLevel(member.id, pagePath)
}

export function canAccessPath(input: {
  role: UserRole
  userId: string
  email: string
  tenantId: string
  pathname: string
}): boolean {
  if (input.role === 'platform_admin') {
    return pathAccess(input.pathname) === 'admin'
  }
  return resolveUserPageAccess(input) !== 'none'
}

export function canManageAgencyUsers(role: UserRole, memberRole?: string) {
  if (role === 'platform_admin') return true
  return memberRole === 'owner' || memberRole === 'manager'
}
