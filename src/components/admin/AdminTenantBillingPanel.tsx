import { useCallback, useEffect, useState } from 'react'
import {
  ArrowRightLeft,
  CalendarPlus,
  CheckCircle2,
  PauseCircle,
  Receipt,
} from 'lucide-react'
import {
  adminApplyPlan,
  adminCreateInvoice,
  adminExtendTrial,
  adminFetchTenantBilling,
  adminListPlans,
  adminMarkInvoicePaid,
  adminPatchBilling,
} from '@/lib/billing/billingApi'
import {
  formatBdt,
  formatDate,
  formatStorageUsage,
} from '@/lib/billing/format'
import { authApiConfigured } from '@/lib/billing/platformFlag'
import { Button, Input, Select, Switch } from '@/components/ui'
import type { BillingSnapshot, PlanTemplate } from '@/types/billing'

type Props = {
  tenantId: string
}

/** Compact subscription block for the agency admin profile card. */
export function AdminTenantBillingPanel({ tenantId }: Props) {
  const [snapshot, setSnapshot] = useState<BillingSnapshot | null>(null)
  const [plans, setPlans] = useState<PlanTemplate[]>([])
  const [planId, setPlanId] = useState('growth')
  const [invoiceAmount, setInvoiceAmount] = useState('')
  const [billingOpen, setBillingOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const reload = useCallback(async () => {
    if (!authApiConfigured()) return
    setError(null)
    try {
      const [me, catalog] = await Promise.all([
        adminFetchTenantBilling(tenantId),
        adminListPlans(),
      ])
      setSnapshot(me)
      // Admin catalog includes non-public plans (e.g. Test/UAT).
      setPlans([...catalog.plans].sort((a, b) => a.sortOrder - b.sortOrder))
      const nextPlanId = me.billing?.planId || 'growth'
      setPlanId(nextPlanId)
      const matched = catalog.plans.find((p) => p.id === nextPlanId)
      setInvoiceAmount(
        matched ? String(matched.priceBdt) : String(me.plan?.priceBdt ?? 0),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load billing.')
    }
  }, [tenantId])

  useEffect(() => {
    void reload()
  }, [reload])

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true)
    setError(null)
    try {
      await fn()
      setBillingOpen(false)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed.')
    } finally {
      setBusy(false)
    }
  }

  if (!authApiConfigured()) {
    return <p className="pd-admin__quiet">Billing needs the platform API.</p>
  }

  if (!snapshot) {
    return <p className="pd-admin__quiet">Loading billing…</p>
  }

  const livePlanId = snapshot.billing?.planId || null
  const livePlan =
    plans.find((p) => p.id === livePlanId) ?? snapshot.plan ?? null
  const draftPlan = plans.find((p) => p.id === planId) ?? livePlan
  const billingStatus = snapshot.billing?.billingStatus ?? 'trial'
  const isDirty = Boolean(planId && livePlanId && planId !== livePlanId)
  const periodValue =
    billingStatus === 'trial'
      ? formatDate(snapshot.billing?.trialEndsAt)
      : formatDate(snapshot.billing?.currentPeriodEnd)
  const periodLabel = billingStatus === 'trial' ? 'Trial ends' : 'Renews'
  const pending = (snapshot.invoices ?? []).filter(
    (inv) => inv.status === 'pending_review' || inv.status === 'open',
  )
  const billingNotes = snapshot.billing?.billingNotes?.trim() || ''

  return (
    <div className="pd-admin__plan" aria-label="Subscription">
      {billingNotes ? (
        <p className="pd-admin__quiet" style={{ marginBottom: '0.75rem' }}>
          {billingNotes}
        </p>
      ) : null}
      <dl className="pd-client-detail__card-fields">
        <div className="pd-client-detail__card-field">
          <dt>Plan</dt>
          <dd>
            <Select
              aria-label="Plan"
              size="sm"
              value={planId}
              disabled={busy}
              options={plans.map((plan) => ({
                value: plan.id,
                label: `${plan.name} · ${formatBdt(plan.priceBdt)}`,
              }))}
              onChange={(e) => {
                const next = e.target.value
                setPlanId(next)
                const matched = plans.find((p) => p.id === next)
                if (matched) setInvoiceAmount(String(matched.priceBdt))
                setBillingOpen(false)
              }}
            />
          </dd>
        </div>
        <div className="pd-client-detail__card-field">
          <dt>Price</dt>
          <dd>{formatBdt(livePlan?.priceBdt ?? 0)}/mo</dd>
        </div>
        <div className="pd-client-detail__card-field">
          <dt>{periodLabel}</dt>
          <dd>{periodValue}</dd>
        </div>
        <div className="pd-client-detail__card-field">
          <dt>Users</dt>
          <dd>
            {snapshot.usage.seatCommit} / {snapshot.limits.userLimit}
          </dd>
        </div>
        <div className="pd-client-detail__card-field">
          <dt>SMS</dt>
          <dd>
            {snapshot.usage.smsSent} / {snapshot.limits.smsLimit}
          </dd>
        </div>
        <div className="pd-client-detail__card-field">
          <dt>SMS allowed</dt>
          <dd>
            <Switch
              label={
                snapshot.billing?.smsEnabled === false
                  ? 'Blocked by platform'
                  : 'Agency may send'
              }
              checked={snapshot.billing?.smsEnabled !== false}
              disabled={busy}
              onChange={(event) => {
                const next = event.target.checked
                void run(() =>
                  adminPatchBilling(tenantId, { smsEnabled: next }),
                )
              }}
            />
          </dd>
        </div>
        <div className="pd-client-detail__card-field">
          <dt>Agency SMS</dt>
          <dd>
            {snapshot.billing?.smsEnabled === false
              ? 'Off (platform)'
              : snapshot.billing?.agencySmsEnabled === false
                ? 'Off (their choice)'
                : 'On'}
          </dd>
        </div>
        <div className="pd-client-detail__card-field">
          <dt>Email allowed</dt>
          <dd>
            <Switch
              label={
                snapshot.billing?.emailEnabled === false
                  ? 'Blocked by platform'
                  : 'Agency may send'
              }
              checked={snapshot.billing?.emailEnabled !== false}
              disabled={busy}
              onChange={(event) => {
                const next = event.target.checked
                void run(() =>
                  adminPatchBilling(tenantId, { emailEnabled: next }),
                )
              }}
            />
          </dd>
        </div>
        <div className="pd-client-detail__card-field">
          <dt>Agency email</dt>
          <dd>
            {snapshot.billing?.emailEnabled === false
              ? 'Off (platform)'
              : snapshot.billing?.agencyEmailEnabled === false
                ? 'Off (their choice)'
                : 'On'}
          </dd>
        </div>
        <div className="pd-client-detail__card-field">
          <dt>Storage</dt>
          <dd>
            {formatStorageUsage(
              snapshot.usage.storageBytes,
              snapshot.limits.storageLimitBytes,
            )}
          </dd>
        </div>
      </dl>

      {error ? (
        <p className="pd-field__error" role="alert">
          {error}
        </p>
      ) : null}

      {isDirty ? (
        <Button
          size="sm"
          disabled={busy}
          onClick={() =>
            void run(() =>
              adminApplyPlan(tenantId, {
                planId,
                billingStatus: 'active',
                planKind: 'comp',
              }),
            )
          }
        >
          <ArrowRightLeft size={14} strokeWidth={2.25} aria-hidden />
          Switch to {draftPlan?.name}
        </Button>
      ) : billingOpen ? (
        <div className="pd-admin__plan-bill">
          <Input
            aria-label="Invoice amount BDT"
            type="number"
            min={0}
            step={1}
            value={invoiceAmount}
            onChange={(e) => setInvoiceAmount(e.target.value)}
          />
          <Button
            size="sm"
            disabled={busy}
            onClick={() => {
              const amount = Number(invoiceAmount)
              if (!Number.isFinite(amount) || amount < 0) {
                setError('Amount must be 0 or more.')
                return
              }
              void run(() =>
                adminCreateInvoice({
                  tenantId,
                  planId,
                  amountBdt: Math.round(amount),
                }),
              )
            }}
          >
            Create
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => setBillingOpen(false)}
          >
            Cancel
          </Button>
        </div>
      ) : (
        <div className="pd-admin__plan-ops" role="group" aria-label="Billing ops">
          <Button
            size="sm"
            className="pd-admin__plan-ops-btn pd-admin__plan-ops-btn--bill"
            disabled={busy}
            onClick={() => setBillingOpen(true)}
          >
            <Receipt size={13} strokeWidth={2.25} aria-hidden />
            Bill
          </Button>
          <Button
            size="sm"
            className="pd-admin__plan-ops-btn pd-admin__plan-ops-btn--trial"
            disabled={busy}
            onClick={() => void run(() => adminExtendTrial(tenantId, 14))}
          >
            <CalendarPlus size={13} strokeWidth={2.25} aria-hidden />
            +14d
          </Button>
          <Button
            size="sm"
            variant="danger"
            className="pd-admin__plan-ops-btn"
            disabled={busy || billingStatus === 'suspended'}
            onClick={() =>
              void run(() =>
                adminPatchBilling(tenantId, { billingStatus: 'suspended' }),
              )
            }
          >
            <PauseCircle size={13} strokeWidth={2.25} aria-hidden />
            Suspend
          </Button>
          <Button
            size="sm"
            className="pd-admin__plan-ops-btn pd-admin__plan-ops-btn--activate"
            disabled={busy || billingStatus !== 'suspended'}
            onClick={() =>
              void run(() =>
                adminPatchBilling(tenantId, { billingStatus: 'active' }),
              )
            }
          >
            <CheckCircle2 size={13} strokeWidth={2.25} aria-hidden />
            Activate
          </Button>
        </div>
      )}

      {pending.length > 0 ? (
        <ul className="pd-admin__billing-card-pending">
          {pending.slice(0, 2).map((inv) => (
            <li key={inv.id}>
              <span>
                <Receipt size={12} strokeWidth={2.25} aria-hidden />
                {formatBdt(inv.amountBdt)} awaiting
              </span>
              <Button
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => void run(() => adminMarkInvoicePaid(inv.id))}
              >
                Mark paid
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
