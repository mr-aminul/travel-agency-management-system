import { Suspense } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { MemoryRouter, Navigate, Route, Routes } from 'react-router-dom'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { AuthProvider } from '@/lib/AuthProvider'
import {
  PLATFORM_ADMIN_USER,
  clearSession,
  writeSession,
} from '@/lib/authApi'
import { TENANT_IDS } from '@/types/tenant'
import TenantsAdminPage from '@/pages/admin/TenantsAdminPage'
import TenantAdminLayout from '@/pages/admin/TenantAdminLayout'
import TenantOverviewPage from '@/pages/admin/TenantOverviewPage'
import TenantUsersPage from '@/pages/admin/TenantUsersPage'
import TenantModulesPage from '@/pages/admin/TenantModulesPage'

afterEach(() => {
  cleanup()
  clearSession()
})

function asAdmin() {
  writeSession({
    user: PLATFORM_ADMIN_USER,
    tenantId: TENANT_IDS.full,
    signedInAt: '2026-01-01T00:00:00.000Z',
  })
}

function renderAdmin(path: string) {
  asAdmin()
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[path]}>
        <Suspense fallback={<p>Loading</p>}>
          <Routes>
            <Route path="/admin/agencies" element={<TenantsAdminPage />} />
            <Route
              path="/admin/agencies/:tenantId"
              element={<TenantAdminLayout />}
            >
              <Route index element={<Navigate to="overview" replace />} />
              <Route path="overview" element={<TenantOverviewPage />} />
              <Route path="people" element={<TenantUsersPage />} />
              <Route path="product" element={<TenantModulesPage />} />
            </Route>
          </Routes>
        </Suspense>
      </MemoryRouter>
    </AuthProvider>,
  )
}

describe('platform admin agencies', () => {
  it('lists onboarded agencies without stacking modules', async () => {
    renderAdmin('/admin/agencies')

    expect(
      await screen.findByRole('heading', { name: 'Agencies' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Coastal Leisure')).toBeInTheDocument()
    expect(screen.getByText('Horizon Manpower')).toBeInTheDocument()
    expect(screen.queryByRole('switch')).not.toBeInTheDocument()
  })

  it('opens agency overview and exposes product modules', async () => {
    renderAdmin('/admin/agencies')

    fireEvent.click(await screen.findByText('Coastal Leisure'))

    expect(
      await screen.findByRole('heading', { name: 'Coastal Leisure' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'People' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Product' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('link', { name: 'People' }))
    expect(
      await screen.findByText('ops@coastalleisure.com'),
    ).toBeInTheDocument()
    expect(screen.getByText('Farzana Rahman')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('link', { name: 'Product' }))
    expect(
      await screen.findByRole('switch', { name: 'Tourist Visa' }),
    ).toBeInTheDocument()
  })
})
