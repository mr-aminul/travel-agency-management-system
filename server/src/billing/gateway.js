/**
 * Payment gateway adapter.
 *
 * Default: manual (bKash / Nagad / bank) via billing invoices.
 * When you provide a gateway API, set BILLING_GATEWAY=external and implement
 * createCheckout / handleWebhook below (or point env at the provider).
 */

import crypto from 'node:crypto'
import { query } from '../db.js'
import { createPlanInvoice, markInvoicePaid } from './invoices.js'
import { applyPlanToTenant, setBillingStatus } from './tenantBilling.js'

export function gatewayMode() {
  const mode = String(process.env.BILLING_GATEWAY || 'manual')
    .trim()
    .toLowerCase()
  return mode === 'external' ? 'external' : 'manual'
}

export function paymentInstructions() {
  return {
    mode: gatewayMode(),
    bkash: String(process.env.BILLING_BKASH_NUMBER || '').trim() || null,
    nagad: String(process.env.BILLING_NAGAD_NUMBER || '').trim() || null,
    bankName: String(process.env.BILLING_BANK_NAME || '').trim() || null,
    bankAccount:
      String(process.env.BILLING_BANK_ACCOUNT || '').trim() || null,
    bankRouting:
      String(process.env.BILLING_BANK_ROUTING || '').trim() || null,
    supportEmail:
      String(process.env.BILLING_SUPPORT_EMAIL || '').trim() ||
      'support@inventivelab.bd',
    note:
      String(process.env.BILLING_PAY_NOTE || '').trim() ||
      'Pay the invoice amount, then submit your transaction ID for verification.',
  }
}

export async function createCheckout({
  tenantId,
  planId,
  returnUrl,
  amountBdt,
}) {
  const invoiceResult = await createPlanInvoice({
    tenantId,
    planId,
    amountBdt,
  })
  if (!invoiceResult.ok) return invoiceResult

  if (gatewayMode() === 'external') {
    // Hook for the real provider: create a session, return redirectUrl.
    const base =
      String(process.env.BILLING_GATEWAY_CHECKOUT_URL || '').trim() || null
    if (base) {
      const url = new URL(base)
      url.searchParams.set('invoice_id', invoiceResult.invoice.id)
      url.searchParams.set('tenant_id', tenantId)
      url.searchParams.set('plan_id', planId)
      if (returnUrl) url.searchParams.set('return_url', returnUrl)
      return {
        ok: true,
        mode: 'external',
        invoice: invoiceResult.invoice,
        plan: invoiceResult.plan,
        redirectUrl: url.toString(),
      }
    }
  }

  return {
    ok: true,
    mode: 'manual',
    invoice: invoiceResult.invoice,
    plan: invoiceResult.plan,
    redirectUrl: null,
    instructions: paymentInstructions(),
  }
}

async function claimWebhookEvent(provider, eventId, payload) {
  const id = String(eventId ?? '').trim()
  if (!id) {
    return { ok: false, status: 400, error: 'Missing event id.' }
  }
  try {
    await query(
      `insert into platform.billing_webhook_events (id, provider, payload, claimed_at)
       values ($1, $2, $3::jsonb, now())`,
      [id, provider, JSON.stringify(payload ?? {})],
    )
    return { ok: true, claimed: true }
  } catch (error) {
    if (String(error?.code) === '23505') {
      return { ok: true, claimed: false, duplicate: true }
    }
    throw error
  }
}

async function markWebhookProcessed(eventId) {
  await query(
    `update platform.billing_webhook_events
     set processed_at = now()
     where id = $1`,
    [eventId],
  )
}

async function releaseWebhookClaim(eventId) {
  await query(`delete from platform.billing_webhook_events where id = $1`, [
    eventId,
  ])
}

/**
 * Generic webhook shape (provider-agnostic):
 * {
 *   eventId, type: 'payment.succeeded' | 'payment.failed' | 'subscription.canceled',
 *   invoiceId?, tenantId?, planId?, subscriptionId?, customerId?
 * }
 */
export async function handleGatewayWebhook(rawBody, headers = {}) {
  const secret = String(process.env.BILLING_WEBHOOK_SECRET || '').trim()
  if (secret) {
    const token = String(
      headers['x-billing-webhook-token'] ||
        headers['x-webhook-token'] ||
        '',
    ).trim()
    if (token !== secret) {
      return { ok: false, status: 401, error: 'Invalid webhook token.' }
    }
  }

  const body =
    typeof rawBody === 'string' ? JSON.parse(rawBody || '{}') : rawBody || {}
  const eventId =
    String(body.eventId || body.id || '').trim() ||
    `evt-${crypto.randomBytes(8).toString('hex')}`
  const type = String(body.type || body.event || '').trim()

  const claim = await claimWebhookEvent('external', eventId, body)
  if (!claim.ok) return claim
  if (claim.duplicate) {
    return { ok: true, duplicate: true }
  }

  try {
    if (type === 'payment.succeeded' || type === 'invoice.paid') {
      const invoiceId = String(body.invoiceId || body.invoice_id || '').trim()
      if (invoiceId) {
        await markInvoicePaid({
          invoiceId,
          verifiedBy: 'gateway',
          activatePlan: true,
        })
      } else if (body.tenantId && body.planId) {
        await applyPlanToTenant({
          tenantId: String(body.tenantId),
          planId: String(body.planId),
          billingStatus: 'active',
          planKind: 'standard',
          gatewayCustomerId: body.customerId || null,
          gatewaySubscriptionId: body.subscriptionId || null,
        })
      }
    } else if (type === 'payment.failed' || type === 'invoice.payment_failed') {
      if (body.tenantId) {
        await setBillingStatus(String(body.tenantId), 'past_due')
      }
    } else if (
      type === 'subscription.canceled' ||
      type === 'customer.subscription.deleted'
    ) {
      if (body.tenantId) {
        await setBillingStatus(String(body.tenantId), 'canceled', {
          cancelAtPeriodEnd: false,
        })
      }
    }

    await markWebhookProcessed(eventId)
    return { ok: true, eventId, type }
  } catch (error) {
    await releaseWebhookClaim(eventId)
    return {
      ok: false,
      status: 500,
      error: error instanceof Error ? error.message : 'Webhook failed.',
    }
  }
}
