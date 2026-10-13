/**
 * Payment gateway adapter.
 *
 * Modes:
 * - manual (default): bKash / Nagad / bank + admin verify
 * - uddoktapay | paymently: hosted checkout via Paymently/UddoktaPay
 * - external: legacy stub redirect URL
 */

import crypto from 'node:crypto'
import { query } from '../db.js'
import {
  attachGatewayPayment,
  createPlanInvoice,
  getInvoice,
  markInvoicePaid,
} from './invoices.js'
import { applyPlanToTenant, setBillingStatus } from './tenantBilling.js'
import {
  createUddoktaPayCharge,
  headerMatchesUddoktaPayApiKey,
  uddoktapayConfigured,
  verifyUddoktaPayPayment,
} from './uddoktapay.js'

const UDDOKTAPAY_MODES = new Set(['uddoktapay', 'paymently'])

export function gatewayMode() {
  const mode = String(process.env.BILLING_GATEWAY || 'manual')
    .trim()
    .toLowerCase()
  if (UDDOKTAPAY_MODES.has(mode)) return 'uddoktapay'
  if (mode === 'external') return 'external'
  return 'manual'
}

function publicUiBase() {
  return (
    String(process.env.PLATFORM_PUBLIC_UI_URL || '').trim().replace(/\/+$/, '') ||
    'https://app.inventivelab.bd'
  )
}

function publicApiBase() {
  const explicit = String(process.env.PLATFORM_PUBLIC_API_URL || '')
    .trim()
    .replace(/\/+$/, '')
  if (explicit) return explicit
  // Same-origin /api via Caddy on the UI host.
  return publicUiBase()
}

export function paymentInstructions() {
  const mode = gatewayMode()
  const online = mode === 'uddoktapay'
  return {
    mode: online ? 'uddoktapay' : mode === 'external' ? 'external' : 'manual',
    online,
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
    note: online
      ? String(process.env.BILLING_PAY_NOTE || '').trim() ||
        'You will be redirected to Paymently to pay with bKash, Nagad, or other methods. Access activates automatically after payment.'
      : String(process.env.BILLING_PAY_NOTE || '').trim() ||
        'Pay the invoice amount, then submit your transaction ID for verification.',
  }
}

async function createUddoktaPayCheckout({
  tenantId,
  planId,
  returnUrl,
  invoice,
  plan,
  customer,
}) {
  if (!uddoktapayConfigured()) {
    return {
      ok: false,
      status: 503,
      error:
        'Paymently/UddoktaPay is not configured. Set UDDOKTAPAY_API_KEY and UDDOKTAPAY_API_URL.',
    }
  }

  const apiBase = publicApiBase()
  const uiBase = publicUiBase()
  const successReturn =
    String(returnUrl || '').trim() || `${uiBase}/billing`
  const redirectUrl = `${apiBase}/api/platform/billing/uddoktapay/return`
  const cancelUrl = `${uiBase}/billing?payment=canceled`
  const webhookUrl = `${apiBase}/api/platform/webhooks/billing/uddoktapay`

  try {
    const { paymentUrl } = await createUddoktaPayCharge({
      fullName: customer?.fullName,
      email: customer?.email,
      amount: invoice.amountBdt,
      metadata: {
        billing_invoice_id: invoice.id,
        tenant_id: tenantId,
        plan_id: planId,
        return_url: successReturn,
      },
      redirectUrl,
      cancelUrl,
      webhookUrl,
      returnType: 'GET',
    })

    await attachGatewayPayment({
      invoiceId: invoice.id,
      paymentMethod: 'gateway',
    })

    return {
      ok: true,
      mode: 'uddoktapay',
      invoice: await getInvoice(invoice.id),
      plan,
      redirectUrl: paymentUrl,
      instructions: paymentInstructions(),
    }
  } catch (error) {
    return {
      ok: false,
      status: error?.status && error.status < 500 ? error.status : 502,
      error:
        error instanceof Error
          ? error.message
          : 'Could not start Paymently checkout.',
    }
  }
}

