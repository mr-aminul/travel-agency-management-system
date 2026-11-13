import { useCallback, useEffect, useState } from 'react'
import {
  Boxes,
  HardDrive,
  MessageSquareText,
  UsersRound,
  type LucideIcon,
} from 'lucide-react'
import { adminFetchTenantBilling } from '@/lib/billing/billingApi'
import { authApiConfigured } from '@/lib/billing/platformFlag'
import { TENANT_BILLING_CHANGED_EVENT } from '@/lib/billing/billingEvents'
import { cn } from '@/lib/utils'
import type { BillingSnapshot } from '@/types/billing'
import { Button } from '@/components/shadcn/button'
import { adminQuietClass } from '@/components/admin/adminChrome'

const GB = 1024 ** 3

function formatGb(bytes: number, digits = 2): string {
  const safe = Number.isFinite(bytes) && bytes > 0 ? bytes : 0
  const gb = Number((safe / GB).toFixed(digits))
  return `${gb} GB`
}

export type TenantHealthMetersProps = {
  tenantId: string
  moduleCount: number
  onOpenBilling: () => void
  onOpenAccess: () => void
}

type Meter = {
  id: string
  label: string
  value: string
  icon: LucideIcon
  urgent?: boolean
  onClick: () => void
  /** When set, show used | bar | limit under the label (Storage). */
  progress?: {
    usedLabel: string
    limitLabel: string
    ratio: number
  }
}

export function TenantHealthMeters({
  tenantId,
  moduleCount,
  onOpenBilling,
  onOpenAccess,
}: TenantHealthMetersProps) {
  const [snapshot, setSnapshot] = useState<BillingSnapshot | null>(null)
  const [loading, setLoading] = useState(authApiConfigured())
  const [failed, setFailed] = useState(false)

  const reload = useCallback(async () => {
    if (!authApiConfigured()) {
      setLoading(false)
      setSnapshot(null)
      return
    }
    // Never clear meters on refresh — toggling SMS/email refetches billing and
    // must not blank the header row (that collapsed the page surface before).
    setFailed(false)
    try {
      const me = await adminFetchTenantBilling(tenantId)
      setSnapshot(me)
    } catch {
      setFailed(true)
    } finally {
      setLoading(false)
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

  if (!authApiConfigured()) {
    return (
      <div
        className="grid grid-cols-2 gap-2 md:grid-cols-4"
        aria-label="Health"
      >
        <MeterCard
          label="Modules"
          value={String(moduleCount)}
          icon={Boxes}
          onClick={onOpenAccess}
        />
        <p className={cn(adminQuietClass, 'col-span-2 self-center md:col-span-3')}>
          Seats, SMS, and storage need the platform API.
        </p>
      </div>
    )
  }

  if (!snapshot) {
    return (
      <div
        className="grid grid-cols-2 gap-2 md:grid-cols-4"
        aria-label="Health"
      >
        <MeterCard
          label="Modules"
          value={String(moduleCount)}
          icon={Boxes}
          onClick={onOpenAccess}
          urgent={moduleCount === 0}
        />
        <p className={cn(adminQuietClass, 'col-span-2 self-center md:col-span-3')}>
          {failed
            ? 'Could not load billing meters.'
            : loading
              ? 'Loading health…'
              : 'Could not load billing meters.'}
        </p>
      </div>
    )
  }

  const seatsUsed = snapshot.usage?.seatCommit ?? 0
  const seatsLimit = snapshot.limits?.userLimit ?? 0
  const smsSent = snapshot.usage?.smsSent ?? 0
  const smsLimit = snapshot.limits?.smsLimit ?? 0
  const smsBlocked = snapshot.billing?.smsEnabled === false
  const seatsUrgent =
    seatsLimit > 0 && seatsUsed / seatsLimit >= 0.9
  const smsUrgent =
    smsBlocked || (smsLimit > 0 && smsSent / smsLimit >= 0.9)
  const storageUsed = snapshot.usage?.storageBytes ?? 0
  const storageLimit = snapshot.limits?.storageLimitBytes ?? 0
  const storageRatio =
    storageLimit > 0 ? Math.min(1, Math.max(0, storageUsed / storageLimit)) : 0
  const storageUrgent = storageLimit > 0 && storageRatio >= 0.9

  const meters: Meter[] = [
    {
      id: 'seats',
      label: 'Seats',
      value: `${seatsUsed} / ${seatsLimit}`,
      icon: UsersRound,
      urgent: seatsUrgent,
      onClick: onOpenBilling,
    },
    {
      id: 'sms',
      label: 'SMS',
      value: smsBlocked ? 'Blocked' : `${smsSent} / ${smsLimit}`,
      icon: MessageSquareText,
      urgent: smsUrgent,
      onClick: onOpenAccess,
    },
    {
      id: 'storage',
      label: 'Storage',
      value: `${formatGb(storageUsed)} / ${formatGb(storageLimit, 1)}`,
      icon: HardDrive,
      urgent: storageUrgent,
      onClick: onOpenBilling,
      progress: {
        usedLabel: formatGb(storageUsed),
        limitLabel: formatGb(storageLimit, 1),
        ratio: storageRatio,
      },
    },
    {
      id: 'modules',
      label: 'Modules',
      value: String(moduleCount),
      icon: Boxes,
      urgent: moduleCount === 0,
      onClick: onOpenAccess,
    },
  ]

  return (
    <div
      className="grid grid-cols-2 gap-2 md:grid-cols-4"
      role="group"
      aria-label="Health"
    >
      {meters.map((meter) => (
        <MeterCard
          key={meter.id}
          label={meter.label}
          value={meter.value}
          icon={meter.icon}
          urgent={meter.urgent}
          onClick={meter.onClick}
          progress={meter.progress}
        />
      ))}
    </div>
  )
}

function MeterCard({
  label,
  value,
  icon: Icon,
  urgent,
  onClick,
  progress,
}: {
  label: string
  value: string
  icon: LucideIcon
  urgent?: boolean
  onClick: () => void
  progress?: Meter['progress']
}) {
  const percent = progress
    ? Math.round(Math.min(1, Math.max(0, progress.ratio)) * 100)
    : 0

  return (
    <Button
      type="button"
      variant="ghost"
      onClick={onClick}
      className={cn(
        'h-auto flex-col items-start gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2.5 text-left shadow-sm hover:bg-muted/50',
        urgent && 'border-destructive/40 bg-destructive/5 hover:bg-destructive/10',
      )}
    >
      <span
        className={cn(
          'inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground',
          urgent && 'text-destructive',
        )}
      >
        <Icon size={13} strokeWidth={2.25} aria-hidden />
        {label}
      </span>
      {progress ? (
        <span className="flex w-full min-w-0 items-center gap-2">
          <span
            className={cn(
              'shrink-0 text-xs tabular-nums text-muted-foreground',
              urgent && 'text-destructive',
            )}
          >
            {progress.usedLabel}
          </span>
          <span
            className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-label="Storage used"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
          >
            <span
              className={cn(
                'block h-full rounded-full bg-[#2abf94] transition-[width]',
                urgent && 'bg-destructive',
              )}
              style={{ width: `${percent}%` }}
            />
          </span>
          <span
            className={cn(
              'shrink-0 text-xs tabular-nums text-muted-foreground',
              urgent && 'text-destructive',
            )}
          >
            {progress.limitLabel}
          </span>
        </span>
      ) : (
        <span
          className={cn(
            'text-sm font-semibold tabular-nums text-foreground',
            urgent && 'text-destructive',
          )}
        >
          {value}
        </span>
      )}
    </Button>
  )
}
