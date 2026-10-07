import { afterEach, describe, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { AuthProvider } from '@/lib/AuthProvider'
import { DEMO_USER, clearSession, writeSession } from '@/lib/authApi'
import { getClientByPhone, resetClients } from '@/lib/clientsStore'
import { TENANT_IDS } from '@/types/tenant'
import PublicClientIntakePage from '@/pages/PublicClientIntakePage'

afterEach(() => {
  cleanup()
  clearSession()
  resetClients()
})

function renderIntake(subAgentId: string) {
  clearSession()
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[`/join/${subAgentId}`]}>
        <Routes>
          <Route path="/join/:subAgentId" element={<PublicClientIntakePage />} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  )
}

function renderAgencyIntake(tenantSlug: string) {
  clearSession()
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[`/client-registration/${tenantSlug}`]}>
        <Routes>
          <Route
            path="/client-registration/:tenantSlug"
            element={<PublicClientIntakePage />}
          />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  )
}

describe('public client intake', () => {
  it('lets anyone submit a profile that lands under that sub agent', () => {
    renderIntake('AGT-T0001')

    expect(
      screen.getByRole('heading', { name: 'Create your profile' }),
    ).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/full name/i), {
      target: { value: 'Nusrat Jahan' },
    })
    fireEvent.change(screen.getByLabelText(/mobile number/i), {
      target: { value: '01822223333' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }))

    expect(
      screen.getByRole('heading', { name: 'Details received' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/Rakib Travels/)).toBeInTheDocument()

    writeSession({
      user: DEMO_USER,
      tenantId: TENANT_IDS.full,
      signedInAt: '2026-01-01T00:00:00.000Z',
    })
    const created = getClientByPhone('01822223333')
    expect(created?.name).toBe('Nusrat Jahan')
    expect(created?.subAgentId).toBe('AGT-T0001')
  })

  it('lets anyone submit a profile that lands as an agency client', () => {
    renderAgencyIntake('onetrack-demo')

    expect(
      screen.getByRole('heading', { name: 'Create your profile' }),
    ).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/full name/i), {
      target: { value: 'Direct Client' },
    })
    fireEvent.change(screen.getByLabelText(/mobile number/i), {
      target: { value: '01844445555' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }))

    expect(
      screen.getByRole('heading', { name: 'Details received' }),
    ).toBeInTheDocument()

    writeSession({
      user: DEMO_USER,
      tenantId: TENANT_IDS.full,
      signedInAt: '2026-01-01T00:00:00.000Z',
    })
    const created = getClientByPhone('01844445555')
    expect(created?.name).toBe('Direct Client')
    expect(created?.subAgentId).toBeUndefined()
    expect(created?.tenantId).toBe(TENANT_IDS.full)
  })

  it('still accepts legacy agency links that used the internal tenant id', () => {
    clearSession()
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={[`/join/direct/${TENANT_IDS.full}`]}>
          <Routes>
            <Route
              path="/join/direct/:tenantSlug"
              element={<PublicClientIntakePage />}
            />
          </Routes>
        </MemoryRouter>
      </AuthProvider>,
    )

    expect(
      screen.getByRole('heading', { name: 'Create your profile' }),
    ).toBeInTheDocument()
    expect(screen.queryByText(/invalid or has expired/i)).not.toBeInTheDocument()
  })

  it('rejects an unknown agency link', () => {
    renderAgencyIntake('missing-tenant')
    expect(screen.getByText(/invalid or has expired/i)).toBeInTheDocument()
  })

  it('rejects an unknown agent link', () => {
    renderIntake('missing-agent')
    expect(screen.getByText(/invalid or has expired/i)).toBeInTheDocument()
  })
})
