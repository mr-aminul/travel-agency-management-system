/**
 * Public case-invoice checkout (Paymently / UddoktaPay, plus local mock).
 * Separate from SaaS subscription billing — these payments land on the case.
 */

import crypto from 'node:crypto'
import { query } from './db.js'
import { getCase, getClient, upsertCase, upsertPayment } from './domain.js'
import { getInvoiceByToken } from './invoices.js'
import {
  createUddoktaPayCharge,
  uddoktapayConfigured,
} from './billing/uddoktapay.js'

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
  return publicUiBase()
}

function asNumber(value) {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : 0
}

function invoiceBalance(invoice) {
  if (!invoice || typeof invoice !== 'object') return 0
  if (Number.isFinite(Number(invoice.balanceDue))) {
    return Math.max(0, Number(invoice.balanceDue))
  }
  return Math.max(0, asNumber(invoice.packageTotal) - asNumber(invoice.paidTotal))
}

export function invoicePayMockEnabled() {
  const flag = String(process.env.INVOICE_PAY_MOCK || '').trim().toLowerCase()
  if (flag === '1' || flag === 'true') return true
  if (flag === '0' || flag === 'false') return false
  return process.env.NODE_ENV !== 'production' && !uddoktapayConfigured()
}

export function displayPaymentMethod(raw) {
  const value = String(raw || '').trim()
  const lower = value.toLowerCase()
  if (lower.includes('bkash')) return 'bKash'
  if (lower.includes('nagad')) return 'Nagad'
  if (lower.includes('rocket')) return 'Rocket'
  if (lower.includes('card') || lower.includes('visa') || lower.includes('master')) {
    return 'Card'
  }
  if (!value || lower === 'gateway' || lower === 'online') return 'Online'
  return value
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

export function applyPaymentToInvoiceSnapshot(invoice, payment) {
  const source = invoice && typeof invoice === 'object' ? invoice : {}
  const existing = Array.isArray(source.payments) ? source.payments : []
  const nextLine = {
    id: payment.id,
    date: String(payment.createdAt || '').slice(0, 10),
    method: payment.method,
    note: payment.note || undefined,
    amount: payment.amount,
  }
  const payments = existing.some((row) => row && row.id === nextLine.id)
    ? existing
    : [...existing, nextLine]
  const paidTotal = payments.reduce((sum, row) => sum + asNumber(row?.amount), 0)
  const packageTotal = asNumber(source.packageTotal)
  const balanceDue = Math.max(0, packageTotal - paidTotal)
  return {
    ...source,
    payments,
    paidTotal,
    balanceDue,
    status: balanceDue <= 0 ? 'paid' : paidTotal > 0 ? 'partial' : 'unpaid',
  }
}

export async function updateInvoiceShareSnapshot(token, invoice) {
  await query(
    `update platform.invoice_shares
     set invoice = $2::jsonb
     where token = $1 and revoked_at is null`,
    [token, JSON.stringify(invoice)],
  )
}

export function publicInvoicePayInfo(row) {
  const invoice = row?.invoice
  const amountBdt = invoiceBalance(invoice)
  const canPay =
    Boolean(row?.case_id) &&
    Boolean(row?.tenant_id) &&
    amountBdt > 0
  return {
    canPay,
    amountBdt,
    currency: 'BDT',
    mock: invoicePayMockEnabled(),
  }
}

async function insertCheckout(row) {
  await query(
    `insert into platform.client_invoice_checkouts
       (id, share_id, token, tenant_id, case_id, amount_bdt, status, metadata)
     values ($1, $2, $3, $4, $5, $6, 'pending', $7::jsonb)`,
    [
      row.id,
      row.shareId,
      row.token,
      row.tenantId,
      row.caseId,
      row.amountBdt,
      JSON.stringify(row.metadata || {}),
    ],
  )
}

async function getCheckout(id) {
  const result = await query(
    `select * from platform.client_invoice_checkouts where id = $1 limit 1`,
    [String(id || '').trim()],
  )
  return result.rows[0] || null
}

async function getCheckoutByGatewayId(gatewayPaymentId) {
  const id = String(gatewayPaymentId || '').trim()
  if (!id) return null
  const result = await query(
    `select * from platform.client_invoice_checkouts
     where gateway_payment_id = $1
     limit 1`,
    [id],
  )
  return result.rows[0] || null
}

async function shareHasCompletedCheckout(shareId, exceptId) {
  const result = await query(
    `select id from platform.client_invoice_checkouts
     where share_id = $1 and status = 'completed' and id <> $2
     limit 1`,
    [shareId, exceptId],
  )
  return Boolean(result.rows[0])
}

export async function createClientInvoiceCheckout(token) {
  const row = await getInvoiceByToken(token)
  if (!row) {
    return { ok: false, status: 404, error: 'Invoice not found or revoked.' }
  }
  const pay = publicInvoicePayInfo(row)
  if (!pay.canPay) {
    return {
      ok: false,
      status: 409,
      error:
        pay.amountBdt <= 0
          ? 'This invoice is already paid.'
          : 'This share link cannot accept online payment. Ask the agency for a new invoice link.',
    }
  }

  const checkoutId = `cin-${crypto.randomBytes(8).toString('hex')}`
  const uiBase = publicUiBase()
  const apiBase = publicApiBase()
  const invoicePath = `${uiBase}/i/${row.token}`
  const mock = invoicePayMockEnabled()

  await insertCheckout({
    id: checkoutId,
    shareId: row.id,
    token: row.token,
    tenantId: row.tenant_id,
    caseId: row.case_id,
    amountBdt: pay.amountBdt,
    metadata: {
      kind: 'client_invoice',
      invoice_number: row.invoice?.invoiceNumber || null,
    },
  })

  if (mock) {
    return {
      ok: true,
      status: 200,
      body: {
        checkoutId,
        mode: 'mock',
        amountBdt: pay.amountBdt,
        currency: 'BDT',
        redirectUrl: null,
      },
    }
  }

  if (!uddoktapayConfigured()) {
    return {
      ok: false,
      status: 503,
      error: 'Online payment is not configured for this platform.',
    }
  }

  const invoice = row.invoice || {}
  try {
    const { paymentUrl } = await createUddoktaPayCharge({
      fullName: invoice.clientName || 'Client',
      email: invoice.clientEmail || 'billing@inventivelab.bd',
      amount: pay.amountBdt,
      metadata: {
        kind: 'client_invoice',
        checkout_id: checkoutId,
        share_token: row.token,
        tenant_id: row.tenant_id,
        case_id: row.case_id,
        return_url: invoicePath,
      },
      redirectUrl: `${apiBase}/api/platform/billing/uddoktapay/return`,
      cancelUrl: `${invoicePath}?payment=canceled`,
      webhookUrl: `${apiBase}/api/platform/webhooks/billing/uddoktapay`,
      returnType: 'GET',
    })

    return {
      ok: true,
      status: 200,
      body: {
        checkoutId,
        mode: 'uddoktapay',
        amountBdt: pay.amountBdt,
        currency: 'BDT',
        redirectUrl: paymentUrl,
      },
    }
  } catch (error) {
    return {
      ok: false,
      status: error?.status && error.status < 500 ? error.status : 502,
      error:
        error instanceof Error
          ? error.message
          : 'Could not start invoice checkout.',
    }
  }
}

async function recordCasePayment({
  checkout,
  amount,
  method,
  txnId,
  gatewayPaymentId,
  note,
}) {
  if (checkout.status === 'completed' && checkout.payment_id) {
    return { ok: true, alreadyPaid: true, paymentId: checkout.payment_id }
  }

  if (await shareHasCompletedCheckout(checkout.share_id, checkout.id)) {
    await query(
      `update platform.client_invoice_checkouts
       set status = 'canceled'
       where id = $1 and status = 'pending'`,
      [checkout.id],
    )
    return { ok: true, alreadyPaid: true }
  }

  const share = await getInvoiceByToken(checkout.token)
  if (!share) {
    return { ok: false, status: 404, error: 'Invoice not found or revoked.' }
  }

  const expected = Number(checkout.amount_bdt)
  if (Number.isFinite(amount) && amount > 0 && Math.abs(amount - expected) > 0.5) {
    return {
      ok: false,
      status: 409,
      error: `Paid amount ${amount} does not match invoice ${expected}.`,
    }
  }

  const caseItem = await getCase(checkout.tenant_id, checkout.case_id)
  if (!caseItem) {
    return { ok: false, status: 404, error: 'Service file not found for this invoice.' }
  }

  const clientId = String(caseItem.clientId || '').trim()
  const client = clientId
    ? await getClient(checkout.tenant_id, clientId)
    : null
  if (!clientId) {
    return { ok: false, status: 409, error: 'Invoice is missing a client.' }
  }

  const paymentId = `pay-${crypto.randomBytes(8).toString('hex')}`
  const createdAt = new Date().toISOString()
  const payment = {
    id: paymentId,
    tenantId: checkout.tenant_id,
    clientId,
    caseId: checkout.case_id,
    amount: expected,
    method: displayPaymentMethod(method),
    note: note || 'Paid online on shared invoice',
    txnId: txnId || undefined,
    createdAt: createdAt.slice(0, 10),
  }

  await upsertPayment(checkout.tenant_id, payment)
  const nextInvoice = applyPaymentToInvoiceSnapshot(share.invoice, payment)
  await updateInvoiceShareSnapshot(checkout.token, nextInvoice)

  await upsertCase(checkout.tenant_id, {
    ...caseItem,
    balance: nextInvoice.balanceDue,
  })

  await query(
    `update platform.client_invoice_checkouts
     set status = 'completed',
         payment_id = $2,
         payment_method = $3,
         gateway_payment_id = coalesce($4, gateway_payment_id),
         completed_at = now()
     where id = $1`,
    [
      checkout.id,
      paymentId,
      payment.method,
      gatewayPaymentId || null,
    ],
  )

  return {
    ok: true,
    alreadyPaid: false,
    paymentId,
    invoice: nextInvoice,
    clientName: client?.name || nextInvoice.clientName,
  }
}

export async function applyClientInvoicePayment(
  data,
  { verifiedBy = 'uddoktapay' } = {},
) {
  const status = String(data?.status || '').trim().toUpperCase()
  if (status && status !== 'COMPLETED') {
    return {
      ok: false,
      status: 409,
      error: `Payment status is ${status || 'unknown'}, not COMPLETED.`,
      paymentStatus: status,
    }
  }

  const meta = metadataObject(data?.metadata)
  const checkoutId = String(meta.checkout_id || '').trim()
  const gatewayPaymentId = String(data?.invoice_id || '').trim()
  let checkout = checkoutId ? await getCheckout(checkoutId) : null
  if (!checkout && gatewayPaymentId) {
    checkout = await getCheckoutByGatewayId(gatewayPaymentId)
  }
  if (!checkout && String(meta.kind || '') !== 'client_invoice') {
    return { ok: false, status: 404, error: 'No matching client invoice checkout.' }
  }
  if (!checkout) {
    return { ok: false, status: 404, error: 'No matching client invoice checkout.' }
  }

  if (gatewayPaymentId && !checkout.gateway_payment_id) {
    await query(
      `update platform.client_invoice_checkouts
       set gateway_payment_id = $2
       where id = $1 and gateway_payment_id is null`,
      [checkout.id, gatewayPaymentId],
    )
  }

  const amountPaid = Number(data?.amount ?? data?.charged_amount)
  const noteParts = [`Paid online (${verifiedBy})`]
  if (data?.sender_number) noteParts.push(`Sender ${data.sender_number}`)

  return recordCasePayment({
    checkout,
    amount: amountPaid,
    method: data?.payment_method,
    txnId: String(data?.transaction_id || '').trim() || gatewayPaymentId,
    gatewayPaymentId,
    note: noteParts.join(' · '),
  })
}

export async function completeMockClientInvoiceCheckout({
  token,
  checkoutId,
  method,
}) {
  if (!invoicePayMockEnabled()) {
    return { ok: false, status: 403, error: 'Mock invoice pay is disabled.' }
  }
  const checkout = await getCheckout(checkoutId)
  if (!checkout || checkout.token !== String(token || '').trim()) {
    return { ok: false, status: 404, error: 'Checkout not found.' }
  }
  if (checkout.status === 'canceled') {
    return { ok: false, status: 409, error: 'This checkout was canceled.' }
  }
  return recordCasePayment({
    checkout,
    amount: Number(checkout.amount_bdt),
    method: method || 'bKash',
    txnId: `mock-${checkout.id}`,
    gatewayPaymentId: `mock-${checkout.id}`,
    note: 'Paid online (demo checkout)',
  })
}
