import { describe, expect, it } from 'vitest'
import {
  canAccessPath,
  canAccessSettingsAccessManagement,
  resolveUserPageAccess,
} from '@/lib/pageAccess'
import { TENANT_IDS } from '@/types/tenant'

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

describe('canAccessSettingsAccessManagement', () => {
  it('allows the demo owner to open Access Management', () => {
    expect(
      canAccessSettingsAccessManagement({
        role: 'agency_user',
        userId: 'user-abc-owner',
        email: 'demo@abctravel.com',
        tenantId: TENANT_IDS.demo,
      }),
    ).toBe(true)
  })

  it('hides Access Management for staff by default', () => {
    expect(
      canAccessSettingsAccessManagement({
        role: 'agency_user',
        userId: 'member-abc-staff',
        email: 'tanvir@abctravel.com',
        tenantId: TENANT_IDS.demo,
      }),
    ).toBe(false)
  })
})
