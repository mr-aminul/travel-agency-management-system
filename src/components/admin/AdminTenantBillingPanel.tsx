import { useCallback, useEffect, useState, type ReactNode } from 'react'
import {
  CreditCard,
  NotebookPen,
  type LucideIcon,
} from 'lucide-react'
import {
  adminApplyPlan,
  adminCreateInvoice,
  adminExtendTrial,
  adminFetchTenantBilling,
  adminMarkInvoicePaid,
  adminPatchBilling,
  fetchBillingPlans,
} from '@/lib/billing/billingApi'
import {
  formatBdt,
  formatDate,
  formatStorageUsage,
  statusLabel,
} from '@/lib/billing/format'
import { authApiConfigured } from '@/lib/billing/platformFlag'
import { Badge, Button, Input, Select } from '@/components/ui'
import type { BillingSnapshot, PlanTemplate } from '@/types/billing'
import '@/styles/layout-billing.css'

function SectionTitle({
  icon: Icon,
  children,
}: {
  icon: LucideIcon
  children: ReactNode
}) {
  return (
    <h2 className="pd-client-detail__section-title">
      <span className="pd-client-detail__section-icon" aria-hidden>
        <Icon size={15} strokeWidth={2.25} />
      </span>
      {children}
    </h2>
  )
}

type Props = {
  tenantId: string
}

