/**
 * UddoktaPay / Paymently HTTP client.
 * Docs: https://uddoktapay.readme.io/reference/overview
 *
 * Base URL example: https://onetrack.paymently.io/api
 * Auth header: RT-UDDOKTAPAY-API-KEY
 */

function trimEnv(name) {
  return String(process.env[name] || '').trim()
}

export function uddoktapayConfigured() {
  return Boolean(uddoktapayApiKey() && uddoktapayApiBase())
}

export function uddoktapayApiKey() {
  return (
    trimEnv('UDDOKTAPAY_API_KEY') ||
    trimEnv('PAYMENTLY_API_KEY') ||
    trimEnv('BILLING_UDDOKTAPAY_API_KEY')
  )
}

/** Normalized base ending with /api (no trailing slash after api). */
export function uddoktapayApiBase() {
  const raw =
    trimEnv('UDDOKTAPAY_API_URL') ||
    trimEnv('PAYMENTLY_API_URL') ||
    trimEnv('BILLING_UDDOKTAPAY_API_URL') ||
    'https://onetrack.paymently.io/api'
  const cleaned = raw.replace(/\/+$/, '')
  if (cleaned.endsWith('/api')) return cleaned
  return `${cleaned}/api`
}

function apiHeaders() {
  const key = uddoktapayApiKey()
  if (!key) {
    throw new Error('UDDOKTAPAY_API_KEY is not configured.')
  }
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'RT-UDDOKTAPAY-API-KEY': key,
  }
}

async function postJson(path, body) {
  const url = `${uddoktapayApiBase()}${path.startsWith('/') ? path : `/${path}`}`
  const response = await fetch(url, {
    method: 'POST',
    headers: apiHeaders(),
    body: JSON.stringify(body),
  })
  const text = await response.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = { raw: text }
  }
  if (!response.ok) {
    const message =
      (data && (data.message || data.error)) ||
      `UddoktaPay request failed (${response.status}).`
    const error = new Error(String(message))
    error.status = response.status
    error.data = data
    throw error
  }
  return data
}

/**
 * Create a hosted checkout session.
 * @returns {{ paymentUrl: string, raw: object }}
 */
export async function createUddoktaPayCharge({
  fullName,
  email,
  amount,
  metadata,
  redirectUrl,
  cancelUrl,
  webhookUrl,
  returnType = 'GET',
}) {
  const payload = {
    full_name: String(fullName || '').trim() || 'Subscriber',
    email: String(email || '').trim() || 'billing@inventivelab.bd',
    amount: String(amount),
    metadata: metadata && typeof metadata === 'object' ? metadata : {},
    redirect_url: redirectUrl,
    return_type: returnType === 'POST' ? 'POST' : 'GET',
    cancel_url: cancelUrl,
  }
  if (webhookUrl) payload.webhook_url = webhookUrl

  const data = await postJson('/checkout-v2', payload)
  const paymentUrl =
    data?.payment_url ||
    data?.paymentUrl ||
    data?.url ||
    data?.checkout_url ||
    null
  if (!paymentUrl) {
    const error = new Error(
      'UddoktaPay did not return a payment_url. Check API key and base URL.',
    )
    error.data = data
    throw error
  }
  return { paymentUrl: String(paymentUrl), raw: data }
}

/** Verify a provider invoice_id from redirect or webhook. */
export async function verifyUddoktaPayPayment(providerInvoiceId) {
  const id = String(providerInvoiceId || '').trim()
  if (!id) {
    return { ok: false, status: 400, error: 'Missing invoice_id.' }
  }
  const data = await postJson('/verify-payment', { invoice_id: id })
  const status = String(data?.status || '').trim().toUpperCase()
  return {
    ok: true,
    status,
    completed: status === 'COMPLETED',
    pending: status === 'PENDING',
    data,
  }
}

export function headerMatchesUddoktaPayApiKey(headers = {}) {
  const expected = uddoktapayApiKey()
  if (!expected) return false
  const incoming = String(
    headers['rt-uddoktapay-api-key'] ||
      headers['RT-UDDOKTAPAY-API-KEY'] ||
      '',
  ).trim()
  return Boolean(incoming) && incoming === expected
}
