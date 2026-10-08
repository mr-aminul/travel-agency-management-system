import { afterEach, describe, expect, it } from 'vitest'
import {
  DEMO_USER,
  LEISURE_USER,
  clearSession,
  writeSession,
} from '@/lib/authApi'
import {
  listClientMessages,
  listClientSms,
  resetClientMessages,
  sendClientMessage,
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
      /Write a note/,
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

describe('client email', () => {
  it('records an outbound email on the client thread', () => {
    asFull()
    const sent = sendClientMessage({
      clientId: 'c-284',
      channel: 'email',
      body: 'Please review the attached passport scan.',
      attachment: {
        name: 'passport.png',
        dataUrl: 'data:image/png;base64,abc',
        mimeType: 'image/png',
      },
    })
    expect(sent.to).toBe('rahim.uddin@email.com')
    expect(sent.channel).toBe('email')
    expect(sent.attachment?.name).toBe('passport.png')
    expect(listClientMessages('c-284', 'email')).toEqual([
      expect.objectContaining({ id: sent.id, channel: 'email' }),
    ])
    expect(listClientMessages('c-284', 'sms')).toEqual([])
  })

  it('allows sending an image without body text', () => {
    asFull()
    const sent = sendClientMessage({
      clientId: 'c-284',
      channel: 'email',
      body: '  ',
      attachment: {
        name: 'ticket.jpg',
        dataUrl: 'data:image/jpeg;base64,xyz',
        mimeType: 'image/jpeg',
      },
    })
    expect(sent.body).toBe('')
    expect(sent.attachment?.name).toBe('ticket.jpg')
  })
})