export function AdminTenantBillingPanel({ tenantId }: Props) {
  const [snapshot, setSnapshot] = useState<BillingSnapshot | null>(null)
  const [plans, setPlans] = useState<PlanTemplate[]>([])
  const [planId, setPlanId] = useState('growth')
  const [invoiceAmount, setInvoiceAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const reload = useCallback(async () => {
    if (!authApiConfigured()) return
    setError(null)
    try {
      const [me, catalog] = await Promise.all([
        adminFetchTenantBilling(tenantId),
        fetchBillingPlans(),
      ])
      setSnapshot(me)
      setPlans(catalog.plans)
      const nextPlanId = me.billing?.planId || 'growth'
      setPlanId(nextPlanId)
      const matched = catalog.plans.find((p) => p.id === nextPlanId)
      setInvoiceAmount(
        matched ? String(matched.priceBdt) : String(me.plan?.priceBdt ?? 0),
      )
      setNotes(me.billing?.billingNotes || '')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load billing.')
    }
  }, [tenantId])

  useEffect(() => {
    void reload()
  }, [reload])

  if (!authApiConfigured()) {
    return (
      <p className="pd-admin__quiet">
        Connect the platform API to manage live billing for this agency.
      </p>
    )
  }

  const run = async (label: string, fn: () => Promise<unknown>) => {
    setBusy(true)
    setError(null)
    setStatus(null)
    try {
      await fn()
      setStatus(label)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="pd-client-detail__section pd-client-detail__section--compact">
      <div className="pd-client-detail__section-head">
        <SectionTitle icon={CreditCard}>Subscription</SectionTitle>
      </div>

      {error ? (
        <p className="pd-settings-form__status pd-settings-form__status--error" role="alert">
          {error}
        </p>
      ) : null}
      {status ? (
        <p className="pd-settings-form__status" role="status">
          {status}
        </p>
      ) : null}

      {snapshot ? (
        <div className="pd-billing-admin">
          <dl className="pd-client-detail__fields">
            <div className="pd-client-detail__field">
              <dt>Plan</dt>
              <dd>
                {snapshot.plan?.name ?? '—'}{' '}
                <Badge variant="neutral">
                  {statusLabel(snapshot.billing?.billingStatus ?? 'trial')}
                </Badge>
              </dd>
            </div>
            <div className="pd-client-detail__field">
              <dt>Trial / period</dt>
              <dd>
                {snapshot.billing?.billingStatus === 'trial'
                  ? `Ends ${formatDate(snapshot.billing.trialEndsAt)}`
                  : `Renews ${formatDate(snapshot.billing?.currentPeriodEnd)}`}
              </dd>
            </div>
            <div className="pd-client-detail__field">
              <dt>Usage</dt>
              <dd>
                {snapshot.usage.seatCommit}/{snapshot.limits.userLimit} users ·{' '}
                {snapshot.usage.subAgents}/{snapshot.limits.subAgentLimit} sub
                agents ·{' '}
                {formatStorageUsage(
                  snapshot.usage.storageBytes,
                  snapshot.limits.storageLimitBytes,
                )}{' '}
                · {snapshot.usage.smsSent}/{snapshot.limits.smsLimit} SMS
              </dd>
            </div>
          </dl>

          <div className="pd-billing-admin__row">
            <Select
              aria-label="Plan"
              value={planId}
              options={plans.map((p) => ({
                value: p.id,
                label: `${p.name} · ${formatBdt(p.priceBdt)}`,
              }))}
              onChange={(e) => {
                const next = e.target.value
                setPlanId(next)
                const matched = plans.find((p) => p.id === next)
                if (matched) setInvoiceAmount(String(matched.priceBdt))
              }}
            />
            <Input
              aria-label="Invoice amount BDT"
              type="number"
              min={0}
              step={1}
              value={invoiceAmount}
              onChange={(e) => setInvoiceAmount(e.target.value)}
              placeholder="Amount ৳"
              style={{ width: '7.5rem' }}
            />
            <Button
              size="sm"
              disabled={busy}
              onClick={() =>
                void run('Plan applied.', () =>
                  adminApplyPlan(tenantId, {
                    planId,
                    billingStatus: 'active',
                    planKind: 'comp',
                  }),
                )
              }
            >
              Apply plan
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => {
                const amount = Number(invoiceAmount)
                if (!Number.isFinite(amount) || amount < 0) {
                  setError('Amount must be 0 or more.')
                  return
                }
                void run('Invoice created.', () =>
                  adminCreateInvoice({
                    tenantId,
                    planId,
                    amountBdt: Math.round(amount),
                  }),
                )
              }}
            >
              Create invoice
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() =>
                void run('Trial extended 14 days.', () =>
                  adminExtendTrial(tenantId, 14),
                )
              }
            >
              Extend trial 14d
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() =>
                void run('Marked suspended.', () =>
                  adminPatchBilling(tenantId, {
                    billingStatus: 'suspended',
                  }),
                )
              }
            >
              Suspend
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() =>
                void run('Marked active.', () =>
                  adminPatchBilling(tenantId, { billingStatus: 'active' }),
                )
              }
            >
              Activate
            </Button>
          </div>

          <div className="pd-client-detail__field">
            <dt>
              <span className="pd-client-detail__field-icon" aria-hidden>
                <NotebookPen size={13} strokeWidth={2.25} />
              </span>
              Billing notes
            </dt>
            <dd>
              <Input
                aria-label="Billing notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Internal notes"
              />
              <div className="pd-admin__row-actions">
                <Button
                  size="sm"
                  disabled={busy}
                  onClick={() =>
                    void run('Notes saved.', () =>
                      adminPatchBilling(tenantId, { billingNotes: notes }),
                    )
                  }
                >
                  Save notes
                </Button>
              </div>
            </dd>
          </div>

          {snapshot.invoices && snapshot.invoices.length > 0 ? (
            <div className="pd-billing__invoices">
              {snapshot.invoices.slice(0, 8).map((inv) => (
                <div key={inv.id} className="pd-billing__invoice">
                  <div>
                    <p className="pd-billing__invoice-title">
                      {inv.description} · {formatBdt(inv.amountBdt)}
                    </p>
                    <p className="pd-billing__invoice-meta">
                      {statusLabel(inv.status)}
                      {inv.paymentReference
                        ? ` · ${inv.paymentReference}`
                        : ''}
                    </p>
                  </div>
                  {inv.status === 'pending_review' || inv.status === 'open' ? (
                    <Button
                      size="sm"
                      disabled={busy}
                      onClick={() =>
                        void run('Invoice marked paid.', () =>
                          adminMarkInvoicePaid(inv.id),
                        )
                      }
                    >
                      Mark paid
                    </Button>
                  ) : (
                    <Badge variant="neutral">{statusLabel(inv.status)}</Badge>
                  )}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <p className="pd-admin__quiet">Loading billing…</p>
      )}
    </section>
  )
}
