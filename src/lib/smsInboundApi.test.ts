import { describe, expect, it } from 'vitest'
import { inboundToThreadMessages } from '@/lib/smsInboundApi'

describe('inboundToThreadMessages', () => {
  it('maps matched inbound rows onto the client SMS thread shape', () => {
    const mapped = inboundToThreadMessages(
      [
        {
          id: 'sms-in-1',
          tenantId: 'tenant-full',
          clientId: 'c-284',
          fromPhone: '01712345678',
          body: 'Need visa update',
          createdAt: '2026-10-09T04:00:00.000Z',
        },
        {
          id: 'sms-in-2',
          tenantId: 'tenant-full',
          clientId: 'other',
          fromPhone: '01800000000',
          body: 'skip me',
          createdAt: '2026-10-09T04:01:00.000Z',
        },
      ],
      'c-284',
    )

    expect(mapped).toEqual([
      {
        id: 'sms-in-1',
        tenantId: 'tenant-full',
        clientId: 'c-284',
        channel: 'sms',
        to: '01712345678',
        body: 'Need visa update',
        direction: 'inbound',
        createdAt: '2026-10-09T04:00:00.000Z',
      },
    ])
  })
})
