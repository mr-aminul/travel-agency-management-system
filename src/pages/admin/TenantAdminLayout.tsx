import { useCallback, useEffect, useRef, useState } from 'react'
import {
  NavLink,
  Navigate,
  Outlet,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom'
import {
  Boxes,
  Calendar,
  ExternalLink,
  LayoutDashboard,
  LayoutGrid,
  MessageSquareText,
  ScrollText,
  Users,
} from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { readAgencyProfile } from '@/lib/agencyProfile'
import {
  ADMIN_AGENCIES,
  adminAgencyPath,
  adminViewAsAgencyPath,
  safeSupportNextPath,
  setSupportReturnPath,
} from '@/lib/adminPaths'
import { clientPath } from '@/lib/workPaths'
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
import type { TenantStatus } from '@/types/tenant'
import '@/styles/layout-admin.css'
import '@/styles/layout-clients.css'
import { AdminTenantBillingPanel } from '@/components/admin/AdminTenantBillingPanel'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/shadcn/avatar'
import { Button } from '@/components/shadcn/button'
import { SegmentedNav } from '@/components/shadcn/segmented-nav'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shadcn/select'

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

const STATUS_OPTIONS: { value: TenantStatus; label: string }[] = [
  { value: 'trial', label: 'Trial' },
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
]

const statusTriggerClass = 'h-8 w-[7.5rem] rounded-lg'

const SECTIONS = [
  { to: 'all', label: 'All', icon: LayoutGrid },
  { to: 'overview', label: 'Overview', icon: LayoutDashboard },
  { to: 'people', label: 'People', icon: Users },
  { to: 'product', label: 'Product', icon: Boxes },
  { to: 'messaging', label: 'SMS / Email', icon: MessageSquareText },
  { to: 'activity', label: 'Activity', icon: ScrollText },
] as const

function AgencySectionNav({ tenantId }: { tenantId: string }) {
  const { pathname } = useLocation()
  const active =
    SECTIONS.find((section) =>
      pathname.includes(`/agencies/${tenantId}/${section.to}`),
    )?.to ?? 'all'

  return (
    <SegmentedNav
      aria-label="Agency sections"
      value={active}
      items={SECTIONS.map((section) => {
        const Icon = section.icon
        return {
          id: section.to,
          to: adminAgencyPath(tenantId, section.to),
          end: section.to === 'all',
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
        setSupportReturnPath(adminAgencyPath(tenant.id, 'all'))
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

  const activeUsers = members.filter((member) => member.status === 'active').length
  const clientCount = countClientsForTenant(tenant.id)
  const caseCount = countCasesForTenant(tenant.id)
  const paymentCount = countPaymentsForTenant(tenant.id)
  const activity = latestActivity(tenant.id)
  const clientHref = adminViewAsAgencyPath(tenant.id, clientPath('c-284'))

  const handleOpenAgency = () => {
    void openAgencyAsOwner('/')
  }

  return (
    <div
      className="pd-page pd-client-detail pd-admin pd-admin--tenant"
      aria-label={tenant.name}
    >
      <div className="pd-client-detail__layout">
        <aside className="pd-client-detail__card" aria-label="Agency">
          <div className="pd-client-detail__card-identity">
            <Avatar size="lg" className="size-16">
              <AvatarImage
                src={readAgencyProfile(tenant.id).profilePicture ?? undefined}
                alt=""
              />
              <AvatarFallback>{initials(tenant.name)}</AvatarFallback>
            </Avatar>
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
              {supportBusy ? 'Opening…' : 'Open Agency'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={supportBusy || !owner}
              asChild
            >
              <NavLink to={clientHref}>
                <ExternalLink size={14} strokeWidth={2.25} aria-hidden />
                Open Client
              </NavLink>
            </Button>
            <Select
              value={tenant.status}
              onValueChange={(next) => {
                const status = next as TenantStatus
                setTenantStatus(tenant.id, status)
                if (authApiConfigured()) {
                  void adminPatchBilling(tenant.id, {
                    billingStatus: status,
                  }).catch(() => {
                    /* local status already updated */
                  })
                }
              }}
            >
              <SelectTrigger
                aria-label="Status"
                className={statusTriggerClass}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {supportError ? (
              <p className="m-0 text-sm text-destructive" role="alert">
                {supportError}
              </p>
            ) : null}
          </div>

          <dl className="pd-client-detail__card-fields">
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

        <div className="pd-client-detail__main flex min-w-0 flex-col gap-4">
          <AgencySectionNav tenantId={tenant.id} />
          <Outlet />
        </div>
      </div>
    </div>
  )
}
