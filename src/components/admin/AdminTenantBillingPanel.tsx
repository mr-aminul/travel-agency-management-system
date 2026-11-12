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
  adminSetStorageLimit,
} from '@/lib/billing/billingApi'
import { TENANT_BILLING_CHANGED_EVENT } from '@/lib/billing/billingEvents'
import {
  formatBdt,
  formatDate,
  formatStorageBytes,
  formatStorageUsage,
} from '@/lib/billing/format'
import { authApiConfigured } from '@/lib/billing/platformFlag'
import { useTenantById } from '@/lib/tenantsStore'
import { Button } from '@/components/shadcn/button'
import { Input } from '@/components/shadcn/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shadcn/select'
import type { BillingSnapshot, PlanTemplate } from '@/types/billing'
import {
  adminBillingCardPendingClass,
  adminPlanBillClass,
  adminPlanClass,
  adminPlanOpsClass,
  adminPlanStorageClass,
  adminPlanStorageRowClass,
  adminQuietClass,
} from '@/components/admin/adminChrome'

const MB = 1024 ** 2
const GB = 1024 ** 3

type StorageUnit = 'MB' | 'GB'

type Props = {
  tenantId: string
}

function storageDraftFromBytes(bytes: number): {
  value: string
  unit: StorageUnit
} {
  if (Number.isFinite(bytes) && bytes > 0 && bytes < GB) {
    return { unit: 'MB', value: String(Math.round(bytes / MB)) }
  }
  const gb = Number.isFinite(bytes) ? bytes / GB : 0
  return { unit: 'GB', value: String(Math.round(gb * 100) / 100) }
}

function bytesFromStorageDraft(value: string, unit: StorageUnit): number {
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0) {
    throw new Error('Storage must be 0 or more.')
  }
  return Math.round(n * (unit === 'MB' ? MB : GB))
}

