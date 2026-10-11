import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { cleanup, render, screen } from '@testing-library/react'
import { AuthProvider } from '@/lib/AuthProvider'
import { DEMO_USER, clearSession, writeSession } from '@/lib/authApi'
import { TENANT_IDS } from '@/types/tenant'
import SettingsPage from '@/pages/SettingsPage'

beforeAll(() => {
  if (typeof globalThis.ResizeObserver === 'undefined') {
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  }
})

afterEach(() => {
  cleanup()
  clearSession()
})

describe('service catalog v2 smoke', () => {
  it('renders the v2 catalog list', async () => {
    writeSession({
      user: DEMO_USER,
      tenantId: TENANT_IDS.full,
      signedInAt: '2026-01-01T00:00:00.000Z',
    })
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/settings?section=servicesV2']}>
          <Routes>
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/settings/services-v2/:serviceKey" element={<SettingsPage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>,
    )
    expect(
      await screen.findByRole('heading', { name: 'Service catalog v2' }, { timeout: 5000 }),
    ).toBeInTheDocument()
  }, 15000)

  it('opens the flow editor without crashing', async () => {
    writeSession({
      user: DEMO_USER,
      tenantId: TENANT_IDS.full,
      signedInAt: '2026-01-01T00:00:00.000Z',
    })
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/settings/services-v2/tourist-visa']}>
          <Routes>
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/settings/services-v2/:serviceKey" element={<SettingsPage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>,
    )
    expect(
      await screen.findByLabelText('Service flow canvas', {}, { timeout: 5000 }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
  }, 15000)
})