export async function createCheckout({
  tenantId,
  planId,
  returnUrl,
  amountBdt,
  customer,
  description,
}) {
  const invoiceResult = await createPlanInvoice({
    tenantId,
    planId,
    amountBdt,
    description,
  })
  if (!invoiceResult.ok) return invoiceResult

  const { invoice, plan } = invoiceResult

  // Free / zero-taka invoices activate immediately (e.g. test plan).
  if (Number(invoice.amountBdt) <= 0) {
    const paid = await markInvoicePaid({
      invoiceId: invoice.id,
      verifiedBy: 'gateway-zero',
      activatePlan: true,
      paymentMethod: 'gateway',
      paymentReference: 'zero-amount',
    })
    return {
      ok: true,
      mode: gatewayMode(),
      invoice: paid.invoice,
      plan,
      redirectUrl: null,
      activated: true,
      instructions: paymentInstructions(),
    }
  }

  const mode = gatewayMode()

  if (mode === 'uddoktapay') {
    return createUddoktaPayCheckout({
      tenantId,
      planId,
      returnUrl,
      invoice,
      plan,
      customer,
    })
  }

  if (mode === 'external') {
    const base =
      String(process.env.BILLING_GATEWAY_CHECKOUT_URL || '').trim() || null
    if (base) {
      const url = new URL(base)
      url.searchParams.set('invoice_id', invoice.id)
      url.searchParams.set('tenant_id', tenantId)
      url.searchParams.set('plan_id', planId)
      if (returnUrl) url.searchParams.set('return_url', returnUrl)
      return {
        ok: true,
        mode: 'external',
        invoice,
        plan,
        redirectUrl: url.toString(),
        instructions: paymentInstructions(),
      }
    }
  }

  return {
    ok: true,
    mode: 'manual',
    invoice,
    plan,
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

function metadataObject(raw) {
  if (!raw) return {}
  if (typeof raw === 'object') return raw
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      return parsed && typeof parsed === 'object' ? parsed : {}
    } catch {
      return {}
    }
  }
  return {}
}

async function resolveBillingInvoiceIdFromPayment(data) {
  const meta = metadataObject(data?.metadata)
  const fromMeta = String(meta.billing_invoice_id || meta.invoice_id || '').trim()
  if (fromMeta.startsWith('binv-')) return fromMeta

  const providerId = String(data?.invoice_id || '').trim()
  if (providerId) {
    const byGateway = await query(
      `select id from platform.billing_invoices
       where gateway_payment_id = $1
       order by created_at desc
       limit 1`,
      [providerId],
    )
    if (byGateway.rows[0]?.id) return byGateway.rows[0].id
  }
  return null
}

/**
 * Apply a verified UddoktaPay/Paymently payment payload to our invoice.
 */
export async function applyUddoktaPayPayment(data, { verifiedBy = 'uddoktapay' } = {}) {
  const status = String(data?.status || '').trim().toUpperCase()
  if (status !== 'COMPLETED') {
    return {
      ok: false,
      status: 409,
      error: `Payment status is ${status || 'unknown'}, not COMPLETED.`,
      paymentStatus: status,
    }
  }

  const billingInvoiceId = await resolveBillingInvoiceIdFromPayment(data)
  if (!billingInvoiceId) {
    return {
      ok: false,
      status: 404,
      error: 'No matching billing invoice for this payment.',
    }
  }

  const amountPaid = Number(data?.amount ?? data?.charged_amount)
  const invoice = await getInvoice(billingInvoiceId)
  if (invoice && Number.isFinite(amountPaid) && amountPaid > 0) {
    const expected = Number(invoice.amountBdt)
    // Allow small float noise; amounts are whole BDT in practice.
    if (Math.abs(amountPaid - expected) > 0.5) {
      return {
        ok: false,
        status: 409,
        error: `Paid amount ${amountPaid} does not match invoice ${expected}.`,
      }
    }
  }

  const method = String(data?.payment_method || 'gateway')
    .trim()
    .toLowerCase()
    .slice(0, 40)
  const result = await markInvoicePaid({
    invoiceId: billingInvoiceId,
    verifiedBy,
    activatePlan: true,
    paymentMethod: method || 'gateway',
    paymentReference: String(data?.transaction_id || '').trim() || null,
    gatewayPaymentId: String(data?.invoice_id || '').trim() || null,
    paymentNote: data?.sender_number
      ? `Sender ${data.sender_number}`
      : null,
  })
  return { ...result, billingInvoiceId }
}

/**
 * Browser return from Paymently: verify invoice_id then redirect to UI.
 */
