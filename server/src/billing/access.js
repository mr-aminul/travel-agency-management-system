import {
  ensureTenantBilling,
  getTenantBilling,
  resolveAccess,
} from './tenantBilling.js'

/** Paths agencies may still hit when billing is blocked. */
const BILLING_ALLOWED_PATH_PREFIXES = [
  '/api/platform/billing',
  '/api/platform/auth/logout',
  '/api/platform/auth/me',
  '/api/platform/auth/view-as/stop',
  '/api/platform/health',
]

export function isBillingExemptPath(path) {
  const p = String(path || '')
  return BILLING_ALLOWED_PATH_PREFIXES.some(
    (prefix) => p === prefix || p.startsWith(`${prefix}/`),
  )
}

/**
 * Express middleware: block write/read for expired/suspended agencies.
 * Platform admins and sub-agents skip (sub-agents inherit agency wall in UI).
 */
export function requireBillingAccess() {
  return async (req, res, next) => {
    try {
      if (isBillingExemptPath(req.path)) {
        next()
        return
      }
      const auth = req.auth
      if (!auth?.user) {
        next()
        return
      }
      if (auth.user.role === 'platform_admin') {
        next()
        return
      }
      const tenantId = auth.tenantId
      if (!tenantId) {
        next()
        return
      }

      let billing = await getTenantBilling(tenantId)
      if (!billing) {
        billing = await ensureTenantBilling(tenantId)
      }
      const access = resolveAccess(billing)
      req.billing = billing
      req.billingAccess = access

      if (!access.allowed) {
        res.status(402).json({
          error:
            access.wall === 'suspended'
              ? 'This agency is suspended. Contact support.'
              : 'Your trial or subscription has ended. Choose a plan to continue.',
          code:
            access.reason === 'suspended'
              ? 'billing_suspended'
              : 'billing_expired',
          wall: access.wall,
          billing,
        })
        return
      }
      next()
    } catch (error) {
      // Fail open on billing infra errors so ops is not bricked mid-migrate.
      console.error(
        '[billing-access]',
        error instanceof Error ? error.message : error,
      )
      next()
    }
  }
}
