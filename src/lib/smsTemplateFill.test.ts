import { describe, expect, it } from 'vitest'
import { fillSmsTemplate } from '@/lib/smsTemplateFill'
import type { Client } from '@/types/client'
import { TENANT_IDS } from '@/types/tenant'

const client: Client = {
  id: 'c-1001',
  tenantId: TENANT_IDS.full,
  name: 'Rahim Uddin',
  phone: '01712345678',
  passport: 'A12345678',
  nid: '1990123456789',
  email: 'rahim@example.com',
  address: 'Dhaka',
  subAgentId: 'AGT-T0001',
  services: [],
  balance: 0,
  activeCases: 0,
  idChecked: true,
  createdAt: '2026-01-01T00:00:00.000Z',
}

describe('fillSmsTemplate', () => {
  it('replaces client and agency attributes', () => {
    const body = fillSmsTemplate(
      'Dear {{name}}, ID {{clientId}} — {{agencyName}}',
      { client, agencyName: 'OneTrack' },
    )
    expect(body).toBe('Dear Rahim Uddin, ID c-1001 — OneTrack')
  })

  it('fills passport tracking link and agent name', () => {
    const body = fillSmsTemplate(
      'Track: {{trackingLink}} · Agent: {{agentName}}',
      { client },
    )
    expect(body).toBe(
      `Track: ${window.location.origin}${import.meta.env.BASE_URL || '/'}track?passport=A12345678 · Agent: Rakib Travels`,
    )
  })

  it('leaves unknown tokens unchanged', () => {
    expect(
      fillSmsTemplate('Hi {{name}} {{unknown}}', { client }),
    ).toBe('Hi Rahim Uddin {{unknown}}')
  })

  it('fills pipeline service and status labels', () => {
    const body = fillSmsTemplate(
      'Your {{serviceName}} file is at {{statusLabel}}',
      {
        client,
        serviceName: 'Tour Package',
        statusLabel: 'Enquiry',
      },
    )
    expect(body).toBe('Your Tour Package file is at Enquiry')
  })
})
