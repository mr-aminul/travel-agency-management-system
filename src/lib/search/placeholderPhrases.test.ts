import { describe, expect, it } from 'vitest'
import { UserPlus, Users } from 'lucide-react'
import {
  placeholderHintsFromGroups,
  placeholderPhrasesFromGroups,
  SEARCH_PLACEHOLDER_FALLBACK,
} from './placeholderPhrases'
import type { RankedSearchItem, SearchGroup } from './types'

function ranked(
  partial: Pick<RankedSearchItem, 'id' | 'kind' | 'scope' | 'label'> &
    Partial<RankedSearchItem>,
): RankedSearchItem {
  return {
    keywords: [],
    path: `/${partial.id}`,
    score: 0,
    highlights: [],
    ...partial,
  }
}

describe('placeholderHintsFromGroups', () => {
  it('keeps icons from Recent then Jump To, skipping Pages', () => {
    const groups: SearchGroup[] = [
      {
        id: 'recent',
        label: 'Recent',
        items: [
          ranked({
            id: 'client:john',
            kind: 'client',
            scope: 'clients',
            label: 'John',
            avatarName: 'John',
          }),
        ],
      },
      {
        id: 'action',
        label: 'Jump To',
        items: [
          ranked({
            id: 'action:create-client',
            kind: 'action',
            scope: 'actions',
            label: 'Create A Client',
            icon: UserPlus,
          }),
        ],
      },
      {
        id: 'page',
        label: 'Pages',
        items: [
          ranked({
            id: 'page:clients',
            kind: 'page',
            scope: 'pages',
            label: 'Clients',
            icon: Users,
          }),
        ],
      },
    ]

    const hints = placeholderHintsFromGroups(groups)
    expect(hints.map((hint) => hint.label)).toEqual([
      'John',
      'Create A Client',
    ])
    expect(hints[0].avatarName).toBe('John')
    expect(hints[1].icon).toBe(UserPlus)
  })

  it('dedupes identical labels across groups', () => {
    const groups: SearchGroup[] = [
      {
        id: 'recent',
        label: 'Recent',
        items: [
          ranked({
            id: 'action:open-clients',
            kind: 'action',
            scope: 'actions',
            label: 'Open Clients',
            icon: Users,
          }),
        ],
      },
      {
        id: 'action',
        label: 'Jump To',
        items: [
          ranked({
            id: 'action:open-clients-2',
            kind: 'action',
            scope: 'actions',
            label: 'Open Clients',
            icon: Users,
          }),
          ranked({
            id: 'action:dashboard',
            kind: 'action',
            scope: 'actions',
            label: 'Go To Dashboard',
          }),
        ],
      },
    ]

    expect(placeholderPhrasesFromGroups(groups)).toEqual([
      'Open Clients',
      'Go To Dashboard',
    ])
  })

  it('returns an empty list when there is nothing idle to hint', () => {
    expect(placeholderHintsFromGroups([])).toEqual([])
    expect(SEARCH_PLACEHOLDER_FALLBACK).toBe('Search…')
  })
})
