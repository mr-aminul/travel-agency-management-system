import { useMemo, useState } from 'react'
import {
  cancelSubscription,
  startCheckout,
  submitInvoicePayment,
} from '@/lib/billing/billingApi'
import {
  daysUntil,
  formatBdt,
  formatDate,
  formatStorageUsage,
  statusLabel,
} from '@/lib/billing/format'
import { planHighlights } from '@/lib/billing/planCatalog'
import { useBilling } from '@/lib/billing/useBilling'
import { SettingsInfo } from '@/components/settings/SettingsInfo'
import { Badge, Button, Input, Progress, Select } from '@/components/ui'
import { cx } from '@/lib/cx'
import type { BillingInvoice, PlanTemplate } from '@/types/billing'
import '@/styles/layout-billing.css'

type Props = {
  title: string
  info: string
}

function badgeVariant(
  status: string,
): 'neutral' | 'completed' | 'pending' | 'in-progress' | 'danger' {
  if (status === 'active' || status === 'paid') return 'completed'
  if (status === 'trial' || status === 'open') return 'in-progress'
  if (status === 'past_due' || status === 'pending_review') return 'pending'
  if (status === 'suspended' || status === 'canceled' || status === 'failed') {
    return 'danger'
  }
  return 'neutral'
}

function meterClass(tone: string): string {
  if (tone === 'full') return 'is-full'
  if (tone === 'warn') return 'is-warn'
  return ''
}

