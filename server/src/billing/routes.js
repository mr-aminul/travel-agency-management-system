import { isPlatformAdmin } from '../kvAccess.js'
import { assertCanManageUsers } from '../rbac.js'
import {
  listPlanTemplates,
  getPlanTemplate,
  createPlanTemplate,
  updatePlanTemplate,
  deletePlanTemplate,
} from './plans.js'
import {
  applyPlanToTenant,
  ensureTenantBilling,
  extendTrial,
  getTenantBilling,
  listTenantBillingSummaries,
  resolveAccess,
  setBillingStatus,
  startTrialForTenant,
  updateBillingNotes,
} from './tenantBilling.js'
import { getUsageSnapshot } from './quotas.js'
import {
  createPlanInvoice,
  getInvoice,
  listInvoicesForTenant,
  listPendingInvoices,
  markInvoicePaid,
  submitInvoicePayment,
  voidInvoice,
} from './invoices.js'
import {
  createCheckout,
  handleGatewayWebhook,
  handleUddoktaPayReturn,
  handleUddoktaPayWebhook,
  paymentInstructions,
} from './gateway.js'

function tenantScope(req, explicit) {
  if (isPlatformAdmin(req.auth) && explicit) return String(explicit).trim()
  return req.auth?.tenantId
}

export function registerBillingRoutes(app, { requireAuth, requirePlatformAdmin }) {
  app.get('/api/platform/billing/plans', requireAuth, async (_req, res) => {
    try {
      const plans = await listPlanTemplates({ publicOnly: true })
      res.json({ plans, instructions: paymentInstructions() })
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'list plans failed',
      })
    }
  })

  app.get('/api/platform/billing/me', requireAuth, async (req, res) => {
    try {
      const tenantId = tenantScope(req, req.query.tenantId)
      if (!tenantId) {
        res.status(400).json({ error: 'tenantId required.' })
        return
      }
      if (
        !isPlatformAdmin(req.auth) &&
        tenantId !== req.auth.tenantId
      ) {
        res.status(403).json({ error: 'Forbidden.' })
        return
      }
      await ensureTenantBilling(tenantId)
      const snapshot = await getUsageSnapshot(tenantId)
      const access = resolveAccess(snapshot.billing)
      const invoices = await listInvoicesForTenant(tenantId, { limit: 20 })
      res.json({
        ...snapshot,
        access,
        invoices,
        instructions: paymentInstructions(),
      })
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'billing summary failed',
      })
    }
  })

  app.post('/api/platform/billing/checkout', requireAuth, async (req, res) => {
    try {
      const tenantId = tenantScope(req, req.body?.tenantId)
      if (!tenantId) {
        res.status(400).json({ error: 'tenantId required.' })
        return
      }
      if (!isPlatformAdmin(req.auth)) {
        const gate = await assertCanManageUsers(req.auth, tenantId)
        if (!gate.ok) {
          res.status(gate.status).json({ error: gate.error })
          return
        }
      }
      const planId = String(req.body?.planId ?? '').trim()
      // Amount override is admin-only (gateway / invoice testing).
      const amountBdt = isPlatformAdmin(req.auth)
        ? req.body?.amountBdt
        : undefined
      const result = await createCheckout({
        tenantId,
        planId,
        returnUrl: req.body?.returnUrl,
        amountBdt,
        customer: {
          fullName: req.auth?.user?.name,
          email: req.auth?.user?.email,
        },
      })
      if (!result.ok) {
        res.status(result.status || 400).json({ error: result.error })
        return
      }
      res.status(201).json(result)
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'checkout failed',
      })
    }
  })

  app.post(
    '/api/platform/billing/invoices/:invoiceId/submit-payment',
    requireAuth,
    async (req, res) => {
      try {
        const invoice = await getInvoice(req.params.invoiceId)
        if (!invoice) {
          res.status(404).json({ error: 'Invoice not found.' })
          return
        }
        if (
          !isPlatformAdmin(req.auth) &&
          invoice.tenantId !== req.auth.tenantId
        ) {
          res.status(403).json({ error: 'Forbidden.' })
          return
        }
        if (!isPlatformAdmin(req.auth)) {
          const gate = await assertCanManageUsers(
            req.auth,
            invoice.tenantId,
          )
          if (!gate.ok) {
            res.status(gate.status).json({ error: gate.error })
            return
          }
        }
        const result = await submitInvoicePayment({
          invoiceId: invoice.id,
          tenantId: invoice.tenantId,
          paymentMethod: req.body?.paymentMethod,
          paymentReference: req.body?.paymentReference,
          paymentNote: req.body?.paymentNote,
        })
        if (!result.ok) {
          res.status(result.status).json({ error: result.error })
          return
        }
        res.json(result)
      } catch (error) {
        res.status(500).json({
          error:
            error instanceof Error ? error.message : 'submit payment failed',
        })
      }
    },
  )

  app.post('/api/platform/billing/sync', requireAuth, async (req, res) => {
    try {
      const tenantId = tenantScope(req, req.body?.tenantId)
      if (!tenantId) {
        res.status(400).json({ error: 'tenantId required.' })
        return
      }
      const billing = await ensureTenantBilling(tenantId)
      const snapshot = await getUsageSnapshot(tenantId)
      res.json({
        billing,
        access: resolveAccess(billing),
        snapshot,
      })
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'sync failed',
      })
    }
  })

  app.post(
    '/api/platform/billing/cancel',
    requireAuth,
    async (req, res) => {
      try {
        const tenantId = tenantScope(req, req.body?.tenantId)
        if (!tenantId) {
          res.status(400).json({ error: 'tenantId required.' })
          return
        }
        if (!isPlatformAdmin(req.auth)) {
          const gate = await assertCanManageUsers(req.auth, tenantId)
          if (!gate.ok) {
            res.status(gate.status).json({ error: gate.error })
            return
          }
        }
        const result = await setBillingStatus(tenantId, 'canceled', {
          cancelAtPeriodEnd: true,
          billingNotes: 'Canceled by agency owner.',
        })
        res.json(result)
      } catch (error) {
        res.status(500).json({
          error: error instanceof Error ? error.message : 'cancel failed',
        })
      }
    },
  )

  app.post(
    '/api/platform/webhooks/billing',
    async (req, res) => {
      try {
        const result = await handleGatewayWebhook(req.body, req.headers)
        if (!result.ok) {
          res.status(result.status || 400).json({ error: result.error })
          return
        }
        res.json(result)
      } catch (error) {
        res.status(500).json({
          error: error instanceof Error ? error.message : 'webhook failed',
        })
      }
    },
  )

  /** Paymently / UddoktaPay IPN */
  app.post(
    '/api/platform/webhooks/billing/uddoktapay',
    async (req, res) => {
      try {
        const result = await handleUddoktaPayWebhook(req.body, req.headers)
        if (!result.ok) {
          res.status(result.status || 400).json({ error: result.error })
          return
        }
        res.json(result)
      } catch (error) {
        res.status(500).json({
          error: error instanceof Error ? error.message : 'webhook failed',
        })
      }
    },
  )

  /**
   * Browser return after Paymently checkout.
   * Verifies invoice_id then redirects to the UI billing page.
   */
  const uddoktaPayReturnHandler = async (req, res) => {
    try {
      const providerInvoiceId =
        req.query?.invoice_id ||
        req.body?.invoice_id ||
        req.query?.invoiceId ||
        req.body?.invoiceId
      const result = await handleUddoktaPayReturn({
        providerInvoiceId,
        returnUrl: req.query?.return_url || req.body?.return_url,
      })
      if (result.redirectUrl) {
        res.redirect(303, result.redirectUrl)
        return
      }
      res.status(result.status || 400).json({ error: result.error })
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'return handler failed',
      })
    }
  }
  app.get(
    '/api/platform/billing/uddoktapay/return',
    uddoktaPayReturnHandler,
  )
  app.post(
    '/api/platform/billing/uddoktapay/return',
    uddoktaPayReturnHandler,
  )

  // —— Admin ——
  app.get(
    '/api/platform/admin/billing/plans',
    requirePlatformAdmin,
    async (_req, res) => {
      try {
        const plans = await listPlanTemplates({
          publicOnly: false,
          includeInactive: true,
        })
        res.json({ plans })
      } catch (error) {
        res.status(500).json({
          error: error instanceof Error ? error.message : 'list plans failed',
        })
      }
    },
  )

  app.post(
    '/api/platform/admin/billing/plans',
    requirePlatformAdmin,
    async (req, res) => {
      try {
        const result = await createPlanTemplate(req.body || {})
        if (!result.ok) {
          res.status(result.status || 400).json({ error: result.error })
          return
        }
        res.status(201).json(result)
      } catch (error) {
        res.status(500).json({
          error: error instanceof Error ? error.message : 'create plan failed',
        })
      }
    },
  )

  app.patch(
    '/api/platform/admin/billing/plans/:planId',
    requirePlatformAdmin,
    async (req, res) => {
      try {
        const result = await updatePlanTemplate(req.params.planId, req.body || {})
        if (!result.ok) {
          res.status(result.status || 400).json({ error: result.error })
          return
        }
        res.json(result)
      } catch (error) {
        res.status(500).json({
          error: error instanceof Error ? error.message : 'update plan failed',
        })
      }
    },
  )

  app.delete(
    '/api/platform/admin/billing/plans/:planId',
    requirePlatformAdmin,
    async (req, res) => {
      try {
        const hard =
          String(req.query.hard ?? '').toLowerCase() === '1' ||
          String(req.query.hard ?? '').toLowerCase() === 'true'
        const result = await deletePlanTemplate(req.params.planId, { hard })
        if (!result.ok) {
          res.status(result.status || 400).json({ error: result.error })
          return
        }
        res.json(result)
      } catch (error) {
        res.status(500).json({
          error: error instanceof Error ? error.message : 'delete plan failed',
        })
      }
    },
  )

  app.get(
    '/api/platform/admin/billing/tenants',
    requirePlatformAdmin,
    async (_req, res) => {
      try {
        const tenants = await listTenantBillingSummaries()
        const pending = await listPendingInvoices()
        res.json({ tenants, pendingInvoices: pending })
      } catch (error) {
        res.status(500).json({
          error:
            error instanceof Error ? error.message : 'list billing failed',
        })
      }
    },
  )

  app.get(
    '/api/platform/admin/billing/tenants/:tenantId',
    requirePlatformAdmin,
    async (req, res) => {
      try {
        const tenantId = String(req.params.tenantId || '').trim()
        await ensureTenantBilling(tenantId)
        const snapshot = await getUsageSnapshot(tenantId)
        const invoices = await listInvoicesForTenant(tenantId, { limit: 50 })
        res.json({
          ...snapshot,
          access: resolveAccess(snapshot.billing),
          invoices,
        })
      } catch (error) {
        res.status(500).json({
          error:
            error instanceof Error ? error.message : 'tenant billing failed',
        })
      }
    },
  )

  app.post(
    '/api/platform/admin/billing/tenants/:tenantId/apply-plan',
    requirePlatformAdmin,
    async (req, res) => {
      try {
        const tenantId = String(req.params.tenantId || '').trim()
        const planId = String(req.body?.planId ?? '').trim()
        const plan = await getPlanTemplate(planId)
        if (!plan) {
          res.status(404).json({ error: 'Plan not found.' })
          return
        }
        const result = await applyPlanToTenant({
          tenantId,
          planId,
          billingStatus: req.body?.billingStatus || 'active',
          planKind: req.body?.planKind || 'comp',
          trialEndsAt: req.body?.trialEndsAt || null,
          currentPeriodEnd: req.body?.currentPeriodEnd || null,
          overrides: {
            userLimit: req.body?.userLimit,
            subAgentLimit: req.body?.subAgentLimit,
            storageLimitBytes: req.body?.storageLimitBytes,
            smsLimit: req.body?.smsLimit,
            smsOverageBdt: req.body?.smsOverageBdt,
          },
        })
        if (!result.ok) {
          res.status(result.status || 400).json({ error: result.error })
          return
        }
        res.json(result)
      } catch (error) {
        res.status(500).json({
          error: error instanceof Error ? error.message : 'apply plan failed',
        })
      }
    },
  )

  app.post(
    '/api/platform/admin/billing/tenants/:tenantId/extend-trial',
    requirePlatformAdmin,
    async (req, res) => {
      try {
        const tenantId = String(req.params.tenantId || '').trim()
        const days = Number(req.body?.days ?? 14)
        const result = await extendTrial(tenantId, days)
        res.json(result)
      } catch (error) {
        res.status(500).json({
          error:
            error instanceof Error ? error.message : 'extend trial failed',
        })
      }
    },
  )

  app.post(
    '/api/platform/admin/billing/tenants/:tenantId/start-trial',
    requirePlatformAdmin,
    async (req, res) => {
      try {
        const tenantId = String(req.params.tenantId || '').trim()
        const result = await startTrialForTenant(tenantId, {
          days: req.body?.days,
        })
        res.json(result)
      } catch (error) {
        res.status(500).json({
          error:
            error instanceof Error ? error.message : 'start trial failed',
        })
      }
    },
  )

  app.patch(
    '/api/platform/admin/billing/tenants/:tenantId',
    requirePlatformAdmin,
    async (req, res) => {
      try {
        const tenantId = String(req.params.tenantId || '').trim()
        if (req.body?.billingStatus) {
          await setBillingStatus(tenantId, String(req.body.billingStatus), {
            billingNotes: req.body?.billingNotes,
            cancelAtPeriodEnd: req.body?.cancelAtPeriodEnd,
          })
        } else if (req.body?.billingNotes != null) {
          await updateBillingNotes(tenantId, req.body.billingNotes)
        }
        const billing = await getTenantBilling(tenantId)
        res.json({ billing })
      } catch (error) {
        res.status(500).json({
          error: error instanceof Error ? error.message : 'update failed',
        })
      }
    },
  )

  app.post(
    '/api/platform/admin/billing/invoices/:invoiceId/mark-paid',
    requirePlatformAdmin,
    async (req, res) => {
      try {
        const result = await markInvoicePaid({
          invoiceId: req.params.invoiceId,
          verifiedBy: req.auth?.user?.id || 'admin',
          activatePlan: req.body?.activatePlan !== false,
        })
        if (!result.ok) {
          res.status(result.status || 400).json({ error: result.error })
          return
        }
        res.json(result)
      } catch (error) {
        res.status(500).json({
          error: error instanceof Error ? error.message : 'mark paid failed',
        })
      }
    },
  )

  app.post(
    '/api/platform/admin/billing/invoices/:invoiceId/void',
    requirePlatformAdmin,
    async (req, res) => {
      try {
        const invoice = await voidInvoice(req.params.invoiceId)
        res.json({ invoice })
      } catch (error) {
        res.status(500).json({
          error: error instanceof Error ? error.message : 'void failed',
        })
      }
    },
  )

  app.post(
    '/api/platform/admin/billing/invoices',
    requirePlatformAdmin,
    async (req, res) => {
      try {
        const result = await createPlanInvoice({
          tenantId: String(req.body?.tenantId ?? '').trim(),
          planId: String(req.body?.planId ?? '').trim(),
          description: req.body?.description,
          amountBdt: req.body?.amountBdt,
        })
        if (!result.ok) {
          res.status(result.status || 400).json({ error: result.error })
          return
        }
        res.status(201).json(result)
      } catch (error) {
        res.status(500).json({
          error:
            error instanceof Error ? error.message : 'create invoice failed',
        })
      }
    },
  )
}
