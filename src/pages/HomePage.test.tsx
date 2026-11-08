import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { cleanup, render, screen, within } from '@testing-library/react'
import { AuthProvider } from '@/lib/AuthProvider'
import { DEMO_USER, clearSession, writeSession } from '@/lib/authApi'
import { dismissBusinessProfileNudge } from '@/lib/onboardingStore'
import {
  resetPendingChanges,
  submitPendingChange,
} from '@/lib/subAgentPendingChanges'
import { setTenantModuleEnabled } from '@/lib/tenantsStore'
import { TENANT_IDS } from '@/types/tenant'
import HomePage from '@/pages/HomePage'

vi.mock('@/components/home/HomeGlobalSearch', () => ({
  HomeGlobalSearch: () => <div data-testid="home-search">Search</div>,
}))

vi.mock('@/components/onboarding/PlatformTour', () => ({
  PlatformTour: () => null,
}))

afterEach(() => {
  cleanup()
  clearSession()
  resetPendingChanges()
  setTenantModuleEnabled(TENANT_IDS.demo, 'subAgents', true)
})

function renderHome() {
  writeSession({
    user: DEMO_USER,
    tenantId: TENANT_IDS.demo,
    signedInAt: '2026-01-01T00:00:00.000Z',
  })
  dismissBusinessProfileNudge()
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/approvals" element={<div>Approvals page</div>} />
          <Route
            path="/clients/:clientId/services/:caseId"
            element={<div>Service file</div>}
          />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  )
}

describe('Home Today desk', () => {
  it('shows Today queues and quick-link tiles', () => {
    renderHome()

    expect(screen.getByRole('heading', { name: 'Today' })).toBeInTheDocument()
    expect(screen.getByTestId('home-search')).toBeInTheDocument()
    expect(
      screen.getByRole('navigation', { name: 'Quick links' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Clients/i })).toHaveAttribute(
      'href',
      '/clients',
    )
  })

  it('lists a pending approval that opens Approvals', () => {
    submitPendingChange({
      tenantId: TENANT_IDS.demo,
      subAgentId: 'sa-home-test',
      submittedByUserId: 'u-home',
      submittedByName: 'Karim',
      entityType: 'client',
      action: 'create',
      summary: 'New client: Desk Test',
      payload: {},
    })

    renderHome()

    const approvals = screen.getByRole('region', { name: 'Approvals' })
    const link = within(approvals).getByRole('link', {
      name: /New client: Desk Test/i,
    })
    expect(link).toHaveAttribute('href', '/approvals')
  })

  it('hides Approvals when the sub-agent module is off', () => {
    setTenantModuleEnabled(TENANT_IDS.demo, 'subAgents', false)
    submitPendingChange({
      tenantId: TENANT_IDS.demo,
      subAgentId: 'sa-home-test',
      submittedByUserId: 'u-home',
      submittedByName: 'Karim',
      entityType: 'client',
      action: 'create',
      summary: 'Hidden approval row',
      payload: {},
    })

    renderHome()

    expect(screen.queryByText('Hidden approval row')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('region', { name: 'Approvals' }),
    ).not.toBeInTheDocument()
  })
})
