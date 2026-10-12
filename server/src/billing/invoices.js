import crypto from 'node:crypto'
import { query } from '../db.js'
import { getPlanTemplate, periodEndFromNow } from './plans.js'
import { applyPlanToTenant } from './tenantBilling.js'

function mapInvoice(row) {
  if (!row) return null
  return {
    id: row.id,
    tenantId: row.tenant_id,
    planId: row.plan_id,
    status: row.status,
    amountBdt: Number(row.amount_bdt ?? 0),
    currency: row.currency || 'BDT',
    description: row.description || '',
    periodStart: row.period_start
      ? new Date(row.period_start).toISOString()
      : null,
    periodEnd: row.period_end
      ? new Date(row.period_end).toISOString()
      : null,
    paymentMethod: row.payment_method || null,
    paymentReference: row.payment_reference || null,
    paymentNote: row.payment_note || null,
    gatewayPaymentId: row.gateway_payment_id || null,
    paidAt: row.paid_at ? new Date(row.paid_at).toISOString() : null,
    verifiedBy: row.verified_by || null,
    createdAt: row.created_at
      ? new Date(row.created_at).toISOString()
      : null,
    updatedAt: row.updated_at
      ? new Date(row.updated_at).toISOString()
      : null,
  }
}

export async function listInvoicesForTenant(tenantId, { limit = 50 } = {}) {
  const result = await query(
    `select * from platform.billing_invoices
     where tenant_id = $1
     order by created_at desc
     limit $2`,
    [tenantId, Math.min(200, Math.max(1, Number(limit) || 50))],
  )
  return result.rows.map(mapInvoice)
}

export async function getInvoice(invoiceId) {
  const result = await query(
    `select * from platform.billing_invoices where id = $1 limit 1`,
    [invoiceId],
  )
  return mapInvoice(result.rows[0])
}

export async function createPlanInvoice({
  tenantId,
  planId,
  description,
  amountBdt,
}) {
  const plan = await getPlanTemplate(planId)
  if (!plan) {
    return { ok: false, status: 404, error: 'Plan not found.' }
  }
  let amount = plan.priceBdt
  if (amountBdt != null && amountBdt !== '') {
    const n = Number(amountBdt)
    if (!Number.isFinite(n) || n < 0) {
      return { ok: false, status: 400, error: 'Amount must be 0 or more.' }
    }
    amount = Math.round(n)
  }
  const id = `binv-${crypto.randomBytes(10).toString('hex')}`
  const periodStart = new Date()
  const periodEnd = periodEndFromNow(plan.interval)
  const desc =
    description ||
    `${plan.name} · ${plan.interval === 'year' ? 'annual' : 'monthly'}`

  // Void other open invoices for this tenant so only one checkout is live.
  await query(
    `update platform.billing_invoices
     set status = 'void', updated_at = now()
     where tenant_id = $1 and status in ('open', 'pending_review')`,
    [tenantId],
  )

  await query(
    `insert into platform.billing_invoices (
       id, tenant_id, plan_id, status, amount_bdt, currency, description,
       period_start, period_end, created_at, updated_at
     ) values ($1, $2, $3, 'open', $4, $5, $6, $7, $8, now(), now())`,
    [
      id,
      tenantId,
      plan.id,
      amount,
      plan.currency,
      desc,
      periodStart.toISOString(),
      periodEnd.toISOString(),
    ],
  )
  return { ok: true, invoice: await getInvoice(id), plan }
}

export async function submitInvoicePayment({
  invoiceId,
  tenantId,
  paymentMethod,
  paymentReference,
  paymentNote,
}) {
  const invoice = await getInvoice(invoiceId)
  if (!invoice || invoice.tenantId !== tenantId) {
    return { ok: false, status: 404, error: 'Invoice not found.' }
  }
  if (invoice.status !== 'open' && invoice.status !== 'pending_review') {
    return {
      ok: false,
      status: 409,
      error: 'This invoice can no longer accept payment.',
    }
  }
  const method = String(paymentMethod ?? '').trim()
  const allowed = new Set(['bkash', 'nagad', 'bank', 'gateway', 'cash', 'other'])
  if (!allowed.has(method)) {
    return { ok: false, status: 400, error: 'Choose a payment method.' }
  }
  const reference = String(paymentReference ?? '').trim()
  if (!reference) {
    return {
      ok: false,
      status: 400,
      error: 'Enter the transaction ID or reference.',
    }
  }

  await query(
    `update platform.billing_invoices
     set status = 'pending_review',
         payment_method = $2,
         payment_reference = $3,
         payment_note = $4,
         updated_at = now()
     where id = $1`,
    [
      invoiceId,
      method,
      reference.slice(0, 120),
      String(paymentNote ?? '').trim().slice(0, 500) || null,
    ],
  )
  return { ok: true, invoice: await getInvoice(invoiceId) }
}

export async function markInvoicePaid({
  invoiceId,
  verifiedBy,
  activatePlan = true,
}) {
  const invoice = await getInvoice(invoiceId)
  if (!invoice) {
    return { ok: false, status: 404, error: 'Invoice not found.' }
  }
  if (invoice.status === 'paid') {
    return { ok: true, invoice, alreadyPaid: true }
  }
  if (invoice.status === 'void') {
    return { ok: false, status: 409, error: 'Invoice is void.' }
  }

  await query(
    `update platform.billing_invoices
     set status = 'paid',
         paid_at = now(),
         verified_by = $2,
         updated_at = now()
     where id = $1`,
    [invoiceId, verifiedBy || null],
  )

  let billing = null
  if (activatePlan && invoice.planId) {
    const applied = await applyPlanToTenant({
      tenantId: invoice.tenantId,
      planId: invoice.planId,
      billingStatus: 'active',
      planKind: 'standard',
      trialEndsAt: null,
      currentPeriodEnd: invoice.periodEnd,
    })
    billing = applied.billing
  }

  return {
    ok: true,
    invoice: await getInvoice(invoiceId),
    billing,
  }
}

export async function voidInvoice(invoiceId) {
  await query(
    `update platform.billing_invoices
     set status = 'void', updated_at = now()
     where id = $1 and status in ('open', 'pending_review')`,
    [invoiceId],
  )
  return getInvoice(invoiceId)
}

export async function listPendingInvoices({ limit = 100 } = {}) {
  const result = await query(
    `select * from platform.billing_invoices
     where status = 'pending_review'
     order by updated_at asc
     limit $1`,
    [Math.min(200, Math.max(1, Number(limit) || 100))],
  )
  return result.rows.map(mapInvoice)
}
