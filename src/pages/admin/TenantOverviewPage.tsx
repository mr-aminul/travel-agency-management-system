import { useState, type ReactNode } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import {
  Building2,
  CircleDot,
  NotebookPen,
  type LucideIcon,
} from 'lucide-react'
import { ADMIN_AGENCIES, adminAgencyPath } from '@/lib/adminPaths'
import { useTenantMembersByTenantId } from '@/lib/tenantMembersStore'
import {
  setTenantStatus,
  updateTenantName,
  useTenantById,
} from '@/lib/tenantsStore'
import type { TenantStatus } from '@/types/tenant'
import { Button, Input, Select } from '@/components/ui'

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
  const [billingNotes, setBillingNotes] = useState('')

  if (!tenant) {
    return <Navigate to={ADMIN_AGENCIES} replace />
  }

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
                aria-label="Status"
                value={tenant.status}
                options={STATUS_OPTIONS}
                onChange={(event) => {
                  const next = event.target.value as TenantStatus
                  setTenantStatus(tenant.id, next)
                }}
              />
            </dd>
          </div>
          <div className="pd-client-detail__field">
            <FieldLabel icon={Building2}>Name</FieldLabel>
            <dd>
              <Input
                aria-label="Name"
                value={displayName}
                onChange={(event) => setNameDraft(event.target.value)}
                error={nameError}
              />
              {nameDraft != null && nameDraft.trim() !== tenant.name ? (
                <div className="pd-admin__row-actions">
                  <Button size="sm" onClick={handleRename}>
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
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
          <div className="pd-client-detail__field">
            <FieldLabel icon={NotebookPen}>Billing notes</FieldLabel>
            <dd>
              <Input
                aria-label="Billing notes"
                value={billingNotes}
                onChange={(event) => setBillingNotes(event.target.value)}
                placeholder="Trial end · plan"
              />
            </dd>
          </div>
        </dl>
        {!owner ? (
          <p className="pd-admin__quiet">
            No active user for Support Mode.{' '}
            <Link to={adminAgencyPath(tenant.id, 'people')}>Add people</Link>.
          </p>
        ) : null}
      </section>
    </div>
  )
}
