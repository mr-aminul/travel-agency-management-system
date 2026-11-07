import { Link, useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  Building2,
  CreditCard,
  PauseCircle,
  Receipt,
  ScrollText,
  Shield,
  Timer,
  Users,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import {
  ADMIN_ACTIVITY,
  ADMIN_AGENCIES,
  ADMIN_PEOPLE,
  ADMIN_PLANS,
  ADMIN_ADMINS,
  adminAgencyPath,
} from '@/lib/adminPaths'
import {
  adminListBilling,
  adminMarkInvoicePaid,
} from '@/lib/billing/billingApi'
import { formatBdt, formatDate } from '@/lib/billing/format'
import { authApiConfigured } from '@/lib/billing/platformFlag'
import { repairTenantIsolation } from '@/lib/platformAdminApi'
import { useTenantMembers } from '@/lib/tenantMembersStore'
import { useTenants } from '@/lib/tenantsStore'
import {
  adminBusinessNameClass,
  adminCountClass,
  adminPanelClass,
  adminPanelHeaderClass,
  adminPanelTitleClass,
  adminQuietClass,
  adminShortcutClass,
  adminShortcutIconClass,
  adminShortcutsClass,
  chromeHeadClass,
  elevatedPageClass,
  tableShellClass,
} from '@/components/admin/adminChrome'
import { cn } from '@/lib/utils'
import { StatCards, type StatCardItem } from '@/components/StatCards'
import { Badge } from '@/components/shadcn/badge'
import { Button } from '@/components/shadcn/button'
import { PageHeader } from '@/components/shadcn/page-header'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/shadcn/table'
import type { BillingInvoice } from '@/types/billing'
import type { TenantStatus } from '@/types/tenant'
import '@/styles/layout-admin.css'
import '@/styles/layout-clients.css'

function statusBadgeVariant(
  status: TenantStatus,
): 'default' | 'secondary' | 'destructive' {
  if (status === 'active') return 'default'
  if (status === 'trial') return 'secondary'
  return 'destructive'
}

function invoiceStatusLabel(status: BillingInvoice['status']): string {
  if (status === 'pending_review') return 'Awaiting review'
  if (status === 'open') return 'Checkout open'
  return status
}

export default function AdminOverviewPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const tenants = useTenants()
  const members = useTenantMembers()
  const [pendingInvoices, setPendingInvoices] = useState<BillingInvoice[]>([])
  const [billingBusyId, setBillingBusyId] = useState<string | null>(null)
  const [billingError, setBillingError] = useState<string | null>(null)
  const [repairBusy, setRepairBusy] = useState(false)
  const [repairStatus, setRepairStatus] = useState<string | null>(null)

  useEffect(() => {
    if (user?.role !== 'platform_admin' || !authApiConfigured()) return
    let cancelled = false
    void (async () => {
      try {
        const data = await adminListBilling()
        if (!cancelled) {
          setPendingInvoices(data.pendingInvoices || [])
          setBillingError(null)
        }
      } catch (err) {
        if (!cancelled) {
          setBillingError(
            err instanceof Error ? err.message : 'Could not load billing queue.',
          )
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user?.role])

  if (user?.role !== 'platform_admin') return null

  const trial = tenants.filter((t) => t.status === 'trial').length
  const suspended = tenants.filter((t) => t.status === 'suspended').length
  const activePeople = members.filter((m) => m.status === 'active').length

  const cards: StatCardItem[] = [
    {
      id: 'agencies',
      label: 'Agencies',
      value: String(tenants.length),
      icon: Building2,
      tone: 'brand',
    },
    {
      id: 'trial',
      label: 'On trial',
      value: String(trial),
      icon: Timer,
      tone: trial > 0 ? 'warning' : 'muted',
    },
    {
      id: 'suspended',
      label: 'Suspended',
      value: String(suspended),
      icon: PauseCircle,
      tone: suspended > 0 ? 'warning' : 'muted',
    },
    {
      id: 'people',
      label: 'Active people',
      value: String(activePeople),
      icon: Users,
      tone: 'info',
    },
  ]

  const attention = tenants.filter(
    (t) => t.status === 'trial' || t.status === 'suspended',
  )

  const markPaid = async (invoiceId: string) => {
    setBillingBusyId(invoiceId)
    setBillingError(null)
    try {
      await adminMarkInvoicePaid(invoiceId)
      setPendingInvoices((current) =>
        current.filter((inv) => inv.id !== invoiceId),
      )
    } catch (err) {
      setBillingError(
        err instanceof Error ? err.message : 'Could not mark invoice paid.',
      )
    } finally {
      setBillingBusyId(null)
    }
  }

  const runIsolationRepair = async () => {
    setRepairBusy(true)
    setRepairStatus(null)
    try {
      const result = await repairTenantIsolation()
      const removed =
        (result.removedDuplicateIds ?? 0) +
        (result.removedDuplicatePhones ?? 0) +
        (result.removedDuplicateCases ?? 0) +
        (result.removedDuplicatePayments ?? 0)
      setRepairStatus(
        removed > 0
          ? `Removed ${removed} cross-agency clone(s). Exit View as and open the agency again.`
          : 'No cross-agency clones found. Isolation checks are clean.',
      )
    } catch (err) {
      setRepairStatus(
        err instanceof Error
          ? err.message
          : 'Could not repair tenant isolation.',
      )
    } finally {
      setRepairBusy(false)
    }
  }

  return (
    <div
      className={cn(elevatedPageClass, 'pd-page pd-page--elevated pd-admin')}
      data-elevated-canvas
      aria-label="Platform Overview"
    >
      <PageHeader
        title="Platform"
        actions={
          <>
            <Button
              variant="outline"
              className="h-9 rounded-lg"
              disabled={repairBusy || !authApiConfigured()}
              onClick={() => void runIsolationRepair()}
            >
              {repairBusy ? 'Repairing…' : 'Repair Data Isolation'}
            </Button>
            <Button
              variant="outline"
              className="h-9 rounded-lg"
              onClick={() => navigate(ADMIN_AGENCIES)}
            >
              All Agencies
            </Button>
            <Button
              className="h-9 rounded-lg"
              onClick={() => navigate(`${ADMIN_AGENCIES}?new=1`)}
            >
              Add Agency
            </Button>
          </>
        }
      />
      {repairStatus ? (
        <p className={adminQuietClass} role="status">
          {repairStatus}
        </p>
      ) : null}

      <StatCards label="Platform metrics" cards={cards} />

      {billingError || pendingInvoices.length > 0 ? (
      <section
        className={adminPanelClass}
        aria-labelledby="admin-billing-queue-title"
      >
        <header className={adminPanelHeaderClass}>
          <h2 id="admin-billing-queue-title" className={adminPanelTitleClass}>
            <Receipt size={16} strokeWidth={2.25} aria-hidden />
            Billing Queue
            <span className={adminCountClass}>{pendingInvoices.length}</span>
          </h2>
        </header>
        {billingError ? (
          <p className={adminQuietClass} role="alert">
            {billingError}
          </p>
        ) : null}
        {pendingInvoices.length === 0 ? null : (
          <div className={tableShellClass}>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-0">
                  <TableHead className={chromeHeadClass}>Agency</TableHead>
                  <TableHead className={chromeHeadClass}>Plan / Note</TableHead>
                  <TableHead className={chromeHeadClass}>Amount</TableHead>
                  <TableHead className={chromeHeadClass}>Status</TableHead>
                  <TableHead className={chromeHeadClass}>Created</TableHead>
                  <TableHead className={chromeHeadClass} aria-label="Actions" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingInvoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>
                      <Link
                        className={adminBusinessNameClass}
                        to={adminAgencyPath(invoice.tenantId)}
                      >
                        {invoice.agencyName || invoice.tenantId}
                      </Link>
                    </TableCell>
                    <TableCell>{invoice.description || invoice.planId || '—'}</TableCell>
                    <TableCell>{formatBdt(invoice.amountBdt)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          invoice.status === 'pending_review'
                            ? 'outline'
                            : 'secondary'
                        }
                      >
                        {invoiceStatusLabel(invoice.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(invoice.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 rounded-lg"
                          onClick={() =>
                            navigate(adminAgencyPath(invoice.tenantId))
                          }
                        >
                          Open
                        </Button>
                        {invoice.status === 'pending_review' ? (
                          <Button
                            size="sm"
                            className="h-9 rounded-lg"
                            disabled={billingBusyId === invoice.id}
                            onClick={() => void markPaid(invoice.id)}
                          >
                            Mark Paid
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
      ) : null}

      {attention.length === 0 ? null : (
      <section className={adminPanelClass} aria-labelledby="admin-attention-title">
        <header className={adminPanelHeaderClass}>
          <h2 id="admin-attention-title" className={adminPanelTitleClass}>
            <AlertTriangle size={16} strokeWidth={2.25} aria-hidden />
            Needs Attention
            <span className={adminCountClass}>{attention.length}</span>
          </h2>
        </header>
          <div className={tableShellClass}>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-0">
                  <TableHead className={chromeHeadClass}>Agency</TableHead>
                  <TableHead className={chromeHeadClass}>Status</TableHead>
                  <TableHead className={chromeHeadClass} aria-label="Open" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {attention.map((tenant) => (
                  <TableRow key={tenant.id}>
                    <TableCell>
                      <Link
                        className={adminBusinessNameClass}
                        to={adminAgencyPath(tenant.id)}
                      >
                        {tenant.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusBadgeVariant(tenant.status)}>
                        {tenant.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 rounded-lg"
                        onClick={() => navigate(adminAgencyPath(tenant.id))}
                      >
                        Open
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
      </section>
      )}

      <nav className={adminShortcutsClass} aria-label="Shortcuts">
        <Link className={adminShortcutClass} to={ADMIN_PEOPLE}>
          <span className={adminShortcutIconClass} aria-hidden>
            <Users size={22} strokeWidth={1.75} />
          </span>
          People
        </Link>
        <Link className={adminShortcutClass} to={ADMIN_ACTIVITY}>
          <span className={adminShortcutIconClass} aria-hidden>
            <ScrollText size={22} strokeWidth={1.75} />
          </span>
          Activity
        </Link>
        <Link className={adminShortcutClass} to={ADMIN_PLANS}>
          <span className={adminShortcutIconClass} aria-hidden>
            <CreditCard size={22} strokeWidth={1.75} />
          </span>
          Plans
        </Link>
        <Link className={adminShortcutClass} to={ADMIN_ADMINS}>
          <span className={adminShortcutIconClass} aria-hidden>
            <Shield size={22} strokeWidth={1.75} />
          </span>
          Admins
        </Link>
      </nav>
    </div>
  )
}
