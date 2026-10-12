import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { AuthProvider } from '@/lib/AuthProvider'
import { DEMO_USER, clearSession, writeSession } from '@/lib/authApi'
import { getClientById } from '@/lib/clientsStore'
import { resetClientMessages } from '@/lib/clientMessagesStore'
import { resetSmsTemplates } from '@/lib/smsTemplatesStore'
import { TENANT_IDS } from '@/types/tenant'
import { ClientMessagesPanel } from '@/components/clients/ClientMessagesPanel'

vi.mock('@/lib/smsInboundApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/smsInboundApi')>()
  return {
    ...actual,
    sendClientSmsViaApi: vi.fn(async () => ({
      ok: true,
      mobile: '8801712345678',
      messageId: 'msg-test',
      senderId: '8809617602051',
    })),
  }
})

vi.mock('@/lib/clientEmailApi', () => ({
  sendClientEmailViaApi: vi.fn(async () => ({
    ok: true,
    to: 'rahim.uddin@email.com',
    subject: 'Update from OneTrack',
  })),
}))

import { sendClientSmsViaApi } from '@/lib/smsInboundApi'
import { sendClientEmailViaApi } from '@/lib/clientEmailApi'

afterEach(() => {
  cleanup()
  clearSession()
  resetClientMessages()
  resetSmsTemplates()
})

beforeEach(() => {
  vi.mocked(sendClientSmsViaApi).mockClear()
  vi.mocked(sendClientEmailViaApi).mockClear()
  resetSmsTemplates()
})

function renderMessages(channel: 'sms' | 'email' = 'sms') {
  writeSession({
    user: DEMO_USER,
    tenantId: TENANT_IDS.full,
    signedInAt: '2026-01-01T00:00:00.000Z',
  })
  const client = getClientById('c-284')
  if (!client) throw new Error('Expected seeded client')
  return render(
    <AuthProvider>
      <ClientMessagesPanel client={client} channel={channel} />
    </AuthProvider>,
  )
}

describe('client messages panel', () => {
  it('requires Send SMS click and confirmation before sending', async () => {
    renderMessages('sms')

    expect(screen.getByText(/SMS ·/i)).toBeInTheDocument()
    const input = screen.getByRole('textbox', { name: 'Message' })
    const send = screen.getByRole('button', { name: 'Send SMS' })
    expect(send).toBeDisabled()

    fireEvent.change(input, { target: { value: 'Please bring your passport.' } })
    expect(send).toBeEnabled()

    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })
    expect(sendClientSmsViaApi).not.toHaveBeenCalled()
    expect(
      screen.queryByRole('heading', { name: /Confirm sending to/i }),
    ).not.toBeInTheDocument()

    fireEvent.click(send)
    expect(
      screen.getByRole('heading', {
        name: /Confirm sending to 01712345678\?/i,
      }),
    ).toBeInTheDocument()
    expect(sendClientSmsViaApi).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Send' }))

    await waitFor(() => {
      expect(sendClientSmsViaApi).toHaveBeenCalledWith({
        clientId: 'c-284',
        body: 'Please bring your passport.',
      })
    })
    expect(screen.getByText('Please bring your passport.')).toBeInTheDocument()
    expect(input).toHaveValue('')
  })

  it('fills an SMS template from the Messages SMS template button', async () => {
    renderMessages('sms')

    expect(
      screen.queryByRole('button', { name: 'Email template' }),
    ).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'SMS template' }))
    expect(
      await screen.findByRole('heading', { name: 'SMS template' }),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /^Client ID/i }))
    expect(screen.getByRole('textbox', { name: 'Message' })).toHaveValue(
      'Dear Md. Rahim Uddin, your Client ID is c-284. Please quote this ID when you contact us. — OneTrack',
    )
  })

  it('sends branded email via API after confirmation', async () => {
    renderMessages('email')

    expect(
      screen.queryByRole('button', { name: 'SMS template' }),
    ).not.toBeInTheDocument()
    expect(screen.getByText(/Email · rahim\.uddin@email\.com/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Email template' }))
    expect(
      await screen.findByRole('heading', { name: 'Email template' }),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /^Welcome email/i }))

    expect(screen.getByTitle('Branded email preview')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Send email' }))
    expect(
      screen.getByRole('heading', {
        name: /Send email to rahim\.uddin@email\.com\?/i,
      }),
    ).toBeInTheDocument()
    expect(sendClientEmailViaApi).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Send' }))

    await waitFor(() => {
      expect(sendClientEmailViaApi).toHaveBeenCalled()
    })
    const payload = vi.mocked(sendClientEmailViaApi).mock.calls[0]?.[0]
    expect(payload?.clientId).toBe('c-284')
    expect(payload?.html).toContain('data-pd-branded-email="1"')
    expect(payload?.text).toContain('Md. Rahim Uddin')

    const frame = await screen.findByTitle(/Email email-/i)
    expect(frame.getAttribute('srcdoc') ?? '').toContain('data-pd-branded-email="1"')
  })
})
