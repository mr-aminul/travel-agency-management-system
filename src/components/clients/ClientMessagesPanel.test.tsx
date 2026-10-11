import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AuthProvider } from '@/lib/AuthProvider'
import { DEMO_USER, clearSession, writeSession } from '@/lib/authApi'
import { getClientById } from '@/lib/clientsStore'
import { resetClientMessages } from '@/lib/clientMessagesStore'
import { TENANT_IDS } from '@/types/tenant'
import { ClientMessagesPanel } from '@/components/clients/ClientMessagesPanel'

vi.mock('@/lib/smsInboundApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/smsInboundApi')>()
  return {
    ...actual,
    fetchInboundSms: vi.fn(async () => []),
    sendClientSmsViaApi: vi.fn(async () => ({
      ok: true,
      mobile: '8801712345678',
      messageId: 'msg-test',
      senderId: '8809617602051',
    })),
  }
})

import { sendClientSmsViaApi } from '@/lib/smsInboundApi'

afterEach(() => {
  cleanup()
  clearSession()
  resetClientMessages()
})

beforeEach(() => {
  vi.mocked(sendClientSmsViaApi).mockClear()
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
  it('sends an SMS through the platform API then shows it in the thread', async () => {
    renderMessages('sms')

    expect(screen.getByText(/SMS thread ·/i)).toBeInTheDocument()
    const input = screen.getByRole('textbox', { name: 'Message' })
    const send = screen.getByRole('button', { name: 'Send SMS' })
    expect(send).toBeDisabled()

    fireEvent.change(input, { target: { value: 'Please bring your passport.' } })
    expect(send).toBeEnabled()
    fireEvent.click(send)

    await waitFor(() => {
      expect(sendClientSmsViaApi).toHaveBeenCalledWith({
        clientId: 'c-284',
        body: 'Please bring your passport.',
      })
    })
    expect(screen.getByText('Please bring your passport.')).toBeInTheDocument()
    expect(input).toHaveValue('')
  })

  it('uses a multi-line editor for email notes, not the short SMS input', () => {
    renderMessages('email')

    expect(
      screen.getByText(/Logged email note · rahim\.uddin@email\.com/i),
    ).toBeInTheDocument()
    const editor = screen.getByRole('textbox', { name: 'Email' })
    expect(editor.tagName).toBe('TEXTAREA')
    expect(screen.queryByRole('button', { name: 'Send' })).not.toBeInTheDocument()

    const send = screen.getByRole('button', { name: 'Save note' })
    fireEvent.change(editor, {
      target: { value: 'Your documents are ready for pickup.' },
    })
    fireEvent.click(send)

    expect(
      screen.getByText('Your documents are ready for pickup.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Attach image' })).toBeInTheDocument()
  })
})
