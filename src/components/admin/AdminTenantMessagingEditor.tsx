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
import { cn } from '@/lib/utils'
import { LabeledSwitch } from '@/components/clients/LabeledSwitch'
import { Button } from '@/components/shadcn/button'
import { Input } from '@/components/shadcn/input'
import type { BillingSnapshot } from '@/types/billing'
import { adminQuietClass } from '@/components/admin/adminChrome'

type Props = {
  tenantId: string
}

const bodyIconClass =
  'inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground'

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
    return <p className={adminQuietClass}>Messaging needs the platform API.</p>
  }

  if (!snapshot) {
    return <p className={adminQuietClass}>Loading messaging…</p>
  }

  const smsSent = snapshot.usage.smsSent
  const liveLimit = snapshot.limits.smsLimit
  const limitDirty = smsLimitDraft.trim() !== String(liveLimit)
  const remaining = Math.max(0, liveLimit - smsSent)
  const smsOn = snapshot.billing?.smsEnabled !== false
  const emailOn = snapshot.billing?.emailEnabled !== false
  const usagePct =
    liveLimit > 0 ? Math.min(100, Math.round((smsSent / liveLimit) * 100)) : 0

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
    <div className="flex flex-col gap-4" aria-label="SMS / Email">
      {error ? (
        <p className="m-0 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <ChannelCard
          icon={MessageSquareText}
          title="SMS"
          checked={smsOn}
          disabled={busy}
          onChange={(next) => {
            void run(() => adminPatchBilling(tenantId, { smsEnabled: next }))
          }}
        />
        <ChannelCard
          icon={Mail}
          title="Email"
          checked={emailOn}
          disabled={busy}
          onChange={(next) => {
            void run(() => adminPatchBilling(tenantId, { emailEnabled: next }))
          }}
        />
      </div>

      <section
        className="rounded-xl border border-border bg-card p-4 shadow-sm"
        aria-label="SMS quantity"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="m-0 text-sm font-semibold">SMS quantity</h3>
            <p className={cn(adminQuietClass, 'mt-1')}>
              {liveLimit === 0
                ? 'Quantity 0 — SMS not available'
                : `${smsSent.toLocaleString('en-BD')} used · ${remaining.toLocaleString('en-BD')} left`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              aria-label="SMS quantity limit"
              type="number"
              min={0}
              step={1}
              value={smsLimitDraft}
              disabled={busy}
              className="h-9 w-[9.5rem] rounded-lg"
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
              className="h-9 rounded-lg"
              disabled={busy || !limitDirty}
              onClick={saveSmsLimit}
            >
              Save
            </Button>
          </div>
        </div>
        {liveLimit > 0 ? (
          <div
            className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-label="SMS used"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={usagePct}
          >
            <div
              className={cn(
                'h-full rounded-full bg-[#2abf94] transition-[width]',
                usagePct >= 90 && 'bg-destructive',
              )}
              style={{ width: `${usagePct}%` }}
            />
          </div>
        ) : null}
      </section>
    </div>
  )
}

function ChannelCard({
  icon: Icon,
  title,
  checked,
  disabled,
  onChange,
}: {
  icon: typeof MessageSquareText
  title: string
  checked: boolean
  disabled: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-3.5 py-3 shadow-sm">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className={bodyIconClass} aria-hidden>
          <Icon size={14} strokeWidth={2} />
        </span>
        <p className="m-0 text-sm font-semibold">{title}</p>
      </div>
      <LabeledSwitch
        label={title}
        className="shrink-0 [&>span:last-child]:sr-only"
        offDanger
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
    </div>
  )
}
