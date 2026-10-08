import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { AuthProvider } from '@/lib/AuthProvider'
import { DEMO_USER, clearSession, writeSession } from '@/lib/authApi'
import { getClientById } from '@/lib/clientsStore'
import { resetClientMessages } from '@/lib/clientMessagesStore'
import { TENANT_IDS } from '@/types/tenant'
import { ClientMessagesPanel } from '@/components/clients/ClientMessagesPanel'

afterEach(() => {
  cleanup()
  clearSession()
  resetClientMessages()
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
  it('lets staff type an SMS note and save it', () => {
    renderMessages('sms')

    const input = screen.getByRole('textbox', { name: 'Message' })
    const send = screen.getByRole('button', { name: 'Save note' })
    expect(send).toBeDisabled()

    fireEvent.change(input, { target: { value: 'Please bring your passport.' } })
    expect(send).toBeEnabled()
    fireEvent.click(send)

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
