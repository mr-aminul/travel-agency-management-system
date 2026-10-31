import { afterEach, describe, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { AuthProvider } from '@/lib/AuthProvider'
import { DEMO_USER, clearSession, writeSession } from '@/lib/authApi'
import { getClientByPhone, resetClients } from '@/lib/clientsStore'
import {
  listOpenPendingChanges,
  listPendingChanges,
  resetPendingChanges,
} from '@/lib/subAgentPendingChanges'
import { TENANT_IDS } from '@/types/tenant'
import PublicClientIntakePage from '@/pages/PublicClientIntakePage'

afterEach(() => {
  cleanup()
  clearSession()
  resetClients()
  resetPendingChanges()
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
  it('queues a partial approval when submitted via a sub-agent link', () => {
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
    expect(screen.getByText(/for approval/i)).toBeInTheDocument()

    // Not live yet — waiting in Approvals.
    writeSession({
      user: DEMO_USER,
      tenantId: TENANT_IDS.demo,
      signedInAt: '2026-01-01T00:00:00.000Z',
    })
    expect(getClientByPhone('01822223333')).toBeUndefined()
    const pending = listOpenPendingChanges(TENANT_IDS.demo).filter(
      (row) => row.subAgentId === 'AGT-T0001',
    )
    expect(pending.length).toBeGreaterThan(0)
    expect(pending[0]?.summary).toMatch(/Partial approval: Nusrat Jahan/)
    expect(listPendingChanges(TENANT_IDS.demo).some((row) => row.status === 'pending')).toBe(
      true,
    )
  })

  it('lets anyone submit a profile that lands as an agency client', () => {
    renderAgencyIntake('abc-travel')

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
      tenantId: TENANT_IDS.demo,
      signedInAt: '2026-01-01T00:00:00.000Z',
    })
    const created = getClientByPhone('01844445555')
    expect(created?.name).toBe('Direct Client')
    expect(created?.subAgentId).toBeUndefined()
    expect(created?.tenantId).toBe(TENANT_IDS.demo)
  })

  it('still accepts legacy agency links that used the internal tenant id', () => {
    clearSession()
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={[`/join/direct/${TENANT_IDS.demo}`]}>
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
