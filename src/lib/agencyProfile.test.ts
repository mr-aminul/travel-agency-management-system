import { describe, expect, it } from 'vitest'
import {
  DEFAULT_AGENCY_PROFILE,
  DEFAULT_BRAND_NAME,
  DEFAULT_BRAND_SUBTITLE,
  POWERED_BY_SUBTITLE,
  normalizeAgencyProfile,
  readAgencyProfile,
  resolveBrandDisplay,
  saveAgencyProfile,
} from '@/lib/agencyProfile'

const store = new Map<string, string>()

Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value)
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
    clear: () => store.clear(),
  },
  configurable: true,
})

Object.defineProperty(globalThis, 'window', {
  value: {
    dispatchEvent: () => true,
  },
  configurable: true,
})

describe('agencyProfile', () => {
  it('defaults to an empty business profile', () => {
    store.clear()
    expect(readAgencyProfile()).toEqual(DEFAULT_AGENCY_PROFILE)
  })

  it('persists and trims business fields', () => {
    store.clear()
    const saved = saveAgencyProfile({
      businessName: '  Horizon Travels  ',
      address: '  12 Main St  ',
      mobile: '  01700 000000  ',
      website: '  https://horizon.example  ',
      profilePicture: null,
    })
    expect(saved).toEqual({
      businessName: 'Horizon Travels',
      address: '12 Main St',
      mobile: '01700 000000',
      website: 'https://horizon.example',
      profilePicture: null,
    })
    expect(readAgencyProfile()).toEqual(saved)
  })

  it('rejects non-image profile picture payloads', () => {
    expect(
      normalizeAgencyProfile({
        businessName: 'Acme',
        profilePicture: 'https://example.com/logo.png',
      }).profilePicture,
    ).toBeNull()
  })

  it('uses OneTrack branding by default', () => {
    expect(resolveBrandDisplay(DEFAULT_AGENCY_PROFILE, '/logo.svg')).toEqual({
      name: DEFAULT_BRAND_NAME,
      subtitle: DEFAULT_BRAND_SUBTITLE,
      logoUrl: '/logo.svg',
      isCustomLogo: false,
      hasCustomName: false,
    })
  })

  it('shows business name with powered-by subtitle when set', () => {
    expect(
      resolveBrandDisplay(
        {
          ...DEFAULT_AGENCY_PROFILE,
          businessName: 'Horizon Travels',
          profilePicture: 'data:image/jpeg;base64,abc',
        },
        '/logo.svg',
      ),
    ).toEqual({
      name: 'Horizon Travels',
      subtitle: POWERED_BY_SUBTITLE,
      logoUrl: 'data:image/jpeg;base64,abc',
      isCustomLogo: true,
      hasCustomName: true,
    })
  })
})
