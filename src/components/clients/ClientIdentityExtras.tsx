import { useEffect, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { formatBalance } from '@/lib/clientsStore'
import { formatDisplayDate } from '@/lib/formatDate'
import { cn } from '@/lib/utils'
import type { Client } from '@/types/client'

export type ClientIdentityExtrasProps = {
  client: Client
  dueBalance: number
  paidTotal: number
  onOpenPayments: () => void
  onOpenDocuments: (focus?: 'passport') => void
  onOpenProfile: () => void
}

function passportTone(expiry?: string): {
  label: string
  className: string
} {
  const trimmed = expiry?.trim()
  if (!trimmed) {
    return { label: 'Missing', className: 'text-amber-800' }
  }
  const stamp = Date.parse(
    trimmed.includes('T') ? trimmed : `${trimmed}T12:00:00`,
  )
  if (Number.isNaN(stamp)) {
    return { label: 'Check date', className: 'text-amber-800' }
  }
  if (stamp < Date.now()) {
    return { label: 'Expired', className: 'text-destructive' }
  }
  return { label: 'Valid', className: 'text-emerald-700' }
}

function InlineCopy({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), 1500)
    return () => window.clearTimeout(timer)
  }, [copied])

  return (
    <button
      type="button"
      className="inline-flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      onClick={async (event) => {
        event.stopPropagation()
        try {
          await navigator.clipboard.writeText(value)
          setCopied(true)
        } catch {
          setCopied(false)
        }
      }}
      aria-label={copied ? `${label} copied` : `Copy ${label}`}
      title={copied ? 'Copied' : `Copy ${label}`}
    >
      {copied ? (
        <Check size={12} strokeWidth={2.25} aria-hidden />
      ) : (
        <Copy size={12} strokeWidth={2.25} aria-hidden />
      )}
    </button>
  )
}

export function ClientIdentityExtras({
  client,
  dueBalance,
  paidTotal,
  onOpenPayments,
  onOpenDocuments,
  onOpenProfile,
}: ClientIdentityExtrasProps) {
  const passport = client.passport?.trim() ?? ''
  const expiry = client.passportExpiry?.trim() ?? ''
  const status = passportTone(expiry)
  const spouse = client.spouseName?.trim() ?? ''

  return (
    <div className="flex flex-col gap-2 border-t border-border px-4 pb-4 pt-3">
      <button
        type="button"
        className="flex w-full items-baseline justify-between gap-3 rounded-lg px-0 py-0.5 text-left transition-colors hover:text-foreground"
        onClick={onOpenPayments}
      >
        <span className="text-xs text-muted-foreground">Due</span>
        <span
          className={cn(
            'text-sm font-semibold tabular-nums',
            dueBalance > 0 ? 'text-destructive' : 'text-foreground',
          )}
        >
          {formatBalance(dueBalance)}
        </span>
      </button>
      <button
        type="button"
        className="flex w-full items-baseline justify-between gap-3 rounded-lg px-0 py-0.5 text-left transition-colors hover:text-foreground"
        onClick={onOpenPayments}
      >
        <span className="text-xs text-muted-foreground">Paid</span>
        <span className="text-sm font-semibold tabular-nums text-foreground">
          {formatBalance(paidTotal)}
        </span>
      </button>

      <div className="mt-1 flex w-full items-start justify-between gap-2 rounded-lg px-0 py-0.5">
        <button
          type="button"
          className="min-w-0 flex-1 rounded-lg text-left transition-colors hover:bg-muted/40"
          onClick={() => onOpenDocuments('passport')}
        >
          <span className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Passport</span>
            <span className={cn('text-xs font-medium', status.className)}>
              {status.label}
            </span>
          </span>
          {passport ? (
            <span className="mt-0.5 block truncate font-mono text-sm font-semibold tracking-wide text-foreground">
              {passport}
            </span>
          ) : (
            <span className="mt-0.5 block text-sm text-muted-foreground">
              Add passport
            </span>
          )}
          {expiry ? (
            <span className="mt-0.5 block text-xs text-muted-foreground">
              {formatDisplayDate(expiry)}
            </span>
          ) : null}
        </button>
        {passport ? (
          <InlineCopy value={passport} label="Passport Number" />
        ) : null}
      </div>

      {spouse ? (
        <button
          type="button"
          className="flex w-full items-baseline justify-between gap-3 rounded-lg px-0 py-0.5 text-left transition-colors hover:text-foreground"
          onClick={onOpenProfile}
        >
          <span className="text-xs text-muted-foreground">Spouse</span>
          <span className="truncate text-sm font-medium text-foreground">
            {spouse}
          </span>
        </button>
      ) : null}
    </div>
  )
}
