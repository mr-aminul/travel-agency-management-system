import { useCallback, useEffect, useState } from 'react'
import { Mail, MessageSquareText } from 'lucide-react'
import {
  adminFetchTenantBilling,
  adminPatchBilling,
  adminSetSmsLimit,
} from '@/lib/billing/billingApi'
import { TENANT_BILLING_CHANGED_EVENT } from '@/lib/billing/billingEvents'
import { authApiConfigured } from '@/lib/billing/platformFlag'
import { useTenantById } from '@/lib/tenantsStore'
import { Badge, Button, Input, Switch } from '@/components/ui'
import type { BillingSnapshot } from '@/types/billing'

type Props = {
  tenantId: string
}

/** Platform controls: SMS/email allow + per-agency SMS quantity hard cap. */
export function AdminTenantMessagingEditor({ tenantId }: Props) {
  const tenant = useTenantById(tenantId)
  const [snapshot, setSnapshot] = useState<BillingSnapshot | null>(null)
  const [smsLimitDraft, setSmsLimitDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const notifyBillingChanged = () => {
    window.dispatchEvent(
      new CustomEvent(TENANT_BILLING_CHANGED_EVENT, { detail: { tenantId } }),
    )
  }

  const reload = useCallback(async () => {
    if (!authApiConfigured()) return
    setError(null)
    try {
      const me = await adminFetchTenantBilling(tenantId)
      setSnapshot(me)
      setSmsLimitDraft(String(me.limits.smsLimit ?? 0))
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not load messaging settings.',
      )
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
      await reload()
      notifyBillingChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed.')
    } finally {
      setBusy(false)
    }
  }

  if (!authApiConfigured()) {
    return <p className="pd-admin__quiet">Messaging needs the platform API.</p>
  }

  if (!snapshot) {
    return <p className="pd-admin__quiet">Loading messaging…</p>
  }

  const smsSent = snapshot.usage.smsSent
  const liveLimit = snapshot.limits.smsLimit
  const limitDirty = smsLimitDraft.trim() !== String(liveLimit)
  const remaining = Math.max(0, liveLimit - smsSent)
  // 0 quantity (or none left) → not available; any leftover quantity → available
  const isSmsAvailable = remaining > 0

  const saveSmsLimit = () => {
    const raw = smsLimitDraft.trim()
    if (!raw) {
      setError('Enter an SMS quantity.')
      return
    }
    const parsed = Number(raw)
    if (!Number.isFinite(parsed) || parsed < 0 || !Number.isInteger(parsed)) {
      setError('SMS quantity must be a whole number of 0 or more.')
      return
    }
    void run(() =>
      adminSetSmsLimit(
        tenantId,
        parsed,
        snapshot,
        tenant?.enabledModules ?? [],
      ),
    )
  }

  return (
    <div className="pd-admin__modules" aria-label="SMS and email permission">
      {error ? (
        <p className="pd-field__error" role="alert">
          {error}
        </p>
      ) : null}

      <section
        className="pd-admin__module-group"
        aria-labelledby="pd-admin-messaging-permission"
      >
        <h3
          id="pd-admin-messaging-permission"
          className="pd-admin__module-group-title"
        >
          Permission
        </h3>
        <ul className="pd-admin__module-list pd-admin__module-list--grid">
          <li className="pd-admin__module-row">
            <div className="pd-admin__module-meta">
              <span className="pd-admin__module-icon" aria-hidden>
                <MessageSquareText size={16} strokeWidth={2.1} />
              </span>
              <span className="pd-admin__module-label">SMS allowed</span>
            </div>
            <Switch
              label={
                snapshot.billing?.smsEnabled === false
                  ? 'Blocked by platform'
                  : 'Agency may send'
              }
              className="pd-admin__module-switch"
              checked={snapshot.billing?.smsEnabled !== false}
              disabled={busy}
              onChange={(event) => {
                const next = event.target.checked
                void run(() =>
                  adminPatchBilling(tenantId, { smsEnabled: next }),
                )
              }}
            />
          </li>
          <li className="pd-admin__module-row">
            <div className="pd-admin__module-meta">
              <span className="pd-admin__module-icon" aria-hidden>
                <Mail size={16} strokeWidth={2.1} />
              </span>
              <span className="pd-admin__module-label">Email allowed</span>
            </div>
            <Switch
              label={
                snapshot.billing?.emailEnabled === false
                  ? 'Blocked by platform'
                  : 'Agency may send'
              }
              className="pd-admin__module-switch"
              checked={snapshot.billing?.emailEnabled !== false}
              disabled={busy}
              onChange={(event) => {
                const next = event.target.checked
                void run(() =>
                  adminPatchBilling(tenantId, { emailEnabled: next }),
                )
              }}
            />
          </li>
        </ul>
        <p className="pd-admin__quiet">
          Agency SMS:{' '}
          {snapshot.billing?.smsEnabled === false
            ? 'Off (platform)'
            : snapshot.billing?.agencySmsEnabled === false
              ? 'Off (their choice)'
              : 'On'}
          {' · '}
          Agency email:{' '}
          {snapshot.billing?.emailEnabled === false
            ? 'Off (platform)'
            : snapshot.billing?.agencyEmailEnabled === false
              ? 'Off (their choice)'
              : 'On'}
        </p>
      </section>

      <section
        className="pd-admin__module-group"
        aria-labelledby="pd-admin-messaging-quantity"
      >
        <div className="pd-admin__messaging-quantity-head">
          <h3
            id="pd-admin-messaging-quantity"
            className="pd-admin__module-group-title"
          >
            SMS quantity
          </h3>
          <Badge variant={isSmsAvailable ? 'completed' : 'danger'}>
            {isSmsAvailable ? 'Available' : 'Not available'}
          </Badge>
        </div>
        <div className="pd-admin__messaging-quantity">
          <p className="pd-admin__quiet">
            {liveLimit === 0
              ? 'Quantity is 0 — SMS is not available. Add a quantity to make it available.'
              : remaining === 0
                ? `Used all ${liveLimit.toLocaleString('en-BD')} — SMS is not available until you add more.`
                : `Used ${smsSent.toLocaleString('en-BD')} of ${liveLimit.toLocaleString('en-BD')} · ${remaining.toLocaleString('en-BD')} left. Sending stops when this quantity is finished.`}
          </p>
          <div className="pd-admin__messaging-quantity-row">
            <Input
              aria-label="SMS quantity limit"
              type="number"
              min={0}
              step={1}
              value={smsLimitDraft}
              disabled={busy}
              onChange={(event) => setSmsLimitDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  saveSmsLimit()
                }
              }}
            />
            <Button
              size="sm"
              disabled={busy || !limitDirty}
              onClick={saveSmsLimit}
            >
              Save quantity
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
