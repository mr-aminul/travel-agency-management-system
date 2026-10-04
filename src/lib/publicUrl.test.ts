import { afterEach, describe, expect, it } from 'vitest'
import { partnerClientFormPath, partnerClientFormUrl, publicUrl } from '@/lib/publicUrl'

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
