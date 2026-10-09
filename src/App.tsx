import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom'
import { postLoginPath } from '@/lib/authWorkspaces'
import { useAuth } from '@/lib/auth'

const AuthenticatedLayout = lazy(() => import('@/layout/AuthenticatedLayout'))
const CaseInvoicePage = lazy(() => import('@/pages/CaseInvoicePage'))
const PublicInvoicePage = lazy(() => import('@/pages/PublicInvoicePage'))
const CaseDetailPage = lazy(() => import('@/pages/CaseDetailPage'))
const CasesPage = lazy(() => import('@/pages/CasesPage'))
const LegacyCasesRedirect = lazy(() => import('@/pages/LegacyCasesRedirect'))
const ClientDetailPage = lazy(() => import('@/pages/ClientDetailPage'))
const ClientsPage = lazy(() => import('@/pages/ClientsPage'))
const DashboardPage = lazy(() => import('@/pages/DashboardPage'))
const ServiceBoardPage = lazy(() => import('@/pages/ServiceBoardPage'))
const DocumentsPage = lazy(() => import('@/pages/DocumentsPage'))
const PaymentsPage = lazy(() => import('@/pages/PaymentsPage'))
const ReportsPage = lazy(() => import('@/pages/ReportsPage'))
const HelpPage = lazy(() => import('@/pages/HelpPage'))
const HomePage = lazy(() => import('@/pages/HomePage'))
const HrPage = lazy(() => import('@/pages/HrPage'))
const HrAttendancePage = lazy(() => import('@/pages/HrAttendancePage'))
const HrPayrollPage = lazy(() => import('@/pages/HrPayrollPage'))
const EmployeeDetailPage = lazy(() => import('@/pages/EmployeeDetailPage'))
const SubAgentsPage = lazy(() => import('@/pages/SubAgentsPage'))
const SubAgentDetailPage = lazy(() => import('@/pages/SubAgentDetailPage'))
const ApprovalsPage = lazy(() => import('@/pages/ApprovalsPage'))
const MySubmissionsPage = lazy(() => import('@/pages/MySubmissionsPage'))
const ProfilePage = lazy(() => import('@/pages/ProfilePage'))
const SettingsPage = lazy(() => import('@/pages/SettingsPage'))
const TrackClientPage = lazy(() => import('@/pages/TrackClientPage'))
const TrashPage = lazy(() => import('@/pages/TrashPage'))
const PublicClientIntakePage = lazy(() => import('@/pages/PublicClientIntakePage'))
const AdminOverviewPage = lazy(() => import('@/pages/admin/AdminOverviewPage'))
const TenantsAdminPage = lazy(() => import('@/pages/admin/TenantsAdminPage'))
const TenantAdminLayout = lazy(() => import('@/pages/admin/TenantAdminLayout'))
const TenantOverviewPage = lazy(() => import('@/pages/admin/TenantOverviewPage'))
const TenantUsersPage = lazy(() => import('@/pages/admin/TenantUsersPage'))
const TenantModulesPage = lazy(() => import('@/pages/admin/TenantModulesPage'))
const TenantActivityPage = lazy(() => import('@/pages/admin/TenantActivityPage'))
const AdminPeoplePage = lazy(() => import('@/pages/admin/AdminPeoplePage'))
const AdminActivityPage = lazy(() => import('@/pages/admin/AdminActivityPage'))
const AdminPlatformPage = lazy(() => import('@/pages/admin/AdminPlatformPage'))
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'))
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('@/pages/auth/ResetPasswordPage'))
const AcceptInvitePage = lazy(() => import('@/pages/auth/AcceptInvitePage'))
const ChooseWorkspacePage = lazy(() => import('@/pages/auth/ChooseWorkspacePage'))

function RouteFallback() {
  return <div className="pd-route-fallback" aria-busy="true" aria-live="polite" />
}

function LegacyAgentsRedirect() {
  const { id } = useParams()
  return <Navigate to={id ? `/sub-agents/${id}` : '/sub-agents'} replace />
}

function LegacyTenantAdminRedirect() {
  const { tenantId, '*': rest } = useParams()
  if (!tenantId) return <Navigate to="/admin/agencies" replace />
  const section = (rest ?? '').split('/')[0]
  const mapped =
    section === 'users'
      ? 'people'
      : section === 'modules'
        ? 'product'
        : section || 'overview'
  return <Navigate to={`/admin/agencies/${tenantId}/${mapped}`} replace />
}

