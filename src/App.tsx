import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom'
import { signedInHomePath } from '@/lib/modules'
import { useAuth } from '@/lib/auth'

const AuthenticatedLayout = lazy(() => import('@/layout/AuthenticatedLayout'))
const CaseInvoicePage = lazy(() => import('@/pages/CaseInvoicePage'))
const PublicInvoicePage = lazy(() => import('@/pages/PublicInvoicePage'))
const CaseDetailPage = lazy(() => import('@/pages/CaseDetailPage'))
const CasesPage = lazy(() => import('@/pages/CasesPage'))
const LegacyCasesRedirect = lazy(() => import('@/pages/LegacyCasesRedirect'))
const ClientDetailPage = lazy(() => import('@/pages/ClientDetailPage'))
const ClientsPage = lazy(() => import('@/pages/ClientsPage'))
const ComponentsPage = lazy(() => import('@/pages/ComponentsPage'))
const DashboardPage = lazy(() => import('@/pages/DashboardPage'))
const DocumentsPage = lazy(() => import('@/pages/DocumentsPage'))
const PaymentsPage = lazy(() => import('@/pages/PaymentsPage'))
const HelpPage = lazy(() => import('@/pages/HelpPage'))
const HomePage = lazy(() => import('@/pages/HomePage'))
const HrPage = lazy(() => import('@/pages/HrPage'))
const PartnersPage = lazy(() => import('@/pages/PartnersPage'))
const PartnerDetailPage = lazy(() => import('@/pages/PartnerDetailPage'))
const ProfilePage = lazy(() => import('@/pages/ProfilePage'))
const SettingsPage = lazy(() => import('@/pages/SettingsPage'))
const TrackClientPage = lazy(() => import('@/pages/TrackClientPage'))
const PublicClientIntakePage = lazy(() => import('@/pages/PublicClientIntakePage'))
const TenantsAdminPage = lazy(() => import('@/pages/admin/TenantsAdminPage'))
const TenantAdminLayout = lazy(() => import('@/pages/admin/TenantAdminLayout'))
const TenantOverviewPage = lazy(() => import('@/pages/admin/TenantOverviewPage'))
const TenantUsersPage = lazy(() => import('@/pages/admin/TenantUsersPage'))
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'))

function RouteFallback() {
  return <div className="pd-route-fallback" aria-busy="true" aria-live="polite" />
}

function LegacyAgentsRedirect() {
  const { id } = useParams()
  return <Navigate to={id ? `/partners/${id}` : '/partners'} replace />
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
          <Route path="/track" element={<TrackClientPage />} />
          <Route path="/join/:partnerId" element={<PublicClientIntakePage />} />
          <Route path="/i/:token" element={<PublicInvoicePage />} />
          <Route path="/" element={<AuthenticatedLayout />}>
            <Route index element={<HomePage />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="clients" element={<ClientsPage />} />
            <Route path="clients/:id" element={<ClientDetailPage />}>
              <Route path="services/:caseId" element={<CaseDetailPage />} />
            </Route>
            <Route
              path="clients/:id/services/:caseId/invoice"
              element={<CaseInvoicePage />}
            />
            <Route path="partners" element={<PartnersPage />} />
            <Route path="partners/:id" element={<PartnerDetailPage />} />
            <Route path="agents" element={<Navigate to="/partners" replace />} />
            <Route path="agents/:id" element={<LegacyAgentsRedirect />} />
            <Route path="services" element={<CasesPage />} />
            <Route path="services/:id" element={<LegacyCasesRedirect />} />
            <Route
              path="services/:id/invoice"
              element={<LegacyCasesRedirect />}
            />
            <Route path="work" element={<Navigate to="/services" replace />} />
            <Route path="work/:id/invoice" element={<LegacyCasesRedirect />} />
            <Route path="work/:id" element={<LegacyCasesRedirect />} />
            <Route path="cases" element={<Navigate to="/services" replace />} />
            <Route path="cases/:id/invoice" element={<LegacyCasesRedirect />} />
            <Route path="cases/:id" element={<LegacyCasesRedirect />} />
            <Route path="payments" element={<PaymentsPage />} />
            <Route path="finance" element={<Navigate to="/payments" replace />} />
            <Route path="documents" element={<DocumentsPage />} />
            <Route path="reporting" element={<DashboardPage />} />
            <Route path="hr" element={<HrPage />} />
            <Route path="help" element={<HelpPage />} />
            <Route path="admin" element={<Navigate to="/admin/tenants" replace />} />
            <Route path="admin/tenants" element={<TenantsAdminPage />} />
            <Route
              path="admin/tenants/:tenantId"
              element={<TenantAdminLayout />}
            >
              <Route index element={<Navigate to="users" replace />} />
              <Route path="overview" element={<TenantOverviewPage />} />
              <Route path="users" element={<TenantUsersPage />} />
              <Route path="modules" element={<Navigate to="users" replace />} />
            </Route>
            <Route path="settings" element={<SettingsPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="components" element={<ComponentsPage />} />
          </Route>
          <Route path="*" element={<CatchAllRedirect />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App
