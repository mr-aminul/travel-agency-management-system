/**
 * Pure billing access rules (no DB). Used by API middleware and unit tests.
 */

export function isTrialExpired(billing) {
  if (!billing) return false
  if (billing.billingStatus !== 'trial' && billing.planKind !== 'trial') {
    return false
  }
  if (!billing.trialEndsAt) return false
  return new Date(billing.trialEndsAt).getTime() <= Date.now()
}

/** Access rules: active + past_due + live trial allowed; expired trial / suspended / canceled blocked. */
export function resolveAccess(billing) {
  if (!billing) {
    return {
      allowed: true,
      reason: 'unprovisioned',
      wall: null,
    }
  }
  if (billing.billingStatus === 'suspended') {
    return { allowed: false, reason: 'suspended', wall: 'suspended' }
  }
  if (billing.billingStatus === 'canceled') {
    return { allowed: false, reason: 'canceled', wall: 'expired' }
  }
  if (billing.billingStatus === 'past_due') {
    return { allowed: true, reason: 'past_due', wall: null, grace: true }
  }
  if (billing.billingStatus === 'active' || billing.planKind === 'comp') {
    return { allowed: true, reason: 'active', wall: null }
  }
  if (billing.billingStatus === 'trial' || billing.planKind === 'trial') {
    if (isTrialExpired(billing)) {
      return { allowed: false, reason: 'trial_expired', wall: 'expired' }
    }
    return { allowed: true, reason: 'trial', wall: null }
  }
  return { allowed: false, reason: 'unknown', wall: 'expired' }
}
