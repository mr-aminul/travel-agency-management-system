import type { LucideIcon } from 'lucide-react'
import type { BadgeVariant } from '@/components/ui'

export type SearchKind =
  | 'action'
  | 'page'
  | 'client'
  | 'service'
  | 'partner'
  | 'employee'

export type SearchScope =
  | 'all'
  | 'clients'
  | 'services'
  | 'partners'
  | 'employees'
  | 'pages'
  | 'actions'

export type SearchItem = {
  id: string
  kind: SearchKind
  scope: SearchScope
  label: string
  description?: string
  keywords: string[]
  path: string
  icon?: LucideIcon
  avatarUrl?: string
  avatarName?: string
  status?: string
  statusVariant?: BadgeVariant
}

export type HighlightRange = {
  start: number
  end: number
}

export type RankedSearchItem = SearchItem & {
  score: number
  highlights: HighlightRange[]
}

export type SearchGroup = {
  id: string
  label: string
  items: RankedSearchItem[]
}

export type ParsedSearchQuery = {
  scope: SearchScope
  text: string
}

export const SEARCH_SCOPES: Array<{ id: SearchScope; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'clients', label: 'Clients' },
  { id: 'services', label: 'Files' },
  { id: 'partners', label: 'Sub agents' },
  { id: 'employees', label: 'Employees' },
  { id: 'pages', label: 'Pages' },
]

export const SEARCH_KIND_GROUP: Record<SearchKind, { id: string; label: string }> =
  {
    action: { id: 'action', label: 'Jump To' },
    page: { id: 'page', label: 'Pages' },
    client: { id: 'client', label: 'Clients' },
    service: { id: 'service', label: 'Service files' },
    partner: { id: 'partner', label: 'Sub agents' },
    employee: { id: 'employee', label: 'Employees' },
  }

export const SEARCH_KIND_ORDER: SearchKind[] = [
  'action',
  'page',
  'client',
  'service',
  'partner',
  'employee',
]
