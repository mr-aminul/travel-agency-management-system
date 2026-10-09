import { describe, expect, it } from 'vitest'
import { pageIdentity } from './pageIdentity'

describe('pageIdentity', () => {
  it('returns the pathname for top-level pages', () => {
    expect(pageIdentity('/dashboard')).toBe('/dashboard')
    expect(pageIdentity('/clients')).toBe('/clients')
    expect(pageIdentity('/settings')).toBe('/settings')
  })

  it('keeps client detail mounted when opening a nested service', () => {
    expect(pageIdentity('/clients/c1/services/s1')).toBe('/clients/c1')
  })

  it('remounts the invoice page as its own route', () => {
    expect(pageIdentity('/clients/c1/services/s1/invoice')).toBe(
      '/clients/c1/services/s1/invoice',
    )
  })

  it('collapses tenant admin tabs to the tenant shell', () => {
    expect(pageIdentity('/admin/agencies/t1/people')).toBe('/admin/agencies/t1')
    expect(pageIdentity('/admin/agencies/t1/overview')).toBe(
      '/admin/agencies/t1',
    )
    expect(pageIdentity('/admin/tenants/t1/users')).toBe('/admin/tenants/t1')
  })

  it('still remounts when switching between clients', () => {
    expect(pageIdentity('/clients/a')).toBe('/clients/a')
    expect(pageIdentity('/clients/b')).toBe('/clients/b')
  })
})
