import { query } from './db.js'
import { normalizePhoneDigits, phoneMatchKeys } from './smsqWebhook.js'

const SMSQ_SEND_URL = 'https://api.smsq.global/api/v2/SendSMS'

function asString(value) {
  if (value == null) return ''
  return String(value).trim()
}

export function readSmsqSendConfig() {
  const apiKey = asString(process.env.SMSQ_API_KEY)
  const clientId = asString(process.env.SMSQ_CLIENT_ID)
  const senderId = asString(process.env.SMSQ_SENDER_ID) || '8809617602051'
  if (!apiKey || !clientId) {
    return {
      ok: false,
      status: 503,
      error: 'SMS send is not configured (SMSQ_API_KEY / SMSQ_CLIENT_ID).',
    }
  }
  return { ok: true, apiKey, clientId, senderId }
}

/** Prefer 8801XXXXXXXXX for BD mobiles (SMSQ non-masking). */
export function formatMobileForSmsq(phone) {
  const digits = normalizePhoneDigits(phone)
  if (!digits) return ''
  if (digits.startsWith('880') && digits.length >= 13) return digits
  if (digits.startsWith('0') && digits.length >= 11) {
    return `880${digits.slice(1)}`
  }
  if (digits.length === 10 && digits.startsWith('1')) {
    return `880${digits}`
  }
  return digits
}

async function getClientPhone(tenantId, clientId) {
  const result = await query(
    `select id, phone, payload from platform.clients
     where tenant_id = $1 and id = $2
     limit 1`,
    [tenantId, clientId],
  )
  const row = result.rows[0]
  if (!row) return null
  const fromColumn = asString(row.phone)
  if (fromColumn) return fromColumn
  const payload = row.payload
  if (payload && typeof payload === 'object') {
    return asString(payload.phone)
  }
  return null
}

export async function sendSmsViaSmsq({ mobile, message }) {
  const config = readSmsqSendConfig()
  if (!config.ok) return config

  const mobileNumber = formatMobileForSmsq(mobile)
  const text = asString(message)
  if (!mobileNumber) {
    return { ok: false, status: 400, error: 'Client phone number is missing.' }
  }
  if (!text) {
    return { ok: false, status: 400, error: 'Message body is required.' }
  }
  if (text.length > 1000) {
    return {
      ok: false,
      status: 400,
      error: 'Keep the SMS under 1000 characters.',
    }
  }

  const payload = {
    ApiKey: config.apiKey,
    ClientId: config.clientId,
    SenderId: config.senderId,
    MobileNumbers: mobileNumber,
    Message: text,
    Is_Unicode: true,
    Is_Flash: false,
  }

  let response
  try {
    response = await fetch(SMSQ_SEND_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
  } catch (error) {
    return {
      ok: false,
      status: 502,
      error:
        error instanceof Error
          ? `SMSQ request failed: ${error.message}`
          : 'SMSQ request failed.',
    }
  }

  const rawText = await response.text()
  let parsed = null
  if (rawText) {
    try {
      parsed = JSON.parse(rawText)
    } catch {
      parsed = rawText
    }
  }

  if (!response.ok) {
    return {
      ok: false,
      status: 502,
      error: `SMSQ HTTP ${response.status}`,
      provider: parsed,
    }
  }

  const errorCode =
    parsed && typeof parsed === 'object' ? Number(parsed.ErrorCode) : NaN
  if (Number.isFinite(errorCode) && errorCode !== 0) {
    const description =
      parsed && typeof parsed === 'object'
        ? asString(parsed.ErrorDescription) || 'SMSQ rejected the send.'
        : 'SMSQ rejected the send.'
    return {
      ok: false,
      status: 502,
      error: description,
      provider: parsed,
    }
  }

  let messageId = null
  const data =
    parsed && typeof parsed === 'object' && Array.isArray(parsed.Data)
      ? parsed.Data[0]
      : null
  if (data && typeof data === 'object') {
    messageId = asString(data.MessageId) || null
  }

  return {
    ok: true,
    status: 200,
    body: {
      ok: true,
      mobile: mobileNumber,
      messageId,
      senderId: config.senderId,
    },
  }
}

export async function sendSmsToClient({ tenantId, clientId, message }) {
  const phone = await getClientPhone(tenantId, clientId)
  if (!phone) {
    return {
      ok: false,
      status: 404,
      error: 'Client not found or has no phone number.',
    }
  }

  // Keep lookup resilient if domain phone formatting differs slightly.
  const keys = phoneMatchKeys(phone)
  if (keys.length === 0) {
    return { ok: false, status: 400, error: 'Client phone number is invalid.' }
  }

  return sendSmsViaSmsq({ mobile: phone, message })
}
