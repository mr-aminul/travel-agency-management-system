import { describe, expect, it } from 'vitest'
import {
  clientCanAdvanceServices,
  clientProgressBlockers,
  listClientInfoGaps,
  progressBlockedMessage,
} from '@/lib/clientMissingInfo'

describe('clientMissingInfo', () => {
  it('lists passport as recommended, never as a progress blocker', () => {
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
    expect(gaps.find((gap) => gap.id === 'passport')).toEqual(
      expect.objectContaining({ blocksProgress: false }),
    )
    expect(clientProgressBlockers({ passport: '' })).toEqual([])
    expect(clientCanAdvanceServices({ passport: '' })).toBe(true)
  })

  it('still surfaces passport dates once a passport number is set', () => {
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
    expect(gaps.every((gap) => gap.blocksProgress === false)).toBe(true)
    expect(
      clientCanAdvanceServices({
        passport: 'A12345678',
        passportIssuedOn: '',
        passportExpiry: '',
      }),
    ).toBe(true)
    expect(
      clientCanAdvanceServices({
        passport: 'A12345678',
        passportIssuedOn: '2020-06-16',
        passportExpiry: '2030-06-15',
      }),
    ).toBe(true)
  })

  it('clears gaps once passport and dates are present', () => {
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

  it('keeps progressBlockedMessage ready for future hard blockers', () => {
    expect(
      progressBlockedMessage([
        {
          id: 'passport',
          label: 'Passport number',
          blocksProgress: true,
          hint: 'Needed',
        },
      ]),
    ).toMatch(/passport number/i)
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
      }),
    ).toEqual([])
  })
})
