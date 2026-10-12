import type { AgencyProfile } from '@/lib/agencyProfile'

const BRAND_MARKER = 'data-pd-branded-email="1"'

export type BrandedEmailInput = {
  body: string
  agency: Pick<
    AgencyProfile,
    'businessName' | 'address' | 'mobile' | 'website' | 'profilePicture'
  >
  recipientName?: string
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function normalizeWebsite(url: string): string {
  const trimmed = url.trim()
  if (!trimmed) return ''
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

const URL_LINE =
  /^(https?:\/\/[^\s]+)$/i

/** Pull a primary CTA URL (prefer passport tracking links). */
export function extractEmailCtaUrl(body: string): string | undefined {
  const lines = body.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  for (const line of lines) {
    if (URL_LINE.test(line) && /track\?passport=/i.test(line)) {
      return line
    }
  }
  for (const line of lines) {
    if (URL_LINE.test(line)) return line
  }
  const inline = body.match(/https?:\/\/[^\s]+/i)
  return inline?.[0]
}

function bodyToHtmlParagraphs(body: string, ctaUrl?: string): string {
  const blocks = body
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)

  return blocks
    .map((block) => {
      const lines = block.split('\n').map((line) => line.trim())
      const onlyUrl = lines.length === 1 && URL_LINE.test(lines[0]!)
      if (onlyUrl && ctaUrl && lines[0] === ctaUrl) {
        return ''
      }
      const html = lines
        .map((line) => {
          if (ctaUrl && line === ctaUrl) return ''
          return escapeHtml(line)
        })
        .filter(Boolean)
        .join('<br />')
      if (!html) return ''
      return `<p style="margin:0 0 16px;font-size:16px;line-height:1.65;color:#1f2937;">${html}</p>`
    })
    .filter(Boolean)
    .join('')
}

/**
 * Professional, inbox-safe HTML email shell (table layout) branded with the agency.
 */
export function buildBrandedEmailHtml(input: BrandedEmailInput): string {
  const agencyName =
    input.agency.businessName.trim() || 'Your agency'
  const address = input.agency.address.trim()
  const mobile = input.agency.mobile.trim()
  const website = normalizeWebsite(input.agency.website)
  const logo = input.agency.profilePicture?.trim() || ''
  const ctaUrl = extractEmailCtaUrl(input.body)
  const paragraphs = bodyToHtmlParagraphs(input.body, ctaUrl)
  const greetingName = input.recipientName?.trim()

  const logoBlock = logo
    ? `<img src="${escapeHtml(logo)}" alt="${escapeHtml(agencyName)}" width="40" height="40" style="display:block;border-radius:10px;object-fit:cover;" />`
    : `<div style="width:40px;height:40px;border-radius:10px;background:rgba(255,255,255,0.18);color:#fff;font:700 16px/40px Inter,Segoe UI,Arial,sans-serif;text-align:center;">${escapeHtml(agencyName.slice(0, 1).toUpperCase())}</div>`

  const ctaBlock = ctaUrl
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;">
        <tr>
          <td style="border-radius:10px;background:#0b3b6e;">
            <a href="${escapeHtml(ctaUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 22px;font:600 15px/1.2 Inter,Segoe UI,Arial,sans-serif;color:#ffffff;text-decoration:none;">
              Track your application
            </a>
          </td>
        </tr>
      </table>`
    : ''

  const footerBits = [address, mobile, website ? escapeHtml(website.replace(/^https?:\/\//i, '')) : '']
    .filter(Boolean)
    .join(' · ')

  return `<!DOCTYPE html>
<html lang="en" ${BRAND_MARKER}>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(agencyName)}</title>
</head>
<body style="margin:0;padding:0;background:#eef2f6;">
  <table ${BRAND_MARKER} role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f6;padding:28px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 12px 40px rgba(15,23,42,0.08);">
          <tr>
            <td style="padding:22px 28px;background:linear-gradient(135deg,#0b3b6e 0%,#125a8f 100%);">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="48" valign="middle">${logoBlock}</td>
                  <td valign="middle" style="padding-left:12px;">
                    <div style="font:700 18px/1.25 Inter,Segoe UI,Arial,sans-serif;color:#ffffff;">${escapeHtml(agencyName)}</div>
                    <div style="margin-top:4px;font:500 12px/1.35 Inter,Segoe UI,Arial,sans-serif;color:rgba(255,255,255,0.78);letter-spacing:0.04em;text-transform:uppercase;">Client update</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="height:4px;background:linear-gradient(90deg,#38bdf8,#0ea5e9 40%,#0369a1);"></td>
          </tr>
          <tr>
            <td style="padding:32px 28px 12px;font:400 16px/1.65 Inter,Segoe UI,Arial,sans-serif;color:#1f2937;">
              ${
                greetingName
                  ? `<p style="margin:0 0 18px;font-size:15px;color:#64748b;">To ${escapeHtml(greetingName)}</p>`
                  : ''
              }
              ${paragraphs || `<p style="margin:0 0 16px;font-size:16px;line-height:1.65;color:#1f2937;">${escapeHtml(input.body.trim())}</p>`}
              ${ctaBlock}
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e2e8f0;">
                <tr>
                  <td style="padding-top:18px;font:400 12px/1.5 Inter,Segoe UI,Arial,sans-serif;color:#94a3b8;">
                    ${footerBits ? `<div>${footerBits}</div>` : ''}
                    <div style="margin-top:6px;">Sent by ${escapeHtml(agencyName)}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function isBrandedEmailHtml(body: string): boolean {
  return body.includes(BRAND_MARKER)
}
