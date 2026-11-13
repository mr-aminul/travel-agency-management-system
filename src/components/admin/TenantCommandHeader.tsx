import { useEffect, useRef, useState, type Ref } from 'react'
import { Check, ExternalLink, Mail, Pencil, X } from 'lucide-react'
import { readAgencyProfile } from '@/lib/agencyProfile'
import { cn } from '@/lib/utils'
import type { Tenant, TenantStatus } from '@/types/tenant'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/shadcn/avatar'
import { Button } from '@/components/shadcn/button'
import { Input } from '@/components/shadcn/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shadcn/select'

const STATUS_OPTIONS: { value: TenantStatus; label: string }[] = [
  { value: 'trial', label: 'Trial' },
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
]

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

function statusTone(status: TenantStatus) {
  if (status === 'suspended') return 'border-destructive/40 bg-destructive/10'
  if (status === 'trial') return 'border-amber-500/35 bg-amber-500/10'
  return 'border-emerald-500/35 bg-emerald-500/10'
}

export type TenantCommandHeaderProps = {
  tenant: Tenant
  ownerName?: string
  ownerEmail?: string
  supportBusy: boolean
  supportError?: string
  canOpenSupport: boolean
  statusTriggerRef?: Ref<HTMLButtonElement>
  onStatusChange: (status: TenantStatus) => void
  onOpenSupport: () => void
  onRename: (name: string) => void
}

export function TenantCommandHeader({
  tenant,
  ownerName,
  ownerEmail,
  supportBusy,
  supportError,
  canOpenSupport,
  statusTriggerRef,
  onStatusChange,
  onOpenSupport,
  onRename,
}: TenantCommandHeaderProps) {
  const ownerLine = [ownerName, ownerEmail].filter(Boolean).join(' · ')
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(tenant.name)
  const [error, setError] = useState<string | undefined>()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!editing) setDraft(tenant.name)
  }, [editing, tenant.name])

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  const cancelEdit = () => {
    setEditing(false)
    setDraft(tenant.name)
    setError(undefined)
  }

  const saveEdit = () => {
    setError(undefined)
    try {
      onRename(draft)
      setEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not rename agency.')
    }
  }

  return (
    <header
      className="flex flex-col gap-3 rounded-xl border border-border bg-card px-4 py-3.5 shadow-sm sm:flex-row sm:items-center sm:justify-between"
      aria-label="Tenant"
    >
      <div className="flex min-w-0 items-center gap-3">
        <Avatar
          size="lg"
          className="size-12 shrink-0 rounded-lg border border-border bg-muted after:rounded-lg"
        >
          <AvatarImage
            src={readAgencyProfile(tenant.id).profilePicture ?? undefined}
            alt=""
            className="rounded-lg"
          />
          <AvatarFallback className="rounded-lg">
            {initials(tenant.name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="flex min-w-0 flex-col gap-1.5">
              <div className="flex min-w-0 items-center gap-1.5">
                <Input
                  ref={inputRef}
                  aria-label="Name"
                  aria-invalid={error ? true : undefined}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      saveEdit()
                    }
                    if (event.key === 'Escape') {
                      event.preventDefault()
                      cancelEdit()
                    }
                  }}
                  className="h-9 max-w-md rounded-lg"
                />
                <Button
                  type="button"
                  size="sm"
                  className="h-9 shrink-0 rounded-lg px-2.5"
                  onClick={saveEdit}
                  aria-label="Save"
                >
                  <Check size={14} strokeWidth={2.25} aria-hidden />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-9 shrink-0 rounded-lg px-2.5"
                  onClick={cancelEdit}
                  aria-label="Cancel"
                >
                  <X size={14} strokeWidth={2.25} aria-hidden />
                </Button>
              </div>
              {error ? (
                <p className="m-0 text-sm text-destructive" role="alert">
                  {error}
                </p>
              ) : null}
            </div>
          ) : (
            <div className="flex min-w-0 items-center gap-1.5">
              <h1 className="m-0 truncate text-lg font-semibold tracking-tight text-foreground">
                {tenant.name}
              </h1>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 w-8 shrink-0 rounded-lg p-0 text-muted-foreground hover:text-foreground"
                onClick={() => setEditing(true)}
                aria-label="Edit"
              >
                <Pencil size={14} strokeWidth={2.25} aria-hidden />
              </Button>
            </div>
          )}
          {ownerLine ? (
            <p className="m-0 mt-0.5 truncate text-sm text-muted-foreground">
              {ownerLine}
            </p>
          ) : (
            <p className="m-0 mt-0.5 text-sm text-destructive">No active owner</p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={tenant.status}
          onValueChange={(next) => onStatusChange(next as TenantStatus)}
        >
          <SelectTrigger
            ref={statusTriggerRef}
            aria-label="Status"
            className={cn(
              'h-9 w-[8.5rem] rounded-lg font-medium',
              statusTone(tenant.status),
            )}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {ownerEmail ? (
          <Button size="sm" variant="outline" className="h-9 rounded-lg" asChild>
            <a href={`mailto:${ownerEmail}`}>
              <Mail size={14} strokeWidth={2.25} aria-hidden />
              Email
            </a>
          </Button>
        ) : null}

        <Button
          size="sm"
          className="h-9 rounded-lg shadow-xs"
          onClick={onOpenSupport}
          disabled={supportBusy || !canOpenSupport}
        >
          <ExternalLink size={14} strokeWidth={2.25} aria-hidden />
          {supportBusy ? 'Opening…' : 'Open Support'}
        </Button>
      </div>

      {supportError ? (
        <p className="m-0 w-full text-sm text-destructive sm:basis-full" role="alert">
          {supportError}
        </p>
      ) : null}
    </header>
  )
}
