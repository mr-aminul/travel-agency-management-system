import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { signedInHomePath } from '@/lib/modules'
import { useAuth } from '@/lib/auth'

const AuthenticatedLayout = lazy(() => import('@/layout/AuthenticatedLayout'))
const CaseInvoicePage = lazy(() => import('@/pages/CaseInvoicePage'))
const CaseRoute = lazy(() => import('@/pages/CaseRoute'))
const CasesPage = lazy(() => import('@/pages/CasesPage'))
const ClientDetailPage = lazy(() => import('@/pages/ClientDetailPage'))
const ClientsPage = lazy(() => import('@/pages/ClientsPage'))
const ComponentsPage = lazy(() => import('@/pages/ComponentsPage'))
const DashboardPage = lazy(() => import('@/pages/DashboardPage'))
const DummyPage = lazy(() => import('@/pages/DummyPage'))
const HomePage = lazy(() => import('@/pages/HomePage'))
const SettingsPage = lazy(() => import('@/pages/SettingsPage'))
const TenantsAdminPage = lazy(() => import('@/pages/admin/TenantsAdminPage'))
const TenantAdminLayout = lazy(() => import('@/pages/admin/TenantAdminLayout'))
const TenantOverviewPage = lazy(() => import('@/pages/admin/TenantOverviewPage'))
const TenantUsersPage = lazy(() => import('@/pages/admin/TenantUsersPage'))
const TenantModulesPage = lazy(() => import('@/pages/admin/TenantModulesPage'))
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'))

function RouteFallback() {
  return <div className="pd-route-fallback" aria-busy="true" aria-live="polite" />
}

function CatchAllRedirect() {
  const { status, user } = useAuth()
  if (status !== 'authenticated') {
    return <Navigate to="/login" replace />
  }
  return <Navigate to={signedInHomePath(user?.role ?? 'agency_user')} replace />
}

/** Matches Vite `base` (`/` by default; `/platform/` when VITE_BASE_PATH is set for EC2). */
const routerBasename = import.meta.env.BASE_URL.replace(/\/$/, '') || undefined

function App() {
  return (
    <BrowserRouter basename={routerBasename}>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<AuthenticatedLayout />}>
            <Route index element={<HomePage />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="clients" element={<ClientsPage />} />
            <Route path="clients/:id" element={<ClientDetailPage />} />
            <Route path="cases" element={<CasesPage />} />
            <Route path="cases/:id" element={<CaseRoute />} />
            <Route path="cases/:id/invoice" element={<CaseInvoicePage />} />
            <Route path="finance" element={<DummyPage title="Finance" />} />
            <Route path="documents" element={<DummyPage title="Documents" />} />
            <Route path="reporting" element={<DummyPage title="Reporting" />} />
            <Route path="hr" element={<DummyPage title="HR" />} />
            <Route path="admin" element={<Navigate to="/admin/tenants" replace />} />
            <Route path="admin/tenants" element={<TenantsAdminPage />} />
            <Route
              path="admin/tenants/:tenantId"
              element={<TenantAdminLayout />}
            >
              <Route index element={<Navigate to="users" replace />} />
              <Route path="overview" element={<TenantOverviewPage />} />
              <Route path="users" element={<TenantUsersPage />} />
              <Route path="modules" element={<TenantModulesPage />} />
            </Route>
            <Route path="settings" element={<SettingsPage />} />
            <Route path="profile" element={<DummyPage title="My profile" />} />
            <Route path="components" element={<ComponentsPage />} />
          </Route>
          <Route path="*" element={<CatchAllRedirect />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App
