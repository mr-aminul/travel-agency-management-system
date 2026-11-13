import { useCallback, useEffect, useState, type ReactNode } from 'react'
import {
  Activity,
  Boxes,
  CalendarPlus,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Eye,
  Inbox,
  Mail,
  MessageSquareText,
  PauseCircle,
  Plus,
  Receipt,
  UsersRound,
  type LucideIcon,
} from 'lucide-react'
import { PlatformAuditFeed } from '@/components/admin/PlatformAuditFeed'
import { LabeledSwitch } from '@/components/clients/LabeledSwitch'
import { Avatar, AvatarFallback } from '@/components/shadcn/avatar'
import { Badge } from '@/components/shadcn/badge'
import { Button } from '@/components/shadcn/button'
import {
  adminExtendTrial,
  adminFetchTenantBilling,
  adminMarkInvoicePaid,
  adminPatchBilling,
} from '@/lib/billing/billingApi'
import { formatBdt, formatDate, statusLabel } from '@/lib/billing/format'
import { authApiConfigured } from '@/lib/billing/platformFlag'
import { TENANT_BILLING_CHANGED_EVENT } from '@/lib/billing/billingEvents'
import { formatDisplayDate } from '@/lib/formatDate'
import { MODULE_GROUPS } from '@/lib/modules'
import { iconForModule, labelForModule } from '@/lib/moduleIcons'
import {
  listPlatformAudit,
  type PlatformAuditEntry,
} from '@/lib/platformAdminApi'
import {
  setTenantModuleEnabled,
  setTenantStatus,
} from '@/lib/tenantsStore'
import { cn } from '@/lib/utils'
import type { BillingSnapshot } from '@/types/billing'
import type {
  ModuleId,
  Tenant,
  TenantMember,
  TenantMemberStatus,
} from '@/types/tenant'

const ACCESS_PREVIEW = 10
const panelActionClass = 'h-8 gap-1.5 rounded-lg px-2.5 text-xs shadow-xs'

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase()
}

export type TenantOpsOverviewProps = {
  tenant: Tenant
  members: TenantMember[]
  onAddPeople: () => void
  onOpenAccess: () => void
  onOpenPeople: () => void
  onOpenBilling: () => void
  onOpenActivity: () => void
  onViewAs: (member: TenantMember) => void
}

function roleLabel(role: TenantMember['role']): string {
  if (role === 'owner') return 'Owner'
  if (role === 'manager') return 'Manager'
  return 'Staff'
}

function memberStatusLabel(status: TenantMemberStatus): string {
  if (status === 'active') return 'Active'
  if (status === 'invited') return 'Invited'
  return 'Disabled'
}

function SectionShell({
  title,
  icon: Icon,
  onOpen,
  action,
  children,
  empty,
  emptyAction,
  bodyClassName,
}: {
  title: string
  icon: LucideIcon
  onOpen: () => void
  action?: ReactNode
  children: ReactNode
  empty?: boolean
  emptyAction?: ReactNode
  bodyClassName?: string
}) {
  return (
    <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3.5 py-2.5">
        <button
          type="button"
          className="group flex min-w-0 items-center gap-2 rounded-md text-left transition-colors hover:text-foreground"
          onClick={onOpen}
          aria-label={`View all ${title.toLowerCase()}`}
        >
          <span
            className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-[var(--color-theme-subtle)] text-[var(--color-theme-ink)]"
            aria-hidden
          >
            <Icon size={15} strokeWidth={2.25} />
          </span>
          <h2 className="m-0 text-sm font-semibold">{title}</h2>
          <ChevronRight
            size={14}
            strokeWidth={2.25}
            className="shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
            aria-hidden
          />
        </button>
        {action ? (
          <div className="flex shrink-0 items-center gap-1.5">{action}</div>
        ) : null}
      </div>
      {empty ? (
        <div className="flex flex-col items-center gap-2.5 px-3.5 py-7 text-center">
          <span
            className="inline-flex size-9 items-center justify-center rounded-full bg-muted text-muted-foreground"
            aria-hidden
          >
            <Inbox size={16} strokeWidth={2} />
          </span>
          <p className="m-0 text-sm text-muted-foreground">None Yet</p>
          {emptyAction}
        </div>
      ) : (
        <div className={bodyClassName ?? 'p-3.5'}>{children}</div>
      )}
    </section>
  )
}

