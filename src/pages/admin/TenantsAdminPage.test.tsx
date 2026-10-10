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
import { getTenantById, resetTenantEntitlements } from '@/lib/tenantsStore'
import { TENANT_IDS } from '@/types/tenant'
import TenantsAdminPage from '@/pages/admin/TenantsAdminPage'
import TenantAdminLayout from '@/pages/admin/TenantAdminLayout'
import TenantAllPage from '@/pages/admin/TenantAllPage'
import TenantOverviewPage from '@/pages/admin/TenantOverviewPage'
import TenantUsersPage from '@/pages/admin/TenantUsersPage'
import TenantModulesPage from '@/pages/admin/TenantModulesPage'
import TenantActivityPage from '@/pages/admin/TenantActivityPage'

afterEach(() => {
  cleanup()
  clearSession()
  resetTenantEntitlements()
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
              <Route index element={<Navigate to="all" replace />} />
              <Route path="all" element={<TenantAllPage />} />
              <Route path="overview" element={<TenantOverviewPage />} />
              <Route path="people" element={<TenantUsersPage />} />
              <Route path="product" element={<TenantModulesPage />} />
              <Route path="activity" element={<TenantActivityPage />} />
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

  it('takes platform overview Add agency into the create drawer', async () => {
    asAdmin()
    const { default: AdminOverviewPage } = await import(
      '@/pages/admin/AdminOverviewPage'
    )
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/admin']}>
          <Suspense fallback={<p>Loading</p>}>
            <Routes>
              <Route path="/admin" element={<AdminOverviewPage />} />
              <Route path="/admin/agencies" element={<TenantsAdminPage />} />
            </Routes>
          </Suspense>
        </MemoryRouter>
      </AuthProvider>,
    )

    fireEvent.click(await screen.findByRole('button', { name: 'Add agency' }))
    expect(
      await screen.findByRole('heading', { name: 'Add agency' }),
    ).toBeInTheDocument()
  })

  it('opens agency overview and exposes product modules', async () => {
    renderAdmin('/admin/agencies')

    fireEvent.click(await screen.findByText('Coastal Leisure'))

    expect(
      await screen.findByRole('heading', { name: 'Coastal Leisure' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'All' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'People' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Product' })).toBeInTheDocument()
    expect(
      await screen.findByRole('switch', { name: 'Tourist Visa' }),
    ).toBeInTheDocument()

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

  it('keeps a confirmed product toggle after leaving and returning', async () => {
    renderAdmin(`/admin/agencies/${TENANT_IDS.leisure}/product`)

    const hrSwitch = await screen.findByRole('switch', { name: 'HR' })
    expect(hrSwitch).not.toBeChecked()

    fireEvent.click(hrSwitch)
    fireEvent.click(await screen.findByRole('button', { name: 'Enable' }))

    expect(await screen.findByRole('switch', { name: 'HR' })).toBeChecked()
    expect(getTenantById(TENANT_IDS.leisure)!.enabledModules).toContain('hr')

    fireEvent.click(screen.getByRole('link', { name: 'People' }))
    expect(
      await screen.findByText('ops@coastalleisure.com'),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('link', { name: 'Product' }))
    expect(await screen.findByRole('switch', { name: 'HR' })).toBeChecked()
  })
})
