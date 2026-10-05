import { afterEach, describe, expect, it } from 'vitest'
import { DEMO_USER, clearSession, writeSession } from '@/lib/authApi'
import {
  clearServiceIconOverride,
  getServiceIconOverride,
  renameServiceIconOverride,
  resetServiceIconOverrides,
  setServiceIconOverride,
} from '@/lib/serviceIconOverridesStore'
import { TENANT_IDS } from '@/types/tenant'

afterEach(() => {
  clearSession()
  resetServiceIconOverrides()
})

function asFull() {
  writeSession({
    user: DEMO_USER,
    tenantId: TENANT_IDS.full,
    signedInAt: '2026-01-01T00:00:00.000Z',
  })
}

describe('service icon overrides', () => {
  it('stores and clears a pick per service', () => {
    asFull()
    setServiceIconOverride('Visa processing', 'stamp')
    expect(getServiceIconOverride('Visa processing')).toBe('stamp')
    clearServiceIconOverride('Visa processing')
    expect(getServiceIconOverride('Visa processing')).toBeUndefined()
  })

  it('renames the override with the service', () => {
    asFull()
    setServiceIconOverride('Visa processing', 'globe')
    renameServiceIconOverride('Visa processing', 'Embassy file')
    expect(getServiceIconOverride('Visa processing')).toBeUndefined()
    expect(getServiceIconOverride('Embassy file')).toBe('globe')
  })
})
