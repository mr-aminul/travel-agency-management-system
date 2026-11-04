import type { NavItem } from '@/layout/types'

/**
 * Settings → Access Management tab.
 * Not a sidebar nav path; stored as a matrix key so owners can hide that tab.
 */
export const SETTINGS_ACCESS_MANAGEMENT_PATH = '/settings/access-management'

/** One page column in the user-access matrix. */
export type AccessPageColumn = {
  /** Stable key: the page path. */
  id: string
  path: string
  /** Display label. Subpages use "Parent - Child". */
  label: string
}

/**
 * Builds access-matrix page columns from nav.
 * Leaf pages keep their label; children use "Parent - Child".
 * Admin-only items and parent group shells are omitted.
 * Always appends Access Management (settings section gate).
 */
export function buildAccessPageColumns(items: NavItem[]): AccessPageColumn[] {
  const fromNav = items.flatMap((item) => {
    if (item.adminOnly) return []

    const children = item.children?.filter((child) => !child.adminOnly) ?? []
    if (children.length > 0) {
      return children.map((child) => ({
        id: child.path,
        path: child.path,
        label: `${item.label} - ${child.label}`,
      }))
    }

    return [
      {
        id: item.path,
        path: item.path,
        label: item.label,
      },
    ]
  })

  return [
    ...fromNav,
    {
      id: SETTINGS_ACCESS_MANAGEMENT_PATH,
      path: SETTINGS_ACCESS_MANAGEMENT_PATH,
      label: 'Access Management',
    },
  ]
}
