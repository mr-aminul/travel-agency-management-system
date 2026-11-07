import { useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  Building2,
  CircleDot,
  type LucideIcon,
} from 'lucide-react'
import { adminAgencyPath } from '@/lib/adminPaths'
import { useTenantMembersByTenantId } from '@/lib/tenantMembersStore'
import {
  setTenantStatus,
  updateTenantName,
  useTenantById,
} from '@/lib/tenantsStore'
import type { TenantStatus } from '@/types/tenant'
import { Button } from '@/components/shadcn/button'
import { Input } from '@/components/shadcn/input'
import {
  adminQuietClass,
  adminRowActionsClass,
} from '@/components/admin/adminChrome'
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

function FieldLabel({
  icon: Icon,
  children,
}: {
  icon: LucideIcon
  children: ReactNode
}) {
  return (
    <dt>
      <span className="pd-client-detail__field-icon" aria-hidden>
        <Icon size={13} strokeWidth={2.25} />
      </span>
      {children}
    </dt>
  )
}

export default function TenantOverviewPage() {
  const { tenantId = '' } = useParams()
  const tenant = useTenantById(tenantId)
  const members = useTenantMembersByTenantId(tenantId)
  const [nameDraft, setNameDraft] = useState<string | null>(null)
  const [nameError, setNameError] = useState<string | undefined>()

  // Layout owns the missing-agency redirect.
  if (!tenant) return null

  const displayName = nameDraft ?? tenant.name
  const owner =
    members.find((m) => m.role === 'owner' && m.status === 'active') ??
    members.find((m) => m.role === 'manager' && m.status === 'active') ??
    members.find((m) => m.status === 'active')

  const handleRename = () => {
    setNameError(undefined)
    try {
      updateTenantName(tenant.id, displayName)
      setNameDraft(null)
    } catch (error) {
      setNameError(
        error instanceof Error ? error.message : 'Could not rename agency.',
      )
    }
  }

  return (
    <div className="pd-client-detail__overview" aria-label="Overview">
      <section className="pd-client-detail__section pd-client-detail__section--compact">
        <div className="pd-client-detail__section-head">
          <SectionTitle icon={Building2}>Agency</SectionTitle>
        </div>
        <dl className="pd-client-detail__fields">
          <div className="pd-client-detail__field">
            <FieldLabel icon={CircleDot}>Status</FieldLabel>
            <dd>
              <Select
                value={tenant.status}
                onValueChange={(next) =>
                  setTenantStatus(tenant.id, next as TenantStatus)
                }
              >
                <SelectTrigger aria-label="Status" className="h-9 w-full min-w-[10rem]">
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
            </dd>
          </div>
          <div className="pd-client-detail__field">
            <FieldLabel icon={Building2}>Name</FieldLabel>
            <dd>
              <Input
                aria-label="Name"
                aria-invalid={nameError ? true : undefined}
                value={displayName}
                onChange={(event) => setNameDraft(event.target.value)}
              />
              {nameError ? (
                <p className="m-0 mt-1 text-sm text-destructive" role="alert">
                  {nameError}
                </p>
              ) : null}
              {nameDraft != null && nameDraft.trim() !== tenant.name ? (
                <div className={adminRowActionsClass}>
                  <Button size="sm" className="h-9 rounded-lg" onClick={handleRename}>
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-9 rounded-lg"
                    onClick={() => {
                      setNameDraft(null)
                      setNameError(undefined)
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              ) : null}
            </dd>
          </div>
        </dl>
        {!owner ? (
          <p className={adminQuietClass}>
            No active user for Support Mode.{' '}
            <Link to={adminAgencyPath(tenant.id, 'people')}>Add people</Link>.
          </p>
        ) : null}
      </section>
    </div>
  )
}
