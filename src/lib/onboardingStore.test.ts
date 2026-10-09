import { afterEach, describe, expect, it } from 'vitest'
import { DATA_KEYS } from '@/lib/data/keys'
import {
  dismissBusinessProfileNudge,
  getOnboardingState,
  resetOnboarding,
} from '@/lib/onboardingStore'

afterEach(() => {
  resetOnboarding()
  localStorage.removeItem(DATA_KEYS.onboardingState)
})

describe('onboardingStore business profile nudge', () => {
  it('starts undismissed and can be dismissed per tenant', () => {
    expect(getOnboardingState('tenant-a').businessProfileNudgeDismissed).not.toBe(
      true,
    )
    dismissBusinessProfileNudge('tenant-a')
    expect(getOnboardingState('tenant-a').businessProfileNudgeDismissed).toBe(
      true,
    )
    expect(getOnboardingState('tenant-b').businessProfileNudgeDismissed).not.toBe(
      true,
    )
  })
})
