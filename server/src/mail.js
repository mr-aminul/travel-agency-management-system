import nodemailer from 'nodemailer'

function envFlag(name, fallback = false) {
  const raw = process.env[name]
  if (raw == null || raw === '') return fallback
  return ['1', 'true', 'yes', 'on'].includes(String(raw).toLowerCase())
}

function smtpConfig() {
  const host = String(process.env.SMTP_HOST || '').trim()
  const user = String(process.env.SMTP_USER || '').trim()
  const pass = String(process.env.SMTP_PASSWORD || '')
  const port = Number(process.env.SMTP_PORT || 465)
  if (!host || !user || !pass) return null
  return {
    host,
    port: Number.isFinite(port) ? port : 465,
    secure: envFlag('SMTP_SECURE', Number(port) === 465),
    auth: { user, pass },
  }
}

export function isMailConfigured() {
  return smtpConfig() != null
}

export function mailFromAddress() {
  return (
    String(process.env.SMTP_FROM || '').trim() ||
    String(process.env.SMTP_USER || '').trim() ||
    'noreply@inventivelab.bd'
  )
}

export function publicUiBaseUrl() {
  return String(
    process.env.PLATFORM_PUBLIC_UI_URL ||
      process.env.PUBLIC_UI_URL ||
      'https://onetrack.inventivelab.bd',
  ).replace(/\/$/, '')
}

/**
 * @param {{ to: string, subject: string, text: string, html?: string }} message
 */
export async function sendMail(message) {
  const config = smtpConfig()
  if (!config) {
    const err = new Error(
      'Email delivery is not configured (SMTP_HOST / SMTP_USER / SMTP_PASSWORD).',
    )
    err.code = 'SMTP_NOT_CONFIGURED'
    throw err
  }

  const transporter = nodemailer.createTransport(config)
  await transporter.sendMail({
    from: mailFromAddress(),
    to: message.to,
    subject: message.subject,
    text: message.text,
    html: message.html,
  })
}

/**
 * @param {{ to: string, resetUrl: string, otp: string, expiresMinutes: number }} input
 */
export async function sendPasswordResetEmail(input) {
  const subject = 'Reset your OneTrack password'
  const text = [
    'You requested a password reset for your OneTrack account.',
    '',
    `Reset link: ${input.resetUrl}`,
    `One-time code: ${input.otp}`,
    '',
    `This link and code expire in ${input.expiresMinutes} minutes.`,
    'If you did not request this, ignore this email — your password stays the same.',
  ].join('\n')

  const html = `
    <p>You requested a password reset for your OneTrack account.</p>
    <p><a href="${input.resetUrl}">Choose a new password</a></p>
    <p>Your one-time code: <strong style="font-size:1.25rem;letter-spacing:0.12em">${input.otp}</strong></p>
    <p>This link and code expire in ${input.expiresMinutes} minutes.</p>
    <p>If you did not request this, ignore this email — your password stays the same.</p>
  `

  await sendMail({ to: input.to, subject, text, html })
}
