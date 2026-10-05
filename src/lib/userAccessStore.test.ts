import { afterEach, describe, expect, it } from 'vitest'
import { DEMO_USER, clearSession, writeSession } from '@/lib/authApi'
import { TENANT_IDS } from '@/types/tenant'
import {
  getPageAccessLevel,
  resetUserPageAccess,
  setPageAccessLevel,
} from '@/lib/userAccessStore'

afterEach(() => {
  resetUserPageAccess()
  clearSession()
})

function signInFullTenant() {
  writeSession({
    user: DEMO_USER,
    tenantId: TENANT_IDS.full,
    signedInAt: '2026-01-01T00:00:00.000Z',
  })
}

describe('userAccessStore', () => {
  it('defaults missing overrides to edit', () => {
    signInFullTenant()
    expect(getPageAccessLevel('EMP-7001', '/clients')).toBe('edit')
  })

  it('persists a page access override for the active tenant', () => {
    signInFullTenant()
    setPageAccessLevel('EMP-7001', '/hr/payroll', 'view')
    expect(getPageAccessLevel('EMP-7001', '/hr/payroll')).toBe('view')
    expect(getPageAccessLevel('EMP-7001', '/clients')).toBe('edit')
  })

  it('drops the stored row when restoring the default level', () => {
    signInFullTenant()
    setPageAccessLevel('EMP-7001', '/dashboard', 'none')
    setPageAccessLevel('EMP-7001', '/dashboard', 'edit')
    expect(getPageAccessLevel('EMP-7001', '/dashboard')).toBe('edit')
  })
})
