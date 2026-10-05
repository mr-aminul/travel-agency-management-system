import { describe, expect, it } from 'vitest'
import { parseSearchQuery, resolveSearchScope } from './query'

describe('parseSearchQuery', () => {
  it('reads an @clients prefix', () => {
    expect(parseSearchQuery('@Rahim Uddin')).toEqual({
      scope: 'clients',
      text: 'Rahim Uddin',
    })
  })

  it('reads a service-file prefix', () => {
    expect(parseSearchQuery('s: work permit')).toEqual({
      scope: 'services',
      text: 'work permit',
    })
  })

  it('reads an action prefix', () => {
    expect(parseSearchQuery('> create')).toEqual({
      scope: 'actions',
      text: 'create',
    })
  })

  it('leaves unprefixed text in the all scope', () => {
    expect(parseSearchQuery('clients')).toEqual({
      scope: 'all',
      text: 'clients',
    })
  })
})

describe('resolveSearchScope', () => {
  it('lets a typed prefix override the chip', () => {
    expect(
      resolveSearchScope({ scope: 'clients', text: 'rahim' }, 'services'),
    ).toBe('clients')
  })

  it('keeps the chip when the query has no prefix', () => {
    expect(
      resolveSearchScope({ scope: 'all', text: 'rahim' }, 'clients'),
    ).toBe('clients')
  })
})
