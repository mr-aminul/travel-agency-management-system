import { afterEach, describe, expect, it } from 'vitest'
import {
  agencyClientFormPath,
  agencyClientFormUrl,
  partnerClientFormPath,
  partnerClientFormUrl,
  publicUrl,
} from '@/lib/publicUrl'
import { TENANT_IDS } from '@/types/tenant'

afterEach(() => {
  window.history.replaceState({}, '', '/')
})

describe('partner client form URL', () => {
  it('builds a public join path under the Vite base', () => {
    expect(partnerClientFormPath('AGT-T0001')).toBe('join/AGT-T0001')
    expect(publicUrl(partnerClientFormPath('AGT-T0001'))).toBe(
      `${import.meta.env.BASE_URL || '/'}join/AGT-T0001`,
    )
  })

  it('resolves an absolute URL that can be shared', () => {
    expect(partnerClientFormUrl('AGT-T0001')).toBe(
      `${window.location.origin}${import.meta.env.BASE_URL || '/'}join/AGT-T0001`,
    )
  })
})

describe('agency client form URL', () => {
  it('builds a public client-registration path from the tenant slug, not the internal id', () => {
    expect(agencyClientFormPath(TENANT_IDS.full)).toBe(
      'client-registration/onetrack-demo',
    )
    expect(agencyClientFormPath('onetrack-demo')).toBe(
      'client-registration/onetrack-demo',
    )
    expect(agencyClientFormUrl(TENANT_IDS.full)).toBe(
      `${window.location.origin}${import.meta.env.BASE_URL || '/'}` +
        'client-registration/onetrack-demo',
    )
  })
})
