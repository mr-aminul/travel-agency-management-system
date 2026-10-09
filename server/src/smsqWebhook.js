import { randomUUID } from 'node:crypto'
import { query } from './db.js'

function asString(value) {
  if (value == null) return ''
  if (Array.isArray(value)) return asString(value[0])
  return String(value).trim()
}

function pickParam(source, ...names) {
  if (!source || typeof source !== 'object') return ''
  for (const name of names) {
    const direct = asString(source[name])
    if (direct) return direct
    const lower = name.toLowerCase()
    for (const [key, value] of Object.entries(source)) {
      if (String(key).toLowerCase() === lower) {
        const text = asString(value)
        if (text) return text
      }
    }
  }
  return ''
}

export function normalizePhoneDigits(phone) {
  return asString(phone).replace(/\D/g, '')
}

/** SMSQ "Test" sends literal ##What## / ##Who## tokens instead of real values. */
export function isSmsqTemplateToken(value) {
  const text = asString(value)
  return /^##[A-Za-z][A-Za-z0-9_]*##$/.test(text)
}

export function isSmsqConsoleTest(parsed) {
  if (!parsed || typeof parsed !== 'object') return false
  const fields = [parsed.what, parsed.who, parsed.sender, parsed.fromPhone]
  return fields.some((value) => isSmsqTemplateToken(value))
}

/** BD-friendly variants so 017… matches 88017… and vice versa. */
export function phoneMatchKeys(phone) {
  const digits = normalizePhoneDigits(phone)
  if (!digits) return []
  const keys = new Set([digits])
  if (digits.startsWith('880') && digits.length >= 12) {
    keys.add(`0${digits.slice(3)}`)
    keys.add(digits.slice(3))
  }
  if (digits.startsWith('0') && digits.length >= 11) {
    keys.add(`880${digits.slice(1)}`)
    keys.add(digits.slice(1))
  }
  if (digits.length >= 10) {
    keys.add(digits.slice(-10))
  }
  return [...keys]
}

function phonesOverlap(a, b) {
  const left = new Set(phoneMatchKeys(a))
  if (left.size === 0) return false
  return phoneMatchKeys(b).some((key) => left.has(key))
}

export function parseSmsqPayload(req) {
  const queryParams = req.query ?? {}
  const body = req.body && typeof req.body === 'object' ? req.body : {}
  const merged = { ...queryParams, ...body }

  const what = pickParam(merged, 'What', 'what', 'Message', 'message', 'text')
  const who = pickParam(merged, 'Who', 'who')
  const sender = pickParam(merged, 'Sender', 'sender', 'from', 'From', 'msisdn')
  const circle = pickParam(merged, 'Circle', 'circle')
  const operator = pickParam(merged, 'Operator', 'operator')
  const fromPhone = sender || who
  const bodyText = what

  return {
    what,
    who,
    sender,
    circle,
    operator,
    fromPhone,
    body: bodyText,
    raw: merged,
  }
}

export function readWebhookToken(req) {
  const header = asString(req.get?.('x-smsq-token') || req.get?.('x-webhook-token'))
  if (header) return header
  const queryToken = pickParam(req.query ?? {}, 'token', 'secret')
  if (queryToken) return queryToken
  return pickParam(req.body ?? {}, 'token', 'secret')
}

export function assertWebhookAuthorized(req) {
  const expected = asString(process.env.SMSQ_WEBHOOK_SECRET)
  if (!expected) {
    return {
      ok: false,
      status: 503,
      error: 'SMSQ webhook is not configured (SMSQ_WEBHOOK_SECRET).',
    }
  }
  const provided = readWebhookToken(req)
  if (!provided || provided !== expected) {
    return { ok: false, status: 401, error: 'Invalid webhook token.' }
  }
  return { ok: true }
}

export function resolveWebhookTenantId(req) {
  const fromQuery = pickParam(req.query ?? {}, 'tenant', 'tenantId')
  if (fromQuery) return fromQuery
  const fromEnv = asString(process.env.SMSQ_DEFAULT_TENANT_ID)
  return fromEnv || 'tenant-full'
}

async function findClientIdByPhone(tenantId, phone) {
  const keys = phoneMatchKeys(phone)
  if (keys.length === 0) return null

  const result = await query(
    `select id, phone from platform.clients
     where tenant_id = $1
       and archived_at is null
       and phone is not null
       and phone <> ''`,
    [tenantId],
  )

  for (const row of result.rows) {
    if (phonesOverlap(phone, row.phone)) {
      return row.id
    }
  }
  return null
}

export async function recordInboundSms({
  tenantId,
  fromPhone,
  body,
  what,
  who,
  sender,
  circle,
  operator,
  raw,
}) {
  const digits = normalizePhoneDigits(fromPhone)
  if (!digits) {
    return { ok: false, status: 400, error: 'Missing sender phone (Who/Sender).' }
  }

  const clientId = await findClientIdByPhone(tenantId, digits)
  const id = `sms-in-${randomUUID()}`
  const createdAt = new Date().toISOString()

  await query(
    `insert into platform.sms_inbound
       (id, tenant_id, client_id, from_phone, body, what, who, sender, circle, operator, raw, created_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12::timestamptz)`,
    [
      id,
      tenantId,
      clientId,
      digits,
      asString(body),
      asString(what) || null,
      asString(who) || null,
      asString(sender) || null,
      asString(circle) || null,
      asString(operator) || null,
      JSON.stringify(raw ?? {}),
      createdAt,
    ],
  )

  return {
    ok: true,
    status: 200,
    body: {
      ok: true,
      id,
      tenantId,
      clientId,
      fromPhone: digits,
      createdAt,
    },
  }
}

export async function handleSmsqWebhook(req) {
  const auth = assertWebhookAuthorized(req)
  if (!auth.ok) return auth

  const parsed = parseSmsqPayload(req)

  // Console Test posts unsubstituted ##Who## tokens — acknowledge without storing.
  if (isSmsqConsoleTest(parsed)) {
    return {
      ok: true,
      status: 200,
      body: { ok: true, test: true },
    }
  }

  if (!parsed.fromPhone || !normalizePhoneDigits(parsed.fromPhone)) {
    return {
      ok: false,
      status: 400,
      error: 'Missing sender phone (Who/Sender).',
    }
  }

  const tenantId = resolveWebhookTenantId(req)
  return recordInboundSms({
    tenantId,
    fromPhone: parsed.fromPhone,
    body: parsed.body,
    what: parsed.what,
    who: parsed.who,
    sender: parsed.sender,
    circle: parsed.circle,
    operator: parsed.operator,
    raw: parsed.raw,
  })
}

export async function listInboundSms({ tenantId, clientId, limit = 50 }) {
  const capped = Math.min(Math.max(Number(limit) || 50, 1), 200)
  if (clientId) {
    const result = await query(
      `select id, tenant_id, client_id, from_phone, body, circle, operator, created_at
       from platform.sms_inbound
       where tenant_id = $1 and client_id = $2
       order by created_at desc
       limit $3`,
      [tenantId, clientId, capped],
    )
    return result.rows
  }

  const result = await query(
    `select id, tenant_id, client_id, from_phone, body, circle, operator, created_at
     from platform.sms_inbound
     where tenant_id = $1
     order by created_at desc
     limit $2`,
    [tenantId, capped],
  )
  return result.rows
}

export function mapInboundRow(row) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    clientId: row.client_id,
    fromPhone: row.from_phone,
    body: row.body ?? '',
    circle: row.circle,
    operator: row.operator,
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at),
  }
}
