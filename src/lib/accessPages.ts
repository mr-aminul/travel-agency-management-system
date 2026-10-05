import type { NavItem } from '@/layout/types'

/** One page column in the user-access matrix. */
export type AccessPageColumn = {
  /** Stable key — the page path. */
  id: string
  path: string
  /** Display label. Subpages use "Parent - Child". */
  label: string
}

/**
 * Builds access-matrix page columns from nav.
 * Leaf pages keep their label; children use "Parent - Child".
 * Admin-only items and parent group shells are omitted.
 */
export function buildAccessPageColumns(items: NavItem[]): AccessPageColumn[] {
  return items.flatMap((item) => {
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
}
