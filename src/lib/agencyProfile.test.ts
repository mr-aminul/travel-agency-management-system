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
  seedAgencyProfileBusinessName,
  withBusinessNameFallback,
} from '@/lib/agencyProfile'
import { TENANT_IDS } from '@/types/tenant'

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
  it('seeds demo workspaces with invoice contact details', () => {
    store.clear()
    expect(readAgencyProfile(TENANT_IDS.leisure)).toEqual({
      businessName: 'Coastal Leisure',
      address: 'House 24, Road 11, Block E, Banani, Dhaka 1213',
      mobile: '01713 882 190',
      website: 'https://www.coastalleisure.com',
      profilePicture: null,
    })
    expect(readAgencyProfile(TENANT_IDS.manpower)).toEqual({
      businessName: 'Horizon Manpower',
      address: 'Suite 5B, 88 Motijheel Commercial Area, Dhaka 1000',
      mobile: '01816 445 773',
      website: 'https://www.horizonmanpower.com',
      profilePicture: null,
    })
    expect(readAgencyProfile()).toEqual({
      businessName: 'OneTrack Demo',
      address: 'Level 4, Plot 11, Road 17, Gulshan 1, Dhaka 1212',
      mobile: '01670 221 884',
      website: 'https://www.onetrack.app',
      profilePicture: null,
    })
  })

  it('fills blank stored contact fields from the tenant defaults', () => {
    store.clear()
    saveAgencyProfile(
      {
        businessName: 'Coastal Leisure',
        address: '',
        mobile: '',
        website: '',
        profilePicture: null,
      },
      TENANT_IDS.leisure,
    )
    expect(readAgencyProfile(TENANT_IDS.leisure)).toEqual({
      businessName: 'Coastal Leisure',
      address: 'House 24, Road 11, Block E, Banani, Dhaka 1213',
      mobile: '01713 882 190',
      website: 'https://www.coastalleisure.com',
      profilePicture: null,
    })
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

  it('seeds business name from the agency name on onboard', () => {
    store.clear()
    const seeded = seedAgencyProfileBusinessName(
      'tenant-river',
      'River Tours',
    )
    expect(seeded.businessName).toBe('River Tours')
    expect(readAgencyProfile('tenant-river').businessName).toBe('River Tours')
  })

  it('does not overwrite an existing business name when seeding', () => {
    store.clear()
    saveAgencyProfile(
      { ...DEFAULT_AGENCY_PROFILE, businessName: 'Kept Name' },
      'tenant-river',
    )
    seedAgencyProfileBusinessName('tenant-river', 'River Tours')
    expect(readAgencyProfile('tenant-river').businessName).toBe('Kept Name')
  })

  it('falls back to the agency name when business name is blank', () => {
    expect(
      withBusinessNameFallback(DEFAULT_AGENCY_PROFILE, 'River Tours')
        .businessName,
    ).toBe('River Tours')
    expect(
      resolveBrandDisplay(DEFAULT_AGENCY_PROFILE, '/logo.svg', 'River Tours')
        .name,
    ).toBe('River Tours')
  })
})