function CatchAllRedirect() {
  const { status, session } = useAuth()
  if (status !== 'authenticated' || !session) {
    return <Navigate to="/login" replace />
  }
  return <Navigate to={postLoginPath(session)} replace />
}

/** Matches Vite `base` (`/` by default; `/platform/` when VITE_BASE_PATH is set for EC2). */
const routerBasename = import.meta.env.BASE_URL.replace(/\/$/, '') || undefined

function App() {
  return (
    <BrowserRouter basename={routerBasename}>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/choose-workspace" element={<ChooseWorkspacePage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset/:token" element={<ResetPasswordPage />} />
          <Route path="/invite/:token" element={<AcceptInvitePage />} />
          <Route path="/track" element={<TrackClientPage />} />
          <Route
            path="/client-registration/:tenantSlug"
            element={<PublicClientIntakePage />}
          />
          {/* Legacy agency intake links */}
          <Route path="/register/:tenantSlug" element={<PublicClientIntakePage />} />
          <Route path="/join/direct/:tenantSlug" element={<PublicClientIntakePage />} />
          <Route path="/join/:subAgentId" element={<PublicClientIntakePage />} />
          <Route path="/i/:token" element={<PublicInvoicePage />} />
          <Route path="/" element={<AuthenticatedLayout />}>
            <Route index element={<HomePage />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="service-board" element={<ServiceBoardPage />} />
            <Route
              path="readiness"
              element={<Navigate to="/service-board" replace />}
            />
            <Route path="clients" element={<ClientsPage />} />
            <Route path="clients/:id" element={<ClientDetailPage />}>
              <Route path="services/:caseId" element={<CaseDetailPage />} />
            </Route>
            <Route
              path="clients/:id/services/:caseId/invoice"
              element={<CaseInvoicePage />}
            />
            <Route path="sub-agents" element={<SubAgentsPage />} />
            <Route path="sub-agents/:id" element={<SubAgentDetailPage />} />
            <Route path="approvals" element={<ApprovalsPage />} />
            <Route path="my-submissions" element={<MySubmissionsPage />} />
            {/* Legacy URLs from before the sub-agent rename */}
            <Route path="partners" element={<Navigate to="/sub-agents" replace />} />
            <Route path="partners/:id" element={<LegacyAgentsRedirect />} />
            <Route path="agents" element={<Navigate to="/sub-agents" replace />} />
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
            <Route path="reports" element={<ReportsPage />} />
            <Route path="finance" element={<Navigate to="/payments" replace />} />
            <Route path="documents" element={<DocumentsPage />} />
            <Route path="hr" element={<Navigate to="/hr/employees" replace />} />
            <Route path="hr/employees" element={<HrPage />} />
            <Route path="hr/employees/:id" element={<EmployeeDetailPage />} />
            <Route path="hr/attendance" element={<HrAttendancePage />} />
            <Route path="hr/payroll" element={<HrPayrollPage />} />
            <Route path="help" element={<HelpPage />} />
            <Route path="admin" element={<AdminOverviewPage />} />
            <Route path="admin/agencies" element={<TenantsAdminPage />} />
            <Route
              path="admin/agencies/:tenantId"
              element={<TenantAdminLayout />}
            >
              <Route index element={<Navigate to="overview" replace />} />
              <Route path="overview" element={<TenantOverviewPage />} />
              <Route path="people" element={<TenantUsersPage />} />
              <Route path="product" element={<TenantModulesPage />} />
              <Route path="activity" element={<TenantActivityPage />} />
              {/* Legacy section aliases */}
              <Route path="users" element={<Navigate to="../people" replace />} />
              <Route
                path="modules"
                element={<Navigate to="../product" replace />}
              />
            </Route>
            <Route path="admin/people" element={<AdminPeoplePage />} />
            <Route path="admin/activity" element={<AdminActivityPage />} />
            <Route path="admin/platform" element={<AdminPlatformPage />} />
            {/* Legacy Businesses URLs */}
            <Route
              path="admin/tenants"
              element={<Navigate to="/admin/agencies" replace />}
            />
            <Route
              path="admin/tenants/:tenantId/*"
              element={<LegacyTenantAdminRedirect />}
            />
            <Route path="settings" element={<SettingsPage />} />
            <Route
              path="settings/services/:serviceKey"
              element={<SettingsPage />}
            />
            <Route path="trash" element={<TrashPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>
          <Route path="*" element={<CatchAllRedirect />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App
