import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Navigate,
  Outlet,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom'
import {
  Boxes,
  CreditCard,
  LayoutDashboard,
  ScrollText,
  Users,
} from 'lucide-react'
import { useAuth } from '@/lib/auth'
import {
  ADMIN_AGENCIES,
  adminAgencyPath,
  safeSupportNextPath,
  setSupportReturnPath,
  type AdminAgencySection,
} from '@/lib/adminPaths'
import { adminPatchBilling } from '@/lib/billing/billingApi'
import { authApiConfigured } from '@/lib/billing/platformFlag'
import { useTenantMembersByTenantId } from '@/lib/tenantMembersStore'
import {
  setTenantStatus,
  updateTenantName,
  useTenantById,
} from '@/lib/tenantsStore'
import type { TenantStatus } from '@/types/tenant'
import '@/styles/layout-admin.css'
import '@/styles/layout-clients.css'
import { TenantCommandHeader } from '@/components/admin/TenantCommandHeader'
import { TenantHealthMeters } from '@/components/admin/TenantHealthMeters'
import { elevatedPageClass } from '@/components/clients/shadcnChrome'
import { SegmentedNav } from '@/components/shadcn/segmented-nav'
import { RouteErrorBoundary } from '@/layout/RouteErrorBoundary'
import { cn } from '@/lib/utils'

const SECTIONS = [
  { to: 'overview', label: 'Overview', icon: LayoutDashboard },
  { to: 'access', label: 'Access', icon: Boxes },
  { to: 'people', label: 'People', icon: Users },
  { to: 'billing', label: 'Billing', icon: CreditCard },
  { to: 'activity', label: 'Activity', icon: ScrollText },
] as const satisfies ReadonlyArray<{
  to: AdminAgencySection
  label: string
  icon: typeof LayoutDashboard
}>

function AgencySectionNav({ tenantId }: { tenantId: string }) {
  const { pathname } = useLocation()
  const active =
    SECTIONS.find((section) =>
      pathname.includes(`/agencies/${tenantId}/${section.to}`),
    )?.to ?? 'overview'

  return (
    <SegmentedNav
      aria-label="Tenant sections"
      value={active}
      items={SECTIONS.map((section) => {
        const Icon = section.icon
        return {
          id: section.to,
          to: adminAgencyPath(tenantId, section.to),
          end: section.to === 'overview',
          label: (
            <>
              <Icon size={15} strokeWidth={2.25} aria-hidden />
              {section.label}
            </>
          ),
        }
      })}
    />
  )
}

export default function TenantAdminLayout() {
  const { user, startViewAs } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { tenantId } = useParams()
  const liveTenant = useTenantById(tenantId ?? '')
  // Keep the last known agency while KV rehydrates so People sync cannot
  // bounce the admin back to the agencies list mid-open.
  const cachedTenantRef = useRef(liveTenant)
  const autoViewAsStarted = useRef(false)
  if (liveTenant) {
    cachedTenantRef.current = liveTenant
  } else if (cachedTenantRef.current?.id !== tenantId) {
    cachedTenantRef.current = undefined
  }
  const tenant = liveTenant ?? cachedTenantRef.current
  const members = useTenantMembersByTenantId(tenantId ?? '')
  const [supportBusy, setSupportBusy] = useState(false)
  const [supportError, setSupportError] = useState<string | undefined>()

  const owner =
    members.find((m) => m.role === 'owner' && m.status === 'active') ??
    members.find((m) => m.role === 'manager' && m.status === 'active') ??
    members.find((m) => m.status === 'active')

  const openAgencyAsOwner = useCallback(
    async (nextPath: string) => {
      if (!tenant) return
      if (!owner) {
        setSupportError('Add an active owner before opening Support Mode.')
        return
      }
      setSupportError(undefined)
      setSupportBusy(true)
      try {
        setSupportReturnPath(adminAgencyPath(tenant.id, 'overview'))
        await startViewAs({
          userId: owner.id,
          email: owner.email,
          name: owner.name,
          role: 'agency_user',
          tenantId: tenant.id,
        })
        navigate(nextPath, { replace: true })
      } catch (error) {
        setSupportError(
          error instanceof Error
            ? error.message
            : 'Could not start Support Mode.',
        )
      } finally {
        setSupportBusy(false)
      }
    },
    [navigate, owner, startViewAs, tenant],
  )

  useEffect(() => {
    if (user?.role !== 'platform_admin') return
    if (searchParams.get('viewAs') !== '1') return
    if (!tenant || !owner || autoViewAsStarted.current || supportBusy) return

    autoViewAsStarted.current = true
    const nextPath = safeSupportNextPath(searchParams.get('next')) ?? '/'
    const cleaned = new URLSearchParams(searchParams)
    cleaned.delete('viewAs')
    cleaned.delete('next')
    setSearchParams(cleaned, { replace: true })
    void openAgencyAsOwner(nextPath)
  }, [
    openAgencyAsOwner,
    owner,
    searchParams,
    setSearchParams,
    supportBusy,
    tenant,
    user?.role,
  ])

  if (user?.role !== 'platform_admin') {
    return null
  }

  if (!tenant) {
    return <Navigate to={ADMIN_AGENCIES} replace />
  }

  const handleStatusChange = (status: TenantStatus) => {
    setTenantStatus(tenant.id, status)
    if (authApiConfigured()) {
      void adminPatchBilling(tenant.id, { billingStatus: status }).catch(() => {
        /* local status already updated */
      })
    }
  }

  return (
    <div
      className={cn(
        'pd-page pd-page--elevated pd-admin pd-admin--tenant',
        elevatedPageClass,
        'mx-auto w-full max-w-[80rem] gap-3',
      )}
      data-elevated-canvas
      aria-label={tenant.name}
    >
      <TenantCommandHeader
        tenant={tenant}
        ownerName={owner?.name}
        ownerEmail={owner?.email}
        supportBusy={supportBusy}
        supportError={supportError}
        canOpenSupport={Boolean(owner)}
        onStatusChange={handleStatusChange}
        onOpenSupport={() => void openAgencyAsOwner('/')}
        onRename={(name) => {
          updateTenantName(tenant.id, name)
        }}
      />

      <TenantHealthMeters
        tenantId={tenant.id}
        moduleCount={tenant.enabledModules.length}
        onOpenBilling={() => navigate(adminAgencyPath(tenant.id, 'billing'))}
        onOpenAccess={() => navigate(adminAgencyPath(tenant.id, 'access'))}
      />

      <AgencySectionNav tenantId={tenant.id} />
      <RouteErrorBoundary label="Agency section">
        <Outlet />
      </RouteErrorBoundary>
    </div>
  )
}
