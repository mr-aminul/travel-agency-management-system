import { describe, expect, it } from 'vitest'
import { canAccessPath, resolveUserPageAccess } from '@/lib/pageAccess'

describe('resolveUserPageAccess', () => {
  it('allows home for agency users without a matrix row', () => {
    expect(
      resolveUserPageAccess({
        role: 'agency_user',
        userId: 'user-missing-member',
        email: 'nobody@example.com',
        tenantId: 'tenant-unknown',
        pathname: '/',
      }),
    ).toBe('edit')
  })

  it('allows canAccessPath for home even when member is missing', () => {
    expect(
      canAccessPath({
        role: 'agency_user',
        userId: 'user-missing-member',
        email: 'nobody@example.com',
        tenantId: 'tenant-unknown',
        pathname: '/',
      }),
    ).toBe(true)
  })
})
