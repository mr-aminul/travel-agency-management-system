/**
 * Transactional email HTML — layout mirrored from OneSign auth templates
 * (480px card, brand header, CTA, fallback link, footer).
 */

const BRAND = {
  name: 'OneTrack',
  subtitle: 'Travel Management',
  accent: '#0c2d79',
  logoPath: '/images/logo-email.png',
  logoFallbackPath: '/images/logo.svg',
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function logoUrl(baseUrl) {
  const root = String(baseUrl || '').replace(/\/$/, '')
  return `${root}${BRAND.logoPath}`
}

/**
 * @param {{
 *   baseUrl: string
 *   title: string
 *   bodyHtml: string
 *   ctaLabel: string
 *   ctaUrl: string
 *   afterCtaHtml?: string
 * }} input
 */
export function renderBrandedEmail(input) {
  const logo = escapeHtml(logoUrl(input.baseUrl))
  const title = escapeHtml(input.title)
  const ctaLabel = escapeHtml(input.ctaLabel)
  const ctaUrl = escapeHtml(input.ctaUrl)
  const accent = BRAND.accent
  const year = new Date().getUTCFullYear()

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${title}</title>
  </head>
  <body style="margin: 0; padding: 0; background: #f3f4f6">
    <table
      role="presentation"
      width="100%"
      cellpadding="0"
      cellspacing="0"
      style="background: #f3f4f6; padding: 32px 12px"
    >
      <tr>
        <td align="center">
          <table
            role="presentation"
            width="100%"
            cellpadding="0"
            cellspacing="0"
            style="
              max-width: 480px;
              background: #ffffff;
              border: 1px solid #e5e7eb;
              border-radius: 12px;
              overflow: hidden;
              font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            "
          >
            <tr>
              <td style="padding: 28px 32px 8px">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="vertical-align: middle">
                      <img
                        src="${logo}"
                        width="48"
                        height="48"
                        alt="${escapeHtml(BRAND.name)}"
                        style="display: block; border: 0; border-radius: 10px"
                      />
                    </td>
                    <td style="vertical-align: middle; padding-left: 12px">
                      <div style="font-size: 20px; font-weight: 700; color: #111827; line-height: 1">
                        ${escapeHtml(BRAND.name)}
                      </div>
                      <div
                        style="
                          font-size: 11px;
                          font-weight: 600;
                          letter-spacing: 1.5px;
                          color: #6b7280;
                          text-transform: uppercase;
                          margin-top: 3px;
                        "
                      >
                        ${escapeHtml(BRAND.subtitle)}
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding: 16px 32px 0">
                <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #111827">
                  ${title}
                </h1>
              </td>
            </tr>
            <tr>
              <td style="padding: 12px 32px 0">
                ${input.bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding: 24px 32px 4px">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="border-radius: 8px; background: ${accent}">
                      <a
                        href="${ctaUrl}"
                        style="
                          display: inline-block;
                          padding: 12px 28px;
                          font-size: 15px;
                          font-weight: 600;
                          color: #ffffff;
                          text-decoration: none;
                          border-radius: 8px;
                        "
                        >${ctaLabel}</a
                      >
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            ${input.afterCtaHtml || ''}
            <tr>
              <td style="padding: 20px 32px 0">
                <p style="margin: 0; font-size: 12px; line-height: 1.6; color: #9ca3af">
                  If the button doesn't work, copy and paste this link into your browser:
                </p>
                <p style="margin: 6px 0 0; font-size: 12px; line-height: 1.5; word-break: break-all">
                  <a href="${ctaUrl}" style="color: ${accent}">${ctaUrl}</a>
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding: 24px 32px 28px">
                <p
                  style="
                    margin: 0;
                    font-size: 12px;
                    line-height: 1.6;
                    color: #9ca3af;
                    border-top: 1px solid #f3f4f6;
                    padding-top: 16px;
                  "
                >
                  If you weren't expecting this email, you can safely ignore it — your account stays
                  unchanged.
                </p>
              </td>
            </tr>
          </table>
          <div
            style="
              max-width: 480px;
              font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              font-size: 11px;
              color: #9ca3af;
              padding: 16px 8px 0;
              text-align: left;
            "
          >
            &copy; ${year} ${escapeHtml(BRAND.name)} &middot; This is an automated message, please do not reply.
          </div>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

/**
 * @param {{
 *   baseUrl: string
 *   resetUrl: string
 *   expiresMinutes: number
 * }} input
 */
export function renderPasswordResetEmailHtml(input) {
  const minutes = Number(input.expiresMinutes) || 15

  const bodyHtml = `
    <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #4b5563">
      Click the button below to choose a new password for your ${escapeHtml(BRAND.name)} account.
      For your security, this link expires in ${minutes} minutes.
    </p>
  `

  return renderBrandedEmail({
    baseUrl: input.baseUrl,
    title: 'Reset your password',
    bodyHtml,
    ctaLabel: 'Choose new password',
    ctaUrl: input.resetUrl,
  })
}
