import { afterEach, describe, expect, it } from 'vitest'
import {
  DEMO_USER,
  LEISURE_USER,
  clearSession,
  writeSession,
} from '@/lib/authApi'
import {
  listClientSms,
  resetClientMessages,
  sendClientSms,
} from '@/lib/clientMessagesStore'
import { TENANT_IDS } from '@/types/tenant'

afterEach(() => {
  clearSession()
  resetClientMessages()
})

function asFull() {
  writeSession({
    user: DEMO_USER,
    tenantId: TENANT_IDS.full,
    signedInAt: '2026-01-01T00:00:00.000Z',
  })
}

describe('client SMS', () => {
  it('records an outbound SMS on the client thread', () => {
    asFull()
    const sent = sendClientSms({
      clientId: 'c-284',
      body: '  Documents received.  ',
    })
    expect(sent.toPhone).toBe('01712345678')
    expect(sent.body).toBe('Documents received.')
    expect(listClientSms('c-284')).toEqual([
      expect.objectContaining({ id: sent.id, body: 'Documents received.' }),
    ])
  })

  it('rejects an empty message', () => {
    asFull()
    expect(() => sendClientSms({ clientId: 'c-284', body: '   ' })).toThrow(
      /Write a message/,
    )
  })

  it('keeps messages on the tenant they were sent from', () => {
    asFull()
    sendClientSms({ clientId: 'c-284', body: 'Please call the office.' })

    writeSession({
      user: LEISURE_USER,
      tenantId: TENANT_IDS.leisure,
      signedInAt: '2026-01-01T00:00:00.000Z',
    })
    expect(listClientSms('c-284')).toEqual([])
  })
})
