import { Link, useNavigate } from 'react-router-dom'
import {
  Activity,
  Building2,
  PauseCircle,
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
import { useTenantMembers } from '@/lib/tenantMembersStore'
import { useTenants } from '@/lib/tenantsStore'
import { StatCards, type StatCardItem } from '@/components/StatCards'
import {
  Badge,
  Button,
  PageHeader,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  type BadgeVariant,
} from '@/components/ui'
import type { BillingInvoice } from '@/types/billing'
import type { TenantStatus } from '@/types/tenant'
import '@/styles/layout-admin.css'

function statusBadgeVariant(status: TenantStatus): BadgeVariant {
  if (status === 'active') return 'completed'
  if (status === 'trial') return 'pending'
  return 'danger'
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

  const active = tenants.filter((t) => t.status === 'active').length
  const trial = tenants.filter((t) => t.status === 'trial').length
  const suspended = tenants.filter((t) => t.status === 'suspended').length
  const activePeople = members.filter((m) => m.status === 'active').length

  const cards: StatCardItem[] = [
    {
      id: 'agencies',
      label: 'Agencies',
      value: String(tenants.length),
      hint: `${active} active`,
      icon: Building2,
      tone: 'brand',
    },
    {
      id: 'trial',
      label: 'On trial',
      value: String(trial),
      hint: 'Needs attention soon',
      icon: Timer,
      tone: trial > 0 ? 'warning' : 'muted',
    },
    {
      id: 'suspended',
      label: 'Suspended',
      value: String(suspended),
      hint: 'Cannot sign in',
      icon: PauseCircle,
      tone: suspended > 0 ? 'warning' : 'muted',
    },
    {
      id: 'people',
      label: 'Active people',
      value: String(activePeople),
      hint: 'Agency users',
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

  return (
    <div className="pd-page pd-admin" aria-label="Platform overview">
      <PageHeader
        title="Platform"
        description="Platform pulse: agencies that need attention and shortcuts into daily ops."
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => navigate(ADMIN_AGENCIES)}
            >
              All agencies
            </Button>
            <Button onClick={() => navigate(`${ADMIN_AGENCIES}?new=1`)}>
              Add agency
            </Button>
          </>
        }
      />

      <StatCards label="Platform metrics" cards={cards} />

      <section
        className="pd-admin__panel"
        aria-labelledby="admin-billing-queue-title"
      >
        <header className="pd-admin__panel-header">
          <div>
            <h2 id="admin-billing-queue-title" className="pd-admin__panel-title">
              Billing queue
            </h2>
            <p className="pd-admin__panel-desc">
              Self-serve checkouts and payments waiting for confirmation. Paid
              Paymently invoices activate automatically; mark paid only for
              manual settlements.
            </p>
          </div>
        </header>
        {billingError ? (
          <p className="pd-admin__quiet" role="alert">
            {billingError}
          </p>
        ) : null}
        {pendingInvoices.length === 0 ? (
          <p className="pd-admin__quiet">No open or pending invoices.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agency</TableHead>
                <TableHead>Plan / note</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead aria-label="Actions" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingInvoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell>
                    <Link
                      className="pd-admin__business-name"
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
                          ? 'pending'
                          : 'in-progress'
                      }
                    >
                      {invoiceStatusLabel(invoice.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(invoice.createdAt)}</TableCell>
                  <TableCell>
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          navigate(adminAgencyPath(invoice.tenantId))
                        }
                      >
                        Open
                      </Button>
                      {invoice.status === 'pending_review' ? (
                        <Button
                          size="sm"
                          disabled={billingBusyId === invoice.id}
                          onClick={() => void markPaid(invoice.id)}
                        >
                          Mark paid
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      <section className="pd-admin__panel" aria-labelledby="admin-attention-title">
        <header className="pd-admin__panel-header">
          <div>
            <h2 id="admin-attention-title" className="pd-admin__panel-title">
              Needs attention
            </h2>
            <p className="pd-admin__panel-desc">
              Trials and suspended agencies. Open an agency to manage status or
              enter Support Mode.
            </p>
          </div>
        </header>
        {attention.length === 0 ? (
          <p className="pd-admin__quiet">All agencies look healthy.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agency</TableHead>
                <TableHead>Status</TableHead>
                <TableHead aria-label="Open" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {attention.map((tenant) => (
                <TableRow key={tenant.id}>
                  <TableCell>
                    <Link
                      className="pd-admin__business-name"
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
                      variant="secondary"
                      size="sm"
                      onClick={() => navigate(adminAgencyPath(tenant.id))}
                    >
                      Open
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      <section className="pd-admin__shortcuts" aria-label="Shortcuts">
        <Link className="pd-admin__shortcut" to={ADMIN_PEOPLE}>
          <Users size={18} aria-hidden />
          <span>
            <strong>People</strong>
            <span>Find any login across agencies</span>
          </span>
        </Link>
        <Link className="pd-admin__shortcut" to={ADMIN_ACTIVITY}>
          <Activity size={18} aria-hidden />
          <span>
            <strong>Activity</strong>
            <span>Audit log</span>
          </span>
        </Link>
        <Link className="pd-admin__shortcut" to={ADMIN_PLANS}>
          <Building2 size={18} aria-hidden />
          <span>
            <strong>Plans</strong>
            <span>Subscription catalog</span>
          </span>
        </Link>
        <Link className="pd-admin__shortcut" to={ADMIN_ADMINS}>
          <Users size={18} aria-hidden />
          <span>
            <strong>Admins</strong>
            <span>Platform operators</span>
          </span>
        </Link>
      </section>
    </div>
  )
}