export function BillingSettingsSection({ title, info }: Props) {
  const { snapshot, plans, instructions, loading, error, reload, apiEnabled } =
    useBilling()
  const [busyPlanId, setBusyPlanId] = useState<string | null>(null)
  const [checkoutInvoice, setCheckoutInvoice] =
    useState<BillingInvoice | null>(null)
  const [paymentMethod, setPaymentMethod] = useState('bkash')
  const [paymentReference, setPaymentReference] = useState('')
  const [paymentNote, setPaymentNote] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [formOk, setFormOk] = useState<string | null>(null)
  const [cancelBusy, setCancelBusy] = useState(false)

  const currentPlanId = snapshot?.billing?.planId ?? null
  const billing = snapshot?.billing
  const trialDays = daysUntil(billing?.trialEndsAt)
  const openInvoice =
    checkoutInvoice ||
    snapshot?.invoices?.find(
      (inv) => inv.status === 'open' || inv.status === 'pending_review',
    ) ||
    null

  const sortedPlans = useMemo(
    () => [...plans].sort((a, b) => a.sortOrder - b.sortOrder),
    [plans],
  )

  const handleChoosePlan = async (plan: PlanTemplate) => {
    setFormError(null)
    setFormOk(null)
    setBusyPlanId(plan.id)
    try {
      const result = await startCheckout(plan.id)
      if (result.redirectUrl) {
        window.location.href = result.redirectUrl
        return
      }
      setCheckoutInvoice(result.invoice)
      setFormOk(`Invoice created for ${plan.name}. Complete payment below.`)
      await reload()
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Could not start checkout.',
      )
    } finally {
      setBusyPlanId(null)
    }
  }

  const handleSubmitPayment = async () => {
    if (!openInvoice) return
    setFormError(null)
    setFormOk(null)
    setBusyPlanId('pay')
    try {
      await submitInvoicePayment({
        invoiceId: openInvoice.id,
        paymentMethod,
        paymentReference,
        paymentNote,
      })
      setFormOk(
        'Payment submitted. Access updates after inventivelab verifies the transfer.',
      )
      setPaymentReference('')
      setPaymentNote('')
      setCheckoutInvoice(null)
      await reload()
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Could not submit payment.',
      )
    } finally {
      setBusyPlanId(null)
    }
  }

  const handleCancel = async () => {
    if (
      !window.confirm(
        'Cancel your subscription? You keep access until the period ends if already paid; trials end immediately after review.',
      )
    ) {
      return
    }
    setCancelBusy(true)
    setFormError(null)
    try {
      await cancelSubscription()
      setFormOk('Cancellation requested.')
      await reload()
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Could not cancel.',
      )
    } finally {
      setCancelBusy(false)
    }
  }

  if (!apiEnabled) {
    return (
      <div className="pd-settings-stack">
        <div className="pd-settings-panel__header">
          <h2 className="pd-settings-panel__title">{title}</h2>
          <SettingsInfo title={title} body={info} />
        </div>
        <p className="pd-admin__quiet" role="status">
          Billing runs on the live platform API. Plans below are for reference.
        </p>
        <div className="pd-billing__plans">
          {sortedPlans.map((plan) => (
            <article key={plan.id} className="pd-billing__plan">
              <div className="pd-billing__plan-head">
                <h3 className="pd-billing__plan-title">{plan.name}</h3>
                <p className="pd-billing__plan-price">
                  {formatBdt(plan.priceBdt)} <span>/ month</span>
                </p>
              </div>
              <p className="pd-billing__plan-desc">{plan.description}</p>
              <ul className="pd-billing__plan-list">
                {planHighlights(plan).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="pd-settings-stack">
      <div className="pd-settings-panel__header">
        <h2 className="pd-settings-panel__title">{title}</h2>
        <SettingsInfo title={title} body={info} />
      </div>

      {loading ? (
        <p className="pd-admin__quiet">Loading billing…</p>
      ) : null}
      {error ? (
        <p className="pd-settings-form__status pd-settings-form__status--error" role="alert">
          {error}
        </p>
      ) : null}
      {formError ? (
        <p className="pd-settings-form__status pd-settings-form__status--error" role="alert">
          {formError}
        </p>
      ) : null}
      {formOk ? (
        <p className="pd-settings-form__status" role="status">
          {formOk}
        </p>
      ) : null}

      {snapshot ? (
        <div className="pd-billing">
          <section className="pd-billing__hero" aria-label="Current plan">
            <div className="pd-billing__hero-top">
              <h2 className="pd-billing__plan-name">
                {snapshot.plan?.name ?? 'No plan'}
              </h2>
              <Badge variant={badgeVariant(billing?.billingStatus ?? 'trial')}>
                {statusLabel(billing?.billingStatus ?? 'trial')}
              </Badge>
            </div>
            <p className="pd-billing__meta">
              {billing?.billingStatus === 'trial'
                ? trialDays != null && trialDays > 0
                  ? `Trial ends ${formatDate(billing.trialEndsAt)} · ${trialDays} day${trialDays === 1 ? '' : 's'} left`
                  : `Trial ended ${formatDate(billing.trialEndsAt)}`
                : billing?.currentPeriodEnd
                  ? `Renews ${formatDate(billing.currentPeriodEnd)} · ${formatBdt(snapshot.plan?.priceBdt ?? 0)}/mo`
                  : snapshot.plan
                    ? `${formatBdt(snapshot.plan.priceBdt)} / month`
                    : 'Choose a plan to continue after trial.'}
            </p>
            {snapshot.access?.grace ? (
              <p className="pd-billing__grace">
                Payment is past due. You still have access while we retry —
                update billing soon to avoid interruption.
              </p>
            ) : null}
          </section>

          <section aria-label="Usage">
            <h3 className="pd-billing__section-title">Usage this period</h3>
            <div className="pd-billing__usage">
              <div
                className={cx(
                  'pd-billing__meter',
                  meterClass(snapshot.tones.users),
                )}
              >
                <div className="pd-billing__meter-label">
                  <span>Users</span>
                  <span>
                    {snapshot.usage.seatCommit}/{snapshot.limits.userLimit}
                  </span>
                </div>
                <Progress
                  value={snapshot.usage.seatCommit}
                  max={Math.max(1, snapshot.limits.userLimit)}
                />
                <span className="pd-billing__meter-value">
                  {snapshot.usage.users} active
                  {snapshot.usage.pendingInvites
                    ? ` · ${snapshot.usage.pendingInvites} invite${snapshot.usage.pendingInvites === 1 ? '' : 's'}`
                    : ''}
                </span>
              </div>
              <div
                className={cx(
                  'pd-billing__meter',
                  meterClass(snapshot.tones.subAgents),
                )}
              >
                <div className="pd-billing__meter-label">
                  <span>Sub agents</span>
                  <span>
                    {snapshot.usage.subAgents}/{snapshot.limits.subAgentLimit}
                  </span>
                </div>
                <Progress
                  value={snapshot.usage.subAgents}
                  max={Math.max(1, snapshot.limits.subAgentLimit)}
                />
              </div>
              <div
                className={cx(
                  'pd-billing__meter',
                  meterClass(snapshot.tones.storage),
                )}
              >
                <div className="pd-billing__meter-label">
                  <span>Storage</span>
                </div>
                <Progress
                  value={snapshot.usage.storageBytes}
                  max={Math.max(1, snapshot.limits.storageLimitBytes)}
                />
                <span className="pd-billing__meter-value">
                  {formatStorageUsage(
                    snapshot.usage.storageBytes,
                    snapshot.limits.storageLimitBytes,
                  )}
                </span>
              </div>
              <div
                className={cx(
                  'pd-billing__meter',
                  meterClass(snapshot.tones.sms),
                )}
              >
                <div className="pd-billing__meter-label">
                  <span>SMS</span>
                  <span>
                    {snapshot.usage.smsSent}/{snapshot.limits.smsLimit}
                  </span>
                </div>
                <Progress
                  value={snapshot.usage.smsSent}
                  max={Math.max(1, snapshot.limits.smsLimit)}
                />
                <span className="pd-billing__meter-value">
                  Extra {formatBdt(snapshot.limits.smsOverageBdt)} / SMS
                </span>
              </div>
            </div>
          </section>

          {openInvoice ? (
            <section className="pd-billing__checkout" aria-label="Pay invoice">
              <div className="pd-billing__checkout-head">
                <div>
                  <h3 className="pd-billing__section-title">
                    {openInvoice.status === 'pending_review'
                      ? 'Payment under review'
                      : 'Complete payment'}
                  </h3>
                  <p className="pd-billing__meta">
                    {openInvoice.description} · {formatBdt(openInvoice.amountBdt)}
                  </p>
                </div>
                <Badge variant={badgeVariant(openInvoice.status)}>
                  {statusLabel(openInvoice.status)}
                </Badge>
              </div>

              {instructions ? (
                <p className="pd-billing__instructions">
                  {instructions.note}
                  {instructions.bkash ? (
                    <>
                      <br />
                      <strong>bKash:</strong> {instructions.bkash}
                    </>
                  ) : null}
                  {instructions.nagad ? (
                    <>
                      <br />
                      <strong>Nagad:</strong> {instructions.nagad}
                    </>
                  ) : null}
                  {instructions.bankName ? (
                    <>
                      <br />
                      <strong>Bank:</strong> {instructions.bankName}
                      {instructions.bankAccount
                        ? ` · ${instructions.bankAccount}`
                        : ''}
                    </>
                  ) : null}
                </p>
              ) : null}

              {openInvoice.status === 'open' ? (
                <>
                  <div className="pd-billing__pay-grid">
                    <Select
                      label="Payment method"
                      value={paymentMethod}
                      options={[
                        { value: 'bkash', label: 'bKash' },
                        { value: 'nagad', label: 'Nagad' },
                        { value: 'bank', label: 'Bank transfer' },
                        { value: 'other', label: 'Other' },
                      ]}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                    />
                    <Input
                      label="Transaction ID"
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                      placeholder="e.g. 8N2XXXXXXX"
                      autoComplete="off"
                    />
                  </div>
                  <Input
                    label="Note (optional)"
                    value={paymentNote}
                    onChange={(e) => setPaymentNote(e.target.value)}
                    placeholder="Sender name or account"
                  />
                  <div className="pd-admin__row-actions">
                    <Button
                      onClick={() => void handleSubmitPayment()}
                      disabled={busyPlanId === 'pay' || !paymentReference.trim()}
                    >
                      {busyPlanId === 'pay' ? 'Submitting…' : 'Submit payment'}
                    </Button>
                  </div>
                </>
              ) : (
                <p className="pd-billing__meta">
                  Reference {openInvoice.paymentReference}. We’ll activate your
                  plan after verification.
                </p>
              )}
            </section>
          ) : null}

          <section aria-label="Plans">
            <h3 className="pd-billing__section-title">Plans</h3>
            <div className="pd-billing__plans">
              {sortedPlans.map((plan) => {
                const isCurrent =
                  currentPlanId === plan.id &&
                  billing?.billingStatus !== 'canceled'
                const isFeatured = plan.id === 'growth'
                const isTest =
                  plan.id === 'test' || Boolean(plan.features?.isTest)
                return (
                  <article
                    key={plan.id}
                    className={cx(
                      'pd-billing__plan',
                      isCurrent && 'is-current',
                      isFeatured && 'is-featured',
                    )}
                  >
                    <div className="pd-billing__plan-head">
                      <h3 className="pd-billing__plan-title">
                        {plan.name}
                        {isTest ? (
                          <>
                            {' '}
                            <Badge variant="pending">Test</Badge>
                          </>
                        ) : null}
                      </h3>
                      <p className="pd-billing__plan-price">
                        {formatBdt(plan.priceBdt)} <span>/ month</span>
                      </p>
                    </div>
                    <p className="pd-billing__plan-desc">{plan.description}</p>
                    <ul className="pd-billing__plan-list">
                      {planHighlights(plan).map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                    <Button
                      variant={isCurrent ? 'ghost' : 'primary'}
                      disabled={isCurrent || busyPlanId === plan.id}
                      onClick={() => void handleChoosePlan(plan)}
                    >
                      {isCurrent
                        ? 'Current plan'
                        : busyPlanId === plan.id
                          ? 'Starting…'
                          : billing?.billingStatus === 'trial'
                            ? 'Choose plan'
                            : 'Switch plan'}
                    </Button>
                  </article>
                )
              })}
            </div>
          </section>

          {snapshot.invoices && snapshot.invoices.length > 0 ? (
            <section aria-label="Invoices">
              <h3 className="pd-billing__section-title">Invoices</h3>
              <div className="pd-billing__invoices">
                {snapshot.invoices.map((inv) => (
                  <div key={inv.id} className="pd-billing__invoice">
                    <div>
                      <p className="pd-billing__invoice-title">
                        {inv.description || 'Subscription'}
                      </p>
                      <p className="pd-billing__invoice-meta">
                        {formatDate(inv.createdAt)} · {formatBdt(inv.amountBdt)}
                      </p>
                    </div>
                    <Badge variant={badgeVariant(inv.status)}>
                      {statusLabel(inv.status)}
                    </Badge>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {billing?.billingStatus === 'active' ||
          billing?.billingStatus === 'past_due' ? (
            <div>
              <Button
                variant="ghost"
                size="sm"
                disabled={cancelBusy}
                onClick={() => void handleCancel()}
              >
                Cancel subscription
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
