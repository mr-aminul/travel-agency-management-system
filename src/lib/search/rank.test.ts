import { describe, expect, it } from 'vitest'
import { presentSearchResults, scoreSearchItem } from './rank'
import type { SearchItem } from './types'

function item(
  partial: Pick<SearchItem, 'id' | 'kind' | 'scope' | 'label'> &
    Partial<SearchItem>,
): SearchItem {
  return {
    keywords: [],
    path: `/${partial.id}`,
    ...partial,
  }
}

const catalog: SearchItem[] = [
  item({
    id: 'client:c-284',
    kind: 'client',
    scope: 'clients',
    label: 'Md. Rahim Uddin',
    description: 'Passport A12345678',
    keywords: ['c-284', 'A12345678', '01712345678'],
  }),
  item({
    id: 'service:case-101',
    kind: 'service',
    scope: 'services',
    label: 'Work Permit Visa · Md. Rahim Uddin',
    keywords: ['case-101'],
  }),
  item({
    id: 'page:clients',
    kind: 'page',
    scope: 'pages',
    label: 'Clients',
    path: '/clients',
  }),
  item({
    id: 'action:create-client',
    kind: 'action',
    scope: 'actions',
    label: 'Create A Client',
    path: '/clients',
  }),
]

describe('scoreSearchItem', () => {
  it('requires every token to match across fields', () => {
    const hit = scoreSearchItem(catalog[0], 'rahim passport')
    expect(hit).not.toBeNull()
    expect(scoreSearchItem(catalog[0], 'rahim missing')).toBeNull()
  })

  it('boosts an exact id keyword above a looser match', () => {
    const withId = item({
      id: 'client:c-284',
      kind: 'client',
      scope: 'clients',
      label: 'Md. Rahim Uddin',
      keywords: ['c-284'],
    })
    const withIdInTitle = item({
      id: 'client:c-999',
      kind: 'client',
      scope: 'clients',
      label: 'Note about c-284',
      keywords: ['c-999'],
    })
    const byId = scoreSearchItem(withId, 'c-284')
    const byLabel = scoreSearchItem(withIdInTitle, 'c-284')
    expect(byId).not.toBeNull()
    expect(byLabel).not.toBeNull()
    expect(byId!.score).toBeGreaterThan(byLabel!.score)
  })
})

describe('presentSearchResults', () => {
  it('shows recents and jump-to items when the query is empty', () => {
    const presented = presentSearchResults(catalog, '', 'all', ['service:case-101'])
    expect(presented.groups.map((group) => group.id)).toEqual([
      'recent',
      'action',
      'page',
    ])
    expect(presented.groups[0].items[0].id).toBe('service:case-101')
  })

  it('filters to a chip and ranks matches', () => {
    const presented = presentSearchResults(catalog, 'rahim', 'clients')
    expect(presented.flat.map((entry) => entry.id)).toEqual(['client:c-284'])
  })

  it('lets a prefix override the chip', () => {
    const presented = presentSearchResults(catalog, 's: work', 'clients')
    expect(presented.scope).toBe('services')
    expect(presented.flat.map((entry) => entry.id)).toEqual(['service:case-101'])
  })
})