export async function handleUddoktaPayReturn({ providerInvoiceId, returnUrl }) {
  const id = String(providerInvoiceId || '').trim()
  if (!id) {
    return {
      ok: false,
      status: 400,
      error: 'Missing invoice_id.',
      redirectUrl: `${publicUiBase()}/billing?payment=error`,
    }
  }

  try {
    const verified = await verifyUddoktaPayPayment(id)
    const meta = metadataObject(verified.data?.metadata)
    const destBase =
      String(returnUrl || meta.return_url || '').trim() ||
      `${publicUiBase()}/billing`

    if (verified.completed) {
      const applied = await applyUddoktaPayPayment(verified.data, {
        verifiedBy: 'uddoktapay-return',
      })
      if (!applied.ok && !applied.alreadyPaid) {
        const url = new URL(destBase, publicUiBase())
        url.searchParams.set('payment', 'error')
        url.searchParams.set(
          'reason',
          applied.error || 'Could not activate subscription.',
        )
        return {
          ok: false,
          status: applied.status || 400,
          error: applied.error,
          redirectUrl: url.toString(),
        }
      }
      const url = new URL(destBase, publicUiBase())
      url.searchParams.set('payment', 'success')
      return { ok: true, redirectUrl: url.toString(), applied }
    }

    if (verified.pending) {
      const url = new URL(destBase, publicUiBase())
      url.searchParams.set('payment', 'pending')
      return { ok: true, pending: true, redirectUrl: url.toString() }
    }

    const url = new URL(destBase, publicUiBase())
    url.searchParams.set('payment', 'failed')
    return {
      ok: false,
      status: 409,
      error: `Payment ${verified.status}`,
      redirectUrl: url.toString(),
    }
  } catch (error) {
    return {
      ok: false,
      status: 502,
      error: error instanceof Error ? error.message : 'Verify failed.',
      redirectUrl: `${publicUiBase()}/billing?payment=error`,
    }
  }
}

/**
 * IPN / webhook from Paymently admin or automatic notify.
 * Authenticates via RT-UDDOKTAPAY-API-KEY header.
 */
export async function handleUddoktaPayWebhook(rawBody, headers = {}) {
  if (!headerMatchesUddoktaPayApiKey(headers)) {
    return { ok: false, status: 401, error: 'Invalid Paymently API key.' }
  }

  const body =
    typeof rawBody === 'string' ? JSON.parse(rawBody || '{}') : rawBody || {}
  const providerInvoiceId = String(body.invoice_id || '').trim()
  const txn = String(body.transaction_id || '').trim()
  const eventId =
    providerInvoiceId && txn
      ? `uddoktapay:${providerInvoiceId}:${txn}`
      : providerInvoiceId
        ? `uddoktapay:${providerInvoiceId}`
        : `uddoktapay:${crypto.randomBytes(8).toString('hex')}`

  const claim = await claimWebhookEvent('uddoktapay', eventId, body)
  if (!claim.ok) return claim
  if (claim.duplicate) {
    return { ok: true, duplicate: true }
  }

  try {
    // Prefer live verify over trusting webhook body alone.
    let paymentData = body
    if (providerInvoiceId) {
      try {
        const verified = await verifyUddoktaPayPayment(providerInvoiceId)
        if (verified.ok && verified.data) paymentData = verified.data
      } catch {
        // Fall back to webhook payload if verify is temporarily unavailable.
      }
    }

    const status = String(paymentData.status || '').trim().toUpperCase()
    if (status === 'COMPLETED') {
      const applied = await applyUddoktaPayPayment(paymentData, {
        verifiedBy: 'uddoktapay-webhook',
      })
      if (!applied.ok && !applied.alreadyPaid) {
        await releaseWebhookClaim(eventId)
        return applied
      }
      await markWebhookProcessed(eventId)
      return { ok: true, eventId, applied }
    }

    if (status === 'ERROR' || status === 'FAILED') {
      const meta = metadataObject(paymentData.metadata)
      if (meta.tenant_id) {
        await setBillingStatus(String(meta.tenant_id), 'past_due')
      }
    }

    await markWebhookProcessed(eventId)
    return { ok: true, eventId, status }
  } catch (error) {
    await releaseWebhookClaim(eventId)
    return {
      ok: false,
      status: 500,
      error: error instanceof Error ? error.message : 'Webhook failed.',
    }
  }
}

/**
 * Generic webhook shape (provider-agnostic):
 * {
 *   eventId, type: 'payment.succeeded' | 'payment.failed' | 'subscription.canceled',
 *   invoiceId?, tenantId?, planId?, subscriptionId?, customerId?
 * }
 */
export async function handleGatewayWebhook(rawBody, headers = {}) {
  // Paymently sends RT-UDDOKTAPAY-API-KEY — route to the dedicated handler.
  if (headerMatchesUddoktaPayApiKey(headers) || headers['rt-uddoktapay-api-key']) {
    return handleUddoktaPayWebhook(rawBody, headers)
  }

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
