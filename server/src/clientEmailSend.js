import { query } from './db.js'
import { isMailConfigured, sendMail } from './mail.js'

function asString(value) {
  if (value == null) return ''
  return String(value).trim()
}

function looksLikeEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

async function getClientEmail(tenantId, clientId) {
  const result = await query(
    `select id, payload from platform.clients
     where tenant_id = $1 and id = $2
     limit 1`,
    [tenantId, clientId],
  )
  const row = result.rows[0]
  if (!row) return null
  const payload = row.payload
  if (payload && typeof payload === 'object') {
    return asString(payload.email)
  }
  return null
}

function attachmentFromDataUrl(attachment) {
  if (!attachment || typeof attachment !== 'object') return null
  const name = asString(attachment.name) || 'attachment'
  const dataUrl = asString(attachment.dataUrl)
  const mimeType = asString(attachment.mimeType) || 'application/octet-stream'
  const match = /^data:([^;]+);base64,(.+)$/i.exec(dataUrl)
  if (!match) return null
  return {
    filename: name,
    contentType: mimeType || match[1],
    content: Buffer.from(match[2], 'base64'),
  }
}

/**
 * Send an email to a client via SMTP (same stack as password-reset mail).
 * @returns {{ ok: true, status: number, body: object } | { ok: false, status: number, error: string }}
 */
export async function sendEmailToClient({
  tenantId,
  clientId,
  subject,
  text,
  html,
  attachment,
}) {
  if (!isMailConfigured()) {
    return {
      ok: false,
      status: 503,
      error:
        'Email delivery is not configured (SMTP_HOST / SMTP_USER / SMTP_PASSWORD).',
    }
  }

  const to = await getClientEmail(tenantId, clientId)
  if (!to) {
    return {
      ok: false,
      status: 404,
      error: 'Client not found or has no email address.',
    }
  }
  if (!looksLikeEmail(to)) {
    return {
      ok: false,
      status: 400,
      error: 'Client email address is invalid.',
    }
  }

  const plain = asString(text)
  const rich = asString(html)
  const mailSubject = asString(subject) || 'Message from your agency'
  if (!plain && !rich) {
    return { ok: false, status: 400, error: 'Email body is required.' }
  }
  if (plain.length > 2000) {
    return {
      ok: false,
      status: 400,
      error: 'Keep the email text under 2000 characters.',
    }
  }
  if (rich.length > 60000) {
    return {
      ok: false,
      status: 400,
      error: 'Email HTML is too large to send.',
    }
  }

  const file = attachmentFromDataUrl(attachment)
  try {
    await sendMail({
      to,
      subject: mailSubject,
      text: plain || 'Please view this message in an HTML-capable email client.',
      html: rich || undefined,
      attachments: file ? [file] : undefined,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Could not send email.'
    const status = error?.code === 'SMTP_NOT_CONFIGURED' ? 503 : 502
    return { ok: false, status, error: message }
  }

  return {
    ok: true,
    status: 200,
    body: {
      ok: true,
      to,
      subject: mailSubject,
    },
  }
}
