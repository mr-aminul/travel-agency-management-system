import { afterEach, describe, expect, it } from 'vitest'
import {
  agencyClientFormPath,
  agencyClientFormUrl,
  clientTrackingPath,
  clientTrackingUrl,
  subAgentClientFormPath,
  subAgentClientFormUrl,
  publicUrl,
} from '@/lib/publicUrl'
import { TENANT_IDS } from '@/types/tenant'

afterEach(() => {
  window.history.replaceState({}, '', '/')
})

describe('subAgent client form URL', () => {
  it('builds a public join path under the Vite base', () => {
    expect(subAgentClientFormPath('AGT-T0001')).toBe('join/AGT-T0001')
    expect(publicUrl(subAgentClientFormPath('AGT-T0001'))).toBe(
      `${import.meta.env.BASE_URL || '/'}join/AGT-T0001`,
    )
  })

  it('resolves an absolute URL that can be shared', () => {
    expect(subAgentClientFormUrl('AGT-T0001')).toBe(
      `${window.location.origin}${import.meta.env.BASE_URL || '/'}join/AGT-T0001`,
    )
  })
})

describe('agency client form URL', () => {
  it('builds a public client-registration path from the tenant slug, not the internal id', () => {
    expect(agencyClientFormPath(TENANT_IDS.full)).toBe(
      'client-registration/onetrack',
    )
    expect(agencyClientFormPath('onetrack')).toBe(
      'client-registration/onetrack',
    )
    expect(agencyClientFormUrl(TENANT_IDS.full)).toBe(
      `${window.location.origin}${import.meta.env.BASE_URL || '/'}` +
        'client-registration/onetrack',
    )
  })
})

describe('client tracking URL', () => {
  it('builds a public track path with the passport query', () => {
    expect(clientTrackingPath('A12345678')).toBe('track?passport=A12345678')
    expect(clientTrackingUrl('A12345678')).toBe(
      `${window.location.origin}${import.meta.env.BASE_URL || '/'}` +
        'track?passport=A12345678',
    )
  })

  it('encodes the passport and falls back to the bare track page', () => {
    expect(clientTrackingPath('AB 99/1')).toBe('track?passport=AB%2099%2F1')
    expect(clientTrackingPath('  ')).toBe('track')
  })
})
