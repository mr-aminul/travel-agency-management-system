import { describe, expect, it } from 'vitest'
import { fillDocumentHtml } from '@/lib/documentMergeFill'
import type { Client } from '@/types/client'
import { TENANT_IDS } from '@/types/tenant'

const client: Client = {
  id: 'CL-1',
  tenantId: TENANT_IDS.demo,
  name: 'Rahim Uddin',
  email: 'rahim@example.com',
  phone: '01700000000',
  passport: 'A12345678',
  address: 'Dhaka',
  services: [],
  balance: 0,
  activeCases: 0,
  idChecked: true,
  createdAt: '2026-01-01T00:00:00.000Z',
}

describe('fillDocumentHtml', () => {
  it('fills merge field spans and tokens from the client profile', () => {
    const html = fillDocumentHtml(
      `<p>Hello <span data-type="mergeField" data-key="name" data-label="Client name" class="pd-doc-merge">Client name</span> (<span data-type="mergeField" data-key="passport" data-label="Passport" class="pd-doc-merge">Passport</span>)</p><p>{{email}} · {{agencyName}} · {{license}}</p>`,
      {
        client,
        agency: {
          businessName: 'ABC Travel',
          address: 'Gulshan',
          mobile: '01670',
          website: '',
        },
        license: '864',
        date: '29 Oct 2026',
      },
    )
    expect(html).toContain('Rahim Uddin')
    expect(html).toContain('A12345678')
    expect(html).toContain('rahim@example.com')
    expect(html).toContain('ABC Travel')
    expect(html).toContain('864')
    expect(html).not.toContain('{{name}}')
  })

  it('keeps unknown tokens intact', () => {
    expect(
      fillDocumentHtml('Hi {{unknownField}}', {
        client,
        date: '29 Oct 2026',
      }),
    ).toBe('Hi {{unknownField}}')
  })
})