function MoneyTile({
  label,
  value,
  hint,
  tone = 'default',
  onClick,
}: {
  label: string
  value: string
  hint?: string
  tone?: 'default' | 'due' | 'ok'
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex min-h-[6.5rem] flex-col justify-between rounded-xl border border-border bg-card p-4 text-left shadow-sm transition-colors hover:bg-muted/30',
        tone === 'due' && 'border-destructive/30 bg-destructive/[0.04]',
        tone === 'ok' && 'border-emerald-500/25 bg-emerald-500/[0.04]',
      )}
    >
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span
        className={cn(
          'mt-2 text-2xl font-semibold tracking-tight tabular-nums',
          tone === 'due' && 'text-destructive',
          tone === 'ok' && 'text-emerald-700',
        )}
      >
        {value}
      </span>
      {hint ? (
        <span className="mt-1 text-xs text-muted-foreground">{hint}</span>
      ) : null}
    </button>
  )
}

function catalogPreview(): ModuleId[] {
  const all = MODULE_GROUPS.flatMap((group) => group.modules.map((m) => m.id))
  return all.slice(0, ACCESS_PREVIEW)
}

export function TenantOpsOverview({
  tenant,
  members,
  onAddPeople,
  onOpenAccess,
  onOpenPeople,
  onOpenBilling,
  onOpenActivity,
  onViewAs,
}: TenantOpsOverviewProps) {
  const [snapshot, setSnapshot] = useState<BillingSnapshot | null>(null)
  const [audit, setAudit] = useState<PlatformAuditEntry[]>([])
  const [billingBusy, setBillingBusy] = useState(false)
  const [messagingBusy, setMessagingBusy] = useState(false)
  const [viewAsBusyId, setViewAsBusyId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | undefined>()

  const reloadBilling = useCallback(async () => {
    if (!authApiConfigured()) {
      setSnapshot(null)
      return
    }
    try {
      setSnapshot(await adminFetchTenantBilling(tenant.id))
    } catch {
      // Keep last-good snapshot so a failed refresh after a toggle cannot
      // wipe money tiles / SMS controls mid-page.
    }
  }, [tenant.id])

  const reloadAudit = useCallback(async () => {
    const rows = await listPlatformAudit({ tenantId: tenant.id, limit: 40 })
    setAudit(rows.slice(0, 40))
  }, [tenant.id])

  useEffect(() => {
    void reloadBilling()
    void reloadAudit()
  }, [reloadBilling, reloadAudit])

  useEffect(() => {
    const onBillingChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ tenantId?: string }>).detail
      if (detail?.tenantId && detail.tenantId !== tenant.id) return
      void reloadBilling()
    }
    window.addEventListener(TENANT_BILLING_CHANGED_EVENT, onBillingChanged)
    return () => {
      window.removeEventListener(TENANT_BILLING_CHANGED_EVENT, onBillingChanged)
    }
  }, [reloadBilling, tenant.id])

  const notifyBillingChanged = () => {
    window.dispatchEvent(
      new CustomEvent(TENANT_BILLING_CHANGED_EVENT, {
        detail: { tenantId: tenant.id },
      }),
    )
  }

  const runBilling = async (fn: () => Promise<unknown>) => {
    setBillingBusy(true)
    setActionError(undefined)
    try {
      await fn()
      await reloadBilling()
      notifyBillingChanged()
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : 'Billing action failed.',
      )
    } finally {
      setBillingBusy(false)
    }
  }

  const setChannel = async (channel: 'sms' | 'email', enabled: boolean) => {
    if (!authApiConfigured()) return
    setMessagingBusy(true)
    setActionError(undefined)
    try {
      await adminPatchBilling(
        tenant.id,
        channel === 'sms' ? { smsEnabled: enabled } : { emailEnabled: enabled },
      )
      await reloadBilling()
      notifyBillingChanged()
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : 'Could not update messaging.',
      )
    } finally {
      setMessagingBusy(false)
    }
  }

  const handleViewAs = async (member: TenantMember) => {
    setViewAsBusyId(member.id)
    setActionError(undefined)
    try {
      await onViewAs(member)
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : 'Could not start View as.',
      )
      setViewAsBusyId(null)
    }
  }

  const recentPeople = [...members]
    .sort((a, b) => {
      const rank = (status: TenantMemberStatus) =>
        status === 'active' ? 0 : status === 'invited' ? 1 : 2
      const byStatus = rank(a.status) - rank(b.status)
      if (byStatus !== 0) return byStatus
      return a.name.localeCompare(b.name)
    })
    .slice(0, 6)

  const enabled = new Set(tenant.enabledModules)
  const accessIds = catalogPreview()
  const moreAccess = Math.max(
    0,
    MODULE_GROUPS.reduce((n, g) => n + g.modules.length, 0) - accessIds.length,
  )
  const enabledCount = tenant.enabledModules.length

  const billing = snapshot?.billing
  const billingStatus = billing?.billingStatus ?? tenant.status
  const planName = snapshot?.plan?.name ?? billing?.planId ?? '—'
  const price = snapshot?.plan?.priceBdt
  const period =
    billing?.billingStatus === 'trial'
      ? formatDate(billing.trialEndsAt)
      : formatDate(billing?.currentPeriodEnd)
  const invoiceRows = Array.isArray(snapshot?.invoices) ? snapshot.invoices : []
  const invoices = [...invoiceRows].sort((a, b) => {
    const aAt = new Date(a.paidAt || a.createdAt || 0).getTime()
    const bAt = new Date(b.paidAt || b.createdAt || 0).getTime()
    return bAt - aAt
  })
  const paidTotal = invoices
    .filter((invoice) => invoice.status === 'paid')
    .reduce((sum, invoice) => sum + invoice.amountBdt, 0)
  const unpaidTotal = invoices
    .filter(
      (invoice) =>
        invoice.status === 'open' || invoice.status === 'pending_review',
    )
    .reduce((sum, invoice) => sum + invoice.amountBdt, 0)
  const dueInvoices = invoices
    .filter(
      (invoice) =>
        invoice.status === 'open' || invoice.status === 'pending_review',
    )
    .slice(0, 3)

  const smsOn = billing?.smsEnabled !== false
  const emailOn = billing?.emailEnabled !== false
  const apiOn = authApiConfigured()

  return (
    <div className="flex flex-col gap-4" aria-label="Overview">
      {actionError ? (
        <p className="m-0 text-sm text-destructive" role="alert">
          {actionError}
        </p>
      ) : null}

      {/* Money + plan — dashboard tiles, not a list */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MoneyTile
          label="Paid so far"
          value={snapshot ? formatBdt(paidTotal) : '—'}
          hint={snapshot ? `${invoices.filter((i) => i.status === 'paid').length} invoices` : 'Load billing'}
          tone="ok"
          onClick={onOpenBilling}
        />
        <MoneyTile
          label="Unpaid"
          value={snapshot ? formatBdt(unpaidTotal) : '—'}
          hint={unpaidTotal > 0 ? 'Needs review' : 'Nothing due'}
          tone={unpaidTotal > 0 ? 'due' : 'default'}
          onClick={onOpenBilling}
        />
        <div className="flex min-h-[6.5rem] flex-col justify-between rounded-xl border border-border bg-card p-4 shadow-sm sm:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="m-0 text-xs font-medium text-muted-foreground">
                Plan
              </p>
              <p className="mt-1 m-0 truncate text-lg font-semibold">
                {snapshot ? planName : '—'}
              </p>
              <p className="mt-0.5 m-0 text-xs text-muted-foreground">
                {snapshot
                  ? price != null
                    ? `${formatBdt(price)}/${snapshot.plan?.interval === 'year' ? 'yr' : 'mo'} · ${period}`
                    : period
                  : 'Open Billing for plan and invoices'}
              </p>
            </div>
            <Badge variant="outline">
              {statusLabel(String(billingStatus))}
            </Badge>
          </div>
          {snapshot ? (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className={panelActionClass}
                disabled={billingBusy}
                onClick={() =>
                  void runBilling(() => adminExtendTrial(tenant.id, 14))
                }
              >
                <CalendarPlus size={13} strokeWidth={2.25} aria-hidden />
                +14d
              </Button>
              {billingStatus === 'suspended' ? (
                <Button
                  type="button"
                  size="sm"
                  className={panelActionClass}
                  disabled={billingBusy}
                  onClick={() =>
                    void runBilling(async () => {
                      await adminPatchBilling(tenant.id, {
                        billingStatus: 'active',
                      })
                      setTenantStatus(tenant.id, 'active')
                    })
                  }
                >
                  <CheckCircle2 size={13} strokeWidth={2.25} aria-hidden />
                  Activate
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  className={panelActionClass}
                  disabled={billingBusy}
                  onClick={() =>
                    void runBilling(async () => {
                      await adminPatchBilling(tenant.id, {
                        billingStatus: 'suspended',
                      })
                      setTenantStatus(tenant.id, 'suspended')
                    })
                  }
                >
                  <PauseCircle size={13} strokeWidth={2.25} aria-hidden />
                  Suspend
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className={panelActionClass}
                onClick={onOpenBilling}
              >
                <CreditCard size={13} strokeWidth={2.25} aria-hidden />
                Billing
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      {dueInvoices.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {dueInvoices.map((invoice) => (
            <div
              key={invoice.id}
              className="inline-flex items-center gap-2 rounded-full border border-destructive/25 bg-destructive/[0.04] py-1.5 pr-1.5 pl-3"
            >
              <Receipt
                size={13}
                strokeWidth={2.25}
                className="text-destructive"
                aria-hidden
              />
              <span className="text-sm font-medium tabular-nums">
                {formatBdt(invoice.amountBdt)}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatDisplayDate(invoice.createdAt)}
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 rounded-full px-2.5 text-xs"
                disabled={billingBusy}
                onClick={() =>
                  void runBilling(() => adminMarkInvoicePaid(invoice.id))
                }
              >
                Mark paid
              </Button>
            </div>
          ))}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* People — compact list scans faster than cards */}
        <SectionShell
          title="People"
          icon={UsersRound}
          onOpen={onOpenPeople}
          empty={recentPeople.length === 0}
          emptyAction={
            <Button
              type="button"
              size="sm"
              className={panelActionClass}
              onClick={onAddPeople}
            >
              <Plus data-icon="inline-start" aria-hidden />
              Add
            </Button>
          }
          action={
            recentPeople.length === 0 ? undefined : (
              <Button
                type="button"
                size="sm"
                className={panelActionClass}
                onClick={onAddPeople}
              >
                <Plus data-icon="inline-start" aria-hidden />
                Add
              </Button>
            )
          }
          bodyClassName="divide-y divide-border p-0"
        >
          <ul className="m-0 flex list-none flex-col p-0">
            {recentPeople.map((member) => (
              <li
                key={member.id}
                className="m-0 flex items-center gap-2.5 px-3.5 py-2.5"
              >
                <Avatar className="size-8 shrink-0 rounded-lg after:rounded-lg">
                  <AvatarFallback className="rounded-lg text-[0.65rem] font-semibold">
                    {initials(member.name)}
                  </AvatarFallback>
                </Avatar>
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={onOpenPeople}
                >
                  <span className="block truncate text-sm font-medium">
                    {member.name}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                    {roleLabel(member.role)} · {member.email}
                  </span>
                </button>
                <Badge
                  variant={
                    member.status === 'active'
                      ? 'default'
                      : member.status === 'disabled'
                        ? 'destructive'
                        : 'outline'
                  }
                  className="shrink-0"
                >
                  {memberStatusLabel(member.status)}
                </Badge>
                {member.status === 'active' ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 shrink-0 rounded-lg px-2 text-xs"
                    disabled={viewAsBusyId === member.id}
                    onClick={() => void handleViewAs(member)}
                  >
                    <Eye size={12} strokeWidth={2.25} aria-hidden />
                    {viewAsBusyId === member.id ? '…' : 'View'}
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        </SectionShell>

        {/* Access — switch list for modules; tiles for channels */}
        <SectionShell
          title="Access"
          icon={Boxes}
          onOpen={onOpenAccess}
          action={
            <span className="text-xs tabular-nums text-muted-foreground">
              {enabledCount} on
            </span>
          }
          bodyClassName="flex flex-col gap-0 p-0"
        >
          <ul className="m-0 flex list-none flex-col divide-y divide-border p-0">
            {accessIds.map((moduleId) => {
              const checked = enabled.has(moduleId)
              const Icon = iconForModule(moduleId)
              return (
                <li
                  key={moduleId}
                  className="m-0 flex items-center justify-between gap-3 px-3.5 py-2"
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span
                      className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"
                      aria-hidden
                    >
                      <Icon size={14} strokeWidth={2} />
                    </span>
                    <span className="min-w-0 truncate text-sm font-medium">
                      {labelForModule(moduleId)}
                    </span>
                  </span>
                  <LabeledSwitch
                    label={labelForModule(moduleId)}
                    className="shrink-0 [&>span:last-child]:sr-only"
                    offDanger
                    checked={checked}
                    onChange={(event) => {
                      setTenantModuleEnabled(
                        tenant.id,
                        moduleId,
                        event.target.checked,
                      )
                    }}
                  />
                </li>
              )
            })}
            {moreAccess > 0 ? (
              <li className="m-0 p-0">
                <button
                  type="button"
                  className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-muted-foreground transition-colors hover:bg-muted/40"
                  onClick={onOpenAccess}
                >
                  +{moreAccess} more
                </button>
              </li>
            ) : null}
          </ul>
          <div className="grid grid-cols-2 gap-2 border-t border-border p-3">
            <div className="flex items-center justify-between gap-2 rounded-xl border border-border px-3 py-2.5">
              <span className="flex min-w-0 items-center gap-2">
                <MessageSquareText
                  size={14}
                  strokeWidth={2}
                  className="shrink-0 text-muted-foreground"
                  aria-hidden
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium">SMS</span>
                  {snapshot ? (
                    <span className="block text-[0.65rem] tabular-nums text-muted-foreground">
                      {snapshot.usage?.smsSent ?? 0}/
                      {snapshot.limits?.smsLimit ?? 0}
                    </span>
                  ) : null}
                </span>
              </span>
              <LabeledSwitch
                label="SMS"
                className="shrink-0 [&>span:last-child]:sr-only"
                offDanger
                checked={smsOn}
                disabled={!apiOn || messagingBusy || !snapshot}
                onChange={(event) => {
                  void setChannel('sms', event.target.checked)
                }}
              />
            </div>
            <div className="flex items-center justify-between gap-2 rounded-xl border border-border px-3 py-2.5">
              <span className="flex items-center gap-2">
                <Mail
                  size={14}
                  strokeWidth={2}
                  className="shrink-0 text-muted-foreground"
                  aria-hidden
                />
                <span className="text-sm font-medium">Email</span>
              </span>
              <LabeledSwitch
                label="Email"
                className="shrink-0 [&>span:last-child]:sr-only"
                offDanger
                checked={emailOn}
                disabled={!apiOn || messagingBusy || !snapshot}
                onChange={(event) => {
                  void setChannel('email', event.target.checked)
                }}
              />
            </div>
          </div>
          {!apiOn ? (
            <p className="m-0 border-t border-border px-3.5 py-2 text-xs text-muted-foreground">
              SMS / Email need the platform API
            </p>
          ) : null}
        </SectionShell>
      </div>

      {/* Recent Activity — same pattern as client hub */}
      <section
        className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm"
        aria-label="Recent activity"
      >
        <div className="flex items-center justify-between gap-2 border-b border-border px-3.5 py-2.5">
          <button
            type="button"
            className="group flex min-w-0 items-center gap-2 rounded-md text-left transition-colors hover:text-foreground"
            onClick={onOpenActivity}
            aria-label="View all activity"
          >
            <span
              className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-[var(--color-theme-subtle)] text-[var(--color-theme-ink)]"
              aria-hidden
            >
              <Activity size={15} strokeWidth={2.25} />
            </span>
            <h2 className="m-0 text-sm font-semibold">Recent Activity</h2>
            <ChevronRight
              size={14}
              strokeWidth={2.25}
              className="shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
              aria-hidden
            />
          </button>
        </div>

        <PlatformAuditFeed
          rows={audit}
          onRowClick={() => onOpenActivity()}
        />
      </section>
    </div>
  )
}
