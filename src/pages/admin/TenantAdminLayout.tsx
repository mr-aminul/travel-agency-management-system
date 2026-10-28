import { useState } from 'react'
import {
  NavLink,
  Navigate,
  Outlet,
  useNavigate,
  useParams,
} from 'react-router-dom'
import {
  Boxes,
  Calendar,
  ExternalLink,
  LayoutDashboard,
  LayoutGrid,
  ScrollText,
  Users,
} from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { readAgencyProfile } from '@/lib/agencyProfile'
import {
  ADMIN_AGENCIES,
  adminAgencyPath,
  setSupportReturnPath,
} from '@/lib/adminPaths'
import { countCasesForTenant, latestCaseActivityForTenant } from '@/lib/casesStore'
import { countClientsForTenant } from '@/lib/clientsStore'
import { formatDisplayDate } from '@/lib/formatDate'
import {
  countPaymentsForTenant,
  latestPaymentActivityForTenant,
} from '@/lib/paymentsStore'
import { adminPatchBilling } from '@/lib/billing/billingApi'
import { authApiConfigured } from '@/lib/billing/platformFlag'
import { useTenantMembersByTenantId } from '@/lib/tenantMembersStore'
import { setTenantStatus, useTenantById } from '@/lib/tenantsStore'
import { cx } from '@/lib/cx'
import type { TenantStatus } from '@/types/tenant'
import '@/styles/layout-admin.css'
import '@/styles/layout-clients.css'
import { AdminTenantBillingPanel } from '@/components/admin/AdminTenantBillingPanel'
import {
  Avatar,
  Button,
  Select,
} from '@/components/ui'

const STATUS_OPTIONS: { value: TenantStatus; label: string }[] = [
  { value: 'trial', label: 'Trial' },
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
]

const SECTIONS = [
  { to: 'all', label: 'All', icon: LayoutGrid },
  { to: 'overview', label: 'Overview', icon: LayoutDashboard },
  { to: 'people', label: 'People', icon: Users },
  { to: 'product', label: 'Product', icon: Boxes },
  { to: 'activity', label: 'Activity', icon: ScrollText },
] as const

function latestActivity(tenantId: string): string | undefined {
  const caseStamp = latestCaseActivityForTenant(tenantId)
  const paymentStamp = latestPaymentActivityForTenant(tenantId)
  if (caseStamp && paymentStamp) {
    return caseStamp > paymentStamp ? caseStamp : paymentStamp
  }
  return caseStamp ?? paymentStamp
}

