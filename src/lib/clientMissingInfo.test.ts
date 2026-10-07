import { describe, expect, it } from 'vitest'
import {
  clientCanAdvanceServices,
  clientProgressBlockers,
  listClientInfoGaps,
  progressBlockedMessage,
  type ClientInfoGapId,
} from '@/lib/clientMissingInfo'

describe('clientMissingInfo', () => {
  it('lists passport as a progress blocker when missing', () => {
    const gaps = listClientInfoGaps({
      passport: '',
      nid: '',
      address: '',
      email: '',
    })

    expect(gaps.map((gap) => gap.id)).toEqual([
      'passport',
      'nid',
      'address',
      'email',
    ])
    expect(clientProgressBlockers({ passport: '' })).toEqual([
      expect.objectContaining({ id: 'passport', blocksProgress: true }),
    ])
    expect(clientCanAdvanceServices({ passport: '' })).toBe(false)
  })

  it('requires passport dates once a passport number is set', () => {
    const gaps = listClientInfoGaps({
      passport: 'A12345678',
      passportIssuedOn: '',
      passportExpiry: '',
      nid: '123',
      address: 'Dhaka',
      email: 'a@b.com',
    })

    expect(gaps.map((gap) => gap.id)).toEqual([
      'passportIssuedOn',
      'passportExpiry',
    ])
    expect(clientCanAdvanceServices({
      passport: 'A12345678',
      passportIssuedOn: '',
      passportExpiry: '',
    })).toBe(false)
    expect(
      clientCanAdvanceServices({
        passport: 'A12345678',
        passportIssuedOn: '2020-06-16',
        passportExpiry: '2030-06-15',
      }),
    ).toBe(true)
  })

  it('allows service progress once passport and dates are present', () => {
    expect(
      clientCanAdvanceServices({
        passport: 'A12345678',
        passportIssuedOn: '2020-06-16',
        passportExpiry: '2030-06-15',
        nid: '',
        address: '',
        email: '',
      }),
    ).toBe(true)
    expect(
      listClientInfoGaps({
        passport: 'A12345678',
        passportIssuedOn: '2020-06-16',
        passportExpiry: '2030-06-15',
        nid: '123',
        address: 'Dhaka',
        email: 'a@b.com',
      }),
    ).toEqual([])
  })

  it('explains the passport block in plain language', () => {
    const blockers = clientProgressBlockers({ passport: undefined })
    expect(progressBlockedMessage(blockers)).toMatch(/passport number/i)
  })

  it('never treats sub agent as a progress gap', () => {
    expect(
      clientCanAdvanceServices({
        passport: 'A12345678',
        passportIssuedOn: '2020-06-16',
        passportExpiry: '2030-06-15',
      }),
    ).toBe(true)
    expect(
      listClientInfoGaps({
        passport: 'A12345678',
        passportIssuedOn: '2020-06-16',
        passportExpiry: '2030-06-15',
        nid: '123',
        address: 'Dhaka',
        email: 'a@b.com',
      }).some((gap) => gap.id === ('subAgent' as ClientInfoGapId)),
    ).toBe(false)
  })
})
