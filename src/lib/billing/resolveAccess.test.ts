import { describe, expect, it } from 'vitest'
import {
  isTrialExpired,
  resolveAccess,
} from '../../../server/src/billing/resolveAccess.js'

describe('resolveAccess', () => {
  it('allows live Growth trials', () => {
    const access = resolveAccess({
      billingStatus: 'trial',
      planKind: 'trial',
      trialEndsAt: new Date(Date.now() + 86400000).toISOString(),
    })
    expect(access).toEqual({
      allowed: true,
      reason: 'trial',
      wall: null,
    })
  })

  it('walls expired trials so they must choose a plan', () => {
    const access = resolveAccess({
      billingStatus: 'trial',
      planKind: 'trial',
      trialEndsAt: new Date(Date.now() - 1000).toISOString(),
    })
    expect(access).toEqual({
      allowed: false,
      reason: 'trial_expired',
      wall: 'expired',
    })
    expect(
      isTrialExpired({
        billingStatus: 'trial',
        planKind: 'trial',
        trialEndsAt: new Date(Date.now() - 1000).toISOString(),
      }),
    ).toBe(true)
  })

  it('allows active paid and comp plans', () => {
    expect(
      resolveAccess({ billingStatus: 'active', planKind: 'standard' }),
    ).toMatchObject({ allowed: true, wall: null })
    expect(
      resolveAccess({ billingStatus: 'active', planKind: 'comp' }),
    ).toMatchObject({ allowed: true, reason: 'active' })
  })

  it('blocks suspended and canceled', () => {
    expect(resolveAccess({ billingStatus: 'suspended' })).toEqual({
      allowed: false,
      reason: 'suspended',
      wall: 'suspended',
    })
    expect(resolveAccess({ billingStatus: 'canceled' })).toEqual({
      allowed: false,
      reason: 'canceled',
      wall: 'expired',
    })
  })
})
