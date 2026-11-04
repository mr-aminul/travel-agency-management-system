import { describe, expect, it } from 'vitest'
import { filterDomainItemsForTenant } from './subAgentIds.js'

describe('filterDomainItemsForTenant', () => {
  it('drops rows that belong to another agency', () => {
    const scoped = filterDomainItemsForTenant(
      'pd-clients-created',
      [
        { id: 'c-1', tenantId: 'tenant-a', name: 'A' },
        { id: 'c-2', tenantId: 'tenant-b', name: 'B' },
        { id: 'c-3', name: 'No tenant yet' },
      ],
      'tenant-a',
    )
    expect(scoped.map((row) => row.id)).toEqual(['c-1', 'c-3'])
  })

  it('scopes trash by nested client tenantId', () => {
    const scoped = filterDomainItemsForTenant(
      'pd-clients-trash',
      [
        { client: { id: 'c-1', tenantId: 'tenant-a' } },
        { client: { id: 'c-2', tenantId: 'tenant-b' } },
      ],
      'tenant-a',
    )
    expect(scoped).toHaveLength(1)
    expect(scoped[0].client.id).toBe('c-1')
  })
})
