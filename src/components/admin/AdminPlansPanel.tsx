import { useCallback, useEffect, useState } from 'react'
import { adminListPlans, adminUpdatePlan } from '@/lib/billing/billingApi'
import { formatBdt } from '@/lib/billing/format'
import { authApiConfigured } from '@/lib/billing/platformFlag'
import { PLAN_CATALOG } from '@/lib/billing/planCatalog'
import { Badge, Button, Input } from '@/components/ui'
import type { PlanTemplate } from '@/types/billing'
import '@/styles/layout-billing.css'

type Draft = {
  priceBdt: string
}

export function AdminPlansPanel() {
  const [plans, setPlans] = useState<PlanTemplate[]>(PLAN_CATALOG)
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!authApiConfigured()) {
      setPlans(PLAN_CATALOG)
      setDrafts(
        Object.fromEntries(
          PLAN_CATALOG.map((p) => [p.id, { priceBdt: String(p.priceBdt) }]),
        ),
      )
      return
    }
    setError(null)
    try {
      const { plans: next } = await adminListPlans()
      setPlans(next)
      setDrafts(
        Object.fromEntries(
          next.map((p) => [p.id, { priceBdt: String(p.priceBdt) }]),
        ),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load plans.')
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const saveAmount = async (plan: PlanTemplate) => {
    const raw = drafts[plan.id]?.priceBdt ?? String(plan.priceBdt)
    const amount = Number(raw)
    if (!Number.isFinite(amount) || amount < 0) {
      setError('Amount must be 0 or more.')
      return
    }
    setBusyId(plan.id)
    setError(null)
    setStatus(null)
    try {
      await adminUpdatePlan(plan.id, { priceBdt: Math.round(amount) })
      setStatus(`Updated ${plan.name} to ${formatBdt(Math.round(amount))}.`)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section className="pd-admin__panel" aria-label="Subscription plans">
      <header className="pd-admin__panel-header">
        <div>
          <h2 className="pd-admin__panel-title">Subscription plans</h2>
          <p className="pd-admin__panel-desc">
            Edit monthly amounts (BDT). Use the Test plan (৳0) to exercise
            checkout and gateway flows without charging a real agency.
          </p>
        </div>
      </header>

      {!authApiConfigured() ? (
        <p className="pd-admin__quiet">
          Connect the platform API to edit live plan amounts.
        </p>
      ) : null}

      {error ? (
        <p
          className="pd-settings-form__status pd-settings-form__status--error"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      {status ? (
        <p className="pd-settings-form__status" role="status">
          {status}
        </p>
      ) : null}

      <div className="pd-billing__invoices">
        {[...plans]
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((plan) => {
            const isTest = plan.id === 'test' || Boolean(plan.features?.isTest)
            return (
              <div key={plan.id} className="pd-billing__invoice">
                <div>
                  <p className="pd-billing__invoice-title">
                    {plan.name}{' '}
                    {isTest ? <Badge variant="pending">Test</Badge> : null}
                  </p>
                  <p className="pd-billing__invoice-meta">
                    {plan.userLimit} users · {plan.subAgentLimit} sub agents ·{' '}
                    {plan.smsLimit} SMS
                    {plan.description ? ` · ${plan.description}` : ''}
                  </p>
                </div>
                <div className="pd-billing-admin__row">
                  <Input
                    aria-label={`${plan.name} amount BDT`}
                    type="number"
                    min={0}
                    step={1}
                    value={drafts[plan.id]?.priceBdt ?? String(plan.priceBdt)}
                    onChange={(e) =>
                      setDrafts((prev) => ({
                        ...prev,
                        [plan.id]: { priceBdt: e.target.value },
                      }))
                    }
                    style={{ width: '7.5rem' }}
                  />
                  <Button
                    size="sm"
                    disabled={busyId === plan.id || !authApiConfigured()}
                    onClick={() => void saveAmount(plan)}
                  >
                    {busyId === plan.id ? 'Saving…' : 'Save amount'}
                  </Button>
                </div>
              </div>
            )
          })}
      </div>
    </section>
  )
}
