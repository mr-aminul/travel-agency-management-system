import { describe, expect, it } from 'vitest'
import {
  buildBrandedEmailHtml,
  extractEmailCtaUrl,
  isBrandedEmailHtml,
} from '@/lib/brandedEmailHtml'

const agency = {
  businessName: 'OneTrack',
  address: 'Gulshan, Dhaka',
  mobile: '01670221884',
  website: 'https://www.onetrack.app',
  profilePicture: null,
}

describe('brandedEmailHtml', () => {
  it('wraps plain text in a branded HTML landing layout', () => {
    const html = buildBrandedEmailHtml({
      body: 'Dear Rahim,\n\nYour Client ID is c-1001.\n\nhttps://example.com/track?passport=A1',
      agency,
      recipientName: 'Rahim Uddin',
    })
    expect(isBrandedEmailHtml(html)).toBe(true)
    expect(html).toContain('OneTrack')
    expect(html).toContain('Your Client ID is c-1001.')
    expect(html).toContain('Track your application')
    expect(html).toContain('track?passport=A1')
  })

  it('prefers passport tracking links for the CTA', () => {
    expect(
      extractEmailCtaUrl(
        'See https://example.com/about\nhttps://app.test/track?passport=AB12',
      ),
    ).toBe('https://app.test/track?passport=AB12')
  })
})
