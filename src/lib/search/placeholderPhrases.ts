import type { LucideIcon } from 'lucide-react'
import type { AvatarKind } from '@/components/ui'
import type { SearchGroup, SearchKind } from './types'

/** Idle groups whose labels rotate in the empty search placeholder. */
const PLACEHOLDER_GROUP_IDS = new Set(['recent', 'action'])

export const SEARCH_PLACEHOLDER_FALLBACK = 'Search…'

export function avatarKindForSearchKind(kind: SearchKind): AvatarKind {
  if (kind === 'subAgent') return 'subAgent'
  if (kind === 'employee') return 'staff'
  return 'client'
}

export type SearchPlaceholderHint = {
  id: string
  label: string
  icon?: LucideIcon
  avatarName?: string
  avatarUrl?: string
  avatarKind?: AvatarKind
}

/**
 * Pull unique Recent + Jump To items for the idle placeholder — so each
 * agency sees their own recents and actions (with icons).
 */
export function placeholderHintsFromGroups(
  groups: SearchGroup[],
): SearchPlaceholderHint[] {
  const seen = new Set<string>()
  const hints: SearchPlaceholderHint[] = []

  for (const group of groups) {
    if (!PLACEHOLDER_GROUP_IDS.has(group.id)) continue
    for (const item of group.items) {
      const label = item.label.trim()
      if (!label || seen.has(label)) continue
      seen.add(label)
      hints.push({
        id: item.id,
        label,
        icon: item.icon,
        avatarName: item.avatarName,
        avatarUrl: item.avatarUrl,
        avatarKind: item.avatarName
          ? avatarKindForSearchKind(item.kind)
          : undefined,
      })
    }
  }

  return hints
}

/** @deprecated Prefer {@link placeholderHintsFromGroups} when icons are needed. */
export function placeholderPhrasesFromGroups(
  groups: SearchGroup[],
): string[] {
  return placeholderHintsFromGroups(groups).map((hint) => hint.label)
}