/** Compact subscription block for the agency admin profile card. */
export function AdminTenantBillingPanel({ tenantId }: Props) {
  const tenant = useTenantById(tenantId)
  const [snapshot, setSnapshot] = useState<BillingSnapshot | null>(null)
  const [plans, setPlans] = useState<PlanTemplate[]>([])
  const [planId, setPlanId] = useState('growth')
  const [invoiceAmount, setInvoiceAmount] = useState('')
  const [storageDraft, setStorageDraft] = useState('')
  const [storageUnit, setStorageUnit] = useState<StorageUnit>('GB')
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
      const storage = storageDraftFromBytes(me.limits.storageLimitBytes ?? 0)
      setStorageDraft(storage.value)
      setStorageUnit(storage.unit)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load billing.')
    }
  }, [tenantId])

  useEffect(() => {
    void reload()
  }, [reload])

  useEffect(() => {
    const onBillingChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ tenantId?: string }>).detail
      if (detail?.tenantId && detail.tenantId !== tenantId) return
      void reload()
    }
    window.addEventListener(TENANT_BILLING_CHANGED_EVENT, onBillingChanged)
    return () => {
      window.removeEventListener(TENANT_BILLING_CHANGED_EVENT, onBillingChanged)
    }
  }, [reload, tenantId])

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
    return <p className={adminQuietClass}>Billing needs the platform API.</p>
  }

  if (!snapshot) {
    return <p className={adminQuietClass}>Loading billing…</p>
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
  const liveStorageBytes = snapshot.limits.storageLimitBytes ?? 0
  let draftStorageBytes = liveStorageBytes
  let storageDraftValid = true
  try {
    draftStorageBytes = bytesFromStorageDraft(storageDraft.trim() || '0', storageUnit)
  } catch {
    storageDraftValid = false
  }
  const storageDirty =
    storageDraftValid && draftStorageBytes !== liveStorageBytes

  const saveStorageLimit = () => {
    const raw = storageDraft.trim()
    if (!raw) {
      setError('Enter a storage amount.')
      return
    }
    let nextBytes: number
    try {
      nextBytes = bytesFromStorageDraft(raw, storageUnit)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid storage amount.')
      return
    }
    void run(() =>
      adminSetStorageLimit(
        tenantId,
        nextBytes,
        snapshot,
        tenant?.enabledModules ?? [],
      ),
    )
  }

  return (
    <div className={adminPlanClass} aria-label="Subscription">
      {billingNotes ? (
        <p className={`${adminQuietClass} mb-3`}>{billingNotes}</p>
      ) : null}
      <dl className="pd-client-detail__card-fields">
        <div className="pd-client-detail__card-field">
          <dt>Plan</dt>
          <dd>
            <Select
              value={planId}
              disabled={busy}
              onValueChange={(next) => {
                setPlanId(next)
                const matched = plans.find((p) => p.id === next)
                if (matched) setInvoiceAmount(String(matched.priceBdt))
                setBillingOpen(false)
              }}
            >
              <SelectTrigger aria-label="Plan" className="h-8 w-full min-w-[12rem]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {plans.map((plan) => (
                  <SelectItem key={plan.id} value={plan.id}>
                    {`${plan.name} · ${formatBdt(plan.priceBdt)}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </dd>
        </div>
        <div className="pd-client-detail__card-field">
          <dt>Price</dt>
          <dd>
            {formatBdt(livePlan?.priceBdt ?? 0)}/
            {livePlan?.interval === 'year' ? 'yr' : 'mo'}
          </dd>
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
          <dt>Storage</dt>
          <dd>
            {formatStorageUsage(
              snapshot.usage.storageBytes,
              snapshot.limits.storageLimitBytes,
            )}
          </dd>
        </div>
      </dl>

      <div
        className={adminPlanStorageClass}
        aria-label="Update storage limit"
      >
        <p className={adminQuietClass}>
          Used {formatStorageBytes(snapshot.usage.storageBytes)}. Set a custom
          limit for this agency (does not change the plan template).
        </p>
        <div className={adminPlanStorageRowClass}>
          <Input
            aria-label="Storage limit amount"
            type="number"
            min={0}
            step="any"
            value={storageDraft}
            disabled={busy}
            onChange={(event) => setStorageDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                saveStorageLimit()
              }
            }}
          />
          <Select
            value={storageUnit}
            disabled={busy}
            onValueChange={(next) =>
              setStorageUnit(next === 'MB' ? 'MB' : 'GB')
            }
          >
            <SelectTrigger aria-label="Storage unit" className="h-8 w-[5.5rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="GB">GB</SelectItem>
              <SelectItem value="MB">MB</SelectItem>
            </SelectContent>
          </Select>
          <Button
            size="sm"
            disabled={busy || !storageDirty}
            onClick={saveStorageLimit}
          >
            Save storage
          </Button>
        </div>
      </div>

      {error ? (
        <p className="m-0 text-sm text-destructive" role="alert">
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
        <div className={adminPlanBillClass}>
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
        <div className={adminPlanOpsClass} role="group" aria-label="Billing ops">
          <Button
            size="sm"
            className="w-full justify-center bg-primary border-primary text-primary-foreground hover:bg-primary/90 hover:border-primary/90 hover:text-primary-foreground"
            disabled={busy}
            onClick={() => setBillingOpen(true)}
          >
            <Receipt size={13} strokeWidth={2.25} aria-hidden />
            Bill
          </Button>
          <Button
            size="sm"
            className="w-full justify-center bg-[#185fa5] border-[#185fa5] text-white hover:bg-[#0f4d8a] hover:border-[#0f4d8a] hover:text-white"
            disabled={busy}
            onClick={() => void run(() => adminExtendTrial(tenantId, 14))}
          >
            <CalendarPlus size={13} strokeWidth={2.25} aria-hidden />
            +14d
          </Button>
          <Button
            size="sm"
            variant="destructive"
            className="w-full justify-center"
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
            className="w-full justify-center bg-[var(--color-theme)] border-[var(--color-theme)] text-[var(--color-on-theme,#fff)] hover:bg-[color-mix(in_srgb,var(--color-theme)_88%,black)] hover:border-[color-mix(in_srgb,var(--color-theme)_88%,black)]"
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
        <ul className={adminBillingCardPendingClass}>
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
