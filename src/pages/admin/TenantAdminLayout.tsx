import { NavLink, Navigate, Outlet, useParams } from 'react-router-dom'
import {
  Badge,
  Breadcrumbs,
  PageHeader,
  type BadgeVariant,
} from '@/components/ui'
import { useAuth } from '@/lib/auth'
import { useTenantById } from '@/lib/tenantsStore'
import { cx } from '@/lib/cx'
import type { TenantStatus } from '@/types/tenant'
import '@/styles/layout-admin.css'

const SECTIONS = [
  { to: 'overview', label: 'Overview' },
  { to: 'users', label: 'Users' },
] as const

function statusBadgeVariant(status: TenantStatus): BadgeVariant {
  if (status === 'active') return 'completed'
  if (status === 'trial') return 'pending'
  return 'danger'
}

export default function TenantAdminLayout() {
  const { user } = useAuth()
  const { tenantId } = useParams()
  const tenant = useTenantById(tenantId ?? '')

  if (user?.role !== 'platform_admin') {
    return null
  }

  if (!tenant) {
    return <Navigate to="/admin/tenants" replace />
  }

  return (
    <div className="pd-page pd-admin" aria-label={tenant.name}>
      <Breadcrumbs
        items={[
          { label: 'Businesses', href: '/admin/tenants' },
          { label: tenant.name },
        ]}
      />
      <PageHeader
        title={tenant.name}
        description={tenant.slug}
        actions={
          <Badge variant={statusBadgeVariant(tenant.status)}>
            {tenant.status}
          </Badge>
        }
      />
      <nav className="pd-admin__subnav" aria-label="Business sections">
        {SECTIONS.map((section) => (
          <NavLink
            key={section.to}
            to={`/admin/tenants/${tenant.id}/${section.to}`}
            className={({ isActive }) =>
              cx('pd-admin__subnav-link', isActive && 'is-active')
            }
          >
            {section.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  )
}
