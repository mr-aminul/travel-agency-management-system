import { afterEach, describe, expect, it } from 'vitest'
import {
  DEMO_USER,
  clearSession,
  writeSession,
} from '@/lib/authApi'
import {
  createCase,
  getCaseById,
  reloadCasesFromStorage,
  resetCases,
} from '@/lib/casesStore'
import { DATA_KEYS, loadJson } from '@/lib/data'
import { TENANT_IDS } from '@/types/tenant'

afterEach(() => {
  clearSession()
  resetCases()
})

describe('persisted services', () => {
  it('keeps a created service after reload', () => {
    writeSession({
      user: DEMO_USER,
      tenantId: TENANT_IDS.full,
      signedInAt: '2026-01-01T00:00:00.000Z',
    })

    const created = createCase({
      clientId: 'c-284',
      service: 'Tour Package',
      serviceCountry: 'Bangladesh',
    })

    const persisted = loadJson(DATA_KEYS.casesCreated, [])
    expect(Array.isArray(persisted) && persisted.length > 0).toBe(true)

    resetCases()
    expect(getCaseById(created.id)).toBeUndefined()

    // Simulate a fresh session reading the same backend data.
    localStorage.setItem(DATA_KEYS.casesCreated, JSON.stringify(persisted))
    reloadCasesFromStorage()

    expect(getCaseById(created.id)?.service).toBe('Tour Package')
  })
})
