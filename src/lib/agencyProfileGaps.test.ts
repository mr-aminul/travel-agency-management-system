import { describe, expect, it } from 'vitest'
import { DEFAULT_AGENCY_PROFILE } from '@/lib/agencyProfile'
import {
  agencyProfileIsIncomplete,
  listAgencyProfileGaps,
  settingsNavAlertCount,
} from '@/lib/agencyProfileGaps'

describe('agencyProfileGaps', () => {
  it('lists every missing required field', () => {
    expect(listAgencyProfileGaps(DEFAULT_AGENCY_PROFILE)).toEqual([
      { id: 'businessName', label: 'Business name' },
      { id: 'address', label: 'Address' },
      { id: 'mobile', label: 'Mobile number' },
    ])
  })

  it('ignores optional website and logo', () => {
    expect(
      listAgencyProfileGaps({
        businessName: 'River Tours',
        address: 'Dhaka',
        mobile: '01700000000',
      }),
    ).toEqual([])
  })

  it('treats whitespace-only values as missing', () => {
    expect(
      listAgencyProfileGaps({
        businessName: '  ',
        address: 'Dhaka',
        mobile: '01700000000',
      }),
    ).toEqual([{ id: 'businessName', label: 'Business name' }])
  })

  it('uses a single settings nav badge when incomplete', () => {
    expect(settingsNavAlertCount(DEFAULT_AGENCY_PROFILE)).toBe(1)
    expect(
      settingsNavAlertCount({
        businessName: 'River Tours',
        address: 'Dhaka',
        mobile: '01700000000',
      }),
    ).toBe(0)
    expect(agencyProfileIsIncomplete(DEFAULT_AGENCY_PROFILE)).toBe(true)
  })
})
