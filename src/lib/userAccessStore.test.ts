import { afterEach, describe, expect, it } from 'vitest'
import { DEMO_USER, clearSession, writeSession } from '@/lib/authApi'
import { TENANT_IDS } from '@/types/tenant'
import {
  getDefaultPageAccessLevel,
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
  it('defaults missing overrides to edit for owners', () => {
    signInFullTenant()
    expect(getPageAccessLevel('member-full-owner', '/clients')).toBe('edit')
  })

  it('gives staff view on settings and edit on clients', () => {
    expect(getDefaultPageAccessLevel('staff', '/settings')).toBe('view')
    expect(getDefaultPageAccessLevel('staff', '/clients')).toBe('edit')
    expect(getDefaultPageAccessLevel('staff', '/hr/payroll')).toBe('view')
  })

  it('gives manager view on settings and edit elsewhere', () => {
    expect(getDefaultPageAccessLevel('manager', '/settings')).toBe('view')
    expect(getDefaultPageAccessLevel('manager', '/payments')).toBe('edit')
  })

  it('persists a page access override for the active tenant', () => {
    signInFullTenant()
    setPageAccessLevel('member-full-owner', '/hr/payroll', 'view')
    expect(getPageAccessLevel('member-full-owner', '/hr/payroll')).toBe('view')
    expect(getPageAccessLevel('member-full-owner', '/clients')).toBe('edit')
  })

  it('drops the stored row when restoring the default level', () => {
    signInFullTenant()
    setPageAccessLevel('member-full-owner', '/dashboard', 'none')
    setPageAccessLevel('member-full-owner', '/dashboard', 'edit')
    expect(getPageAccessLevel('member-full-owner', '/dashboard')).toBe('edit')
  })
})