export default function TenantAdminLayout() {
  const { user, startViewAs } = useAuth()
  const navigate = useNavigate()
  const { tenantId } = useParams()
  const tenant = useTenantById(tenantId ?? '')
  const members = useTenantMembersByTenantId(tenantId ?? '')
  const [supportBusy, setSupportBusy] = useState(false)
  const [supportError, setSupportError] = useState<string | undefined>()

  if (user?.role !== 'platform_admin') {
    return null
  }

  if (!tenant) {
    return <Navigate to={ADMIN_AGENCIES} replace />
  }

  const activeUsers = members.filter((member) => member.status === 'active').length
  const clientCount = countClientsForTenant(tenant.id)
  const caseCount = countCasesForTenant(tenant.id)
  const paymentCount = countPaymentsForTenant(tenant.id)
  const activity = latestActivity(tenant.id)
  const owner =
    members.find((m) => m.role === 'owner' && m.status === 'active') ??
    members.find((m) => m.role === 'manager' && m.status === 'active') ??
    members.find((m) => m.status === 'active')

  const handleOpenAgency = async () => {
    if (!owner) {
      setSupportError('Add an active owner before opening Support Mode.')
      return
    }
    setSupportError(undefined)
    setSupportBusy(true)
    try {
      setSupportReturnPath(adminAgencyPath(tenant.id, 'all'))
      await startViewAs({
        userId: owner.id,
        email: owner.email,
        name: owner.name,
        role: 'agency_user',
        tenantId: tenant.id,
      })
      navigate('/', { replace: true })
    } catch (error) {
      setSupportError(
        error instanceof Error
          ? error.message
          : 'Could not start Support Mode.',
      )
    } finally {
      setSupportBusy(false)
    }
  }

  return (
    <div
      className="pd-page pd-client-detail pd-admin pd-admin--tenant"
      aria-label={tenant.name}
    >
      <div className="pd-client-detail__layout">
        <aside className="pd-client-detail__card" aria-label="Agency">
          <div className="pd-client-detail__card-identity">
            <Avatar
              name={tenant.name}
              size="xl"
              kind="business"
              src={readAgencyProfile(tenant.id).profilePicture}
            />
            <div className="pd-client-detail__title-row">
              <h1 className="pd-client-detail__name">{tenant.name}</h1>
            </div>
          </div>

          <div className="pd-client-detail__card-actions">
            <Button
              size="sm"
              onClick={() => void handleOpenAgency()}
              disabled={supportBusy || !owner}
            >
              <ExternalLink size={14} strokeWidth={2.25} aria-hidden />
              {supportBusy ? 'Opening…' : 'Open agency'}
            </Button>
            {supportError ? (
              <p className="pd-field__error" role="alert">
                {supportError}
              </p>
            ) : null}
          </div>

          <dl className="pd-client-detail__card-fields">
            <div className="pd-client-detail__card-field">
              <dt>Status</dt>
              <dd>
                <Select
                  aria-label="Status"
                  size="sm"
                  value={tenant.status}
                  options={STATUS_OPTIONS}
                  onChange={(event) => {
                    const next = event.target.value as TenantStatus
                    setTenantStatus(tenant.id, next)
                    if (authApiConfigured()) {
                      void adminPatchBilling(tenant.id, {
                        billingStatus: next,
                      }).catch(() => {
                        /* local status already updated */
                      })
                    }
                  }}
                />
              </dd>
            </div>
            <div className="pd-client-detail__card-field">
              <dt>Usage</dt>
              <dd>
                {clientCount} clients · {caseCount} svc · {paymentCount} pay
              </dd>
            </div>
          </dl>

          <div className="pd-client-detail__card-snapshot" aria-label="Snapshot">
            <NavLink
              className="pd-client-detail__card-snap"
              to={adminAgencyPath(tenant.id, 'people')}
            >
              <span className="pd-client-detail__card-snap-label">
                <Users size={12} strokeWidth={2.25} aria-hidden /> Users
              </span>
              <span className="pd-client-detail__card-snap-value">
                {members.length}
                {activeUsers !== members.length ? ` · ${activeUsers}` : ''}
              </span>
            </NavLink>
            <NavLink
              className="pd-client-detail__card-snap"
              to={adminAgencyPath(tenant.id, 'product')}
            >
              <span className="pd-client-detail__card-snap-label">
                <Boxes size={12} strokeWidth={2.25} aria-hidden /> Product
              </span>
              <span className="pd-client-detail__card-snap-value">
                {tenant.enabledModules.length}
              </span>
            </NavLink>
          </div>

          <AdminTenantBillingPanel tenantId={tenant.id} />

          <p className="pd-client-detail__card-footer">
            <Calendar size={12} strokeWidth={2.25} aria-hidden />
            {activity
              ? `Last activity ${formatDisplayDate(activity)}`
              : 'No activity yet'}
          </p>
        </aside>

        <div className="pd-client-detail__main">
          <nav
            className="pd-tabs__list pd-admin__detail-tabs"
            aria-label="Agency sections"
          >
            {SECTIONS.map((section) => {
              const Icon = section.icon
              return (
                <NavLink
                  key={section.to}
                  to={adminAgencyPath(tenant.id, section.to)}
                  className={({ isActive }) =>
                    cx('pd-tabs__tab', isActive && 'is-selected')
                  }
                >
                  <Icon size={15} strokeWidth={2.25} aria-hidden />
                  {section.label}
                </NavLink>
              )
            })}
          </nav>
          <Outlet />
        </div>
      </div>
    </div>
  )
}
