import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  Building2,
  Check,
  Globe,
  MapPin,
  Phone,
  Users,
  Handshake,
  Package,
} from 'lucide-react'
import { ProfilePhotoField } from '@/components/ProfilePhotoField'
import { Input, Textarea } from '@/components/clients/clientShadcnFields'
import { SettingsInfo } from '@/components/settings/SettingsInfo'
import { Badge } from '@/components/shadcn/badge'
import { Button } from '@/components/shadcn/button'
import {
  DEFAULT_BRAND_NAME,
  fileToProfilePictureDataUrl,
  type AgencyProfile,
} from '@/lib/agencyProfile'
import type { AgencyProfileGapId } from '@/lib/agencyProfileGaps'
import {
  daysUntil,
  formatBdt,
  formatDate,
  statusLabel,
} from '@/lib/billing/format'
import { useBilling } from '@/lib/billing/useBilling'
import { cx } from '@/lib/cx'
import { settingsSectionPath } from '@/lib/workPaths'
import '@/styles/layout-billing.css'

type Props = {
  title: string
  info: string
  draft: AgencyProfile
  error: string | null
  status: string | null
  missingGapIds: Set<AgencyProfileGapId>
  onChange: <K extends keyof AgencyProfile>(
    key: K,
    value: AgencyProfile[K],
  ) => void
  /** Persist logo immediately (draft + store), separate from Save profile. */
  onPictureChange: (photoUrl: string | null) => void
  onSave: (event: FormEvent) => void
}

function meterClass(tone: string | undefined): string {
  if (tone === 'full') return 'is-full'
  if (tone === 'warn') return 'is-warn'
  return ''
}

function badgeVariant(
  status: string,
): 'default' | 'secondary' | 'outline' | 'destructive' {
  if (status === 'active' || status === 'paid') return 'default'
  if (status === 'trial' || status === 'open') return 'secondary'
  if (status === 'past_due' || status === 'pending_review') return 'outline'
  if (status === 'suspended' || status === 'canceled' || status === 'failed') {
    return 'destructive'
  }
  return 'secondary'
}

function MeterProgress({ value, max = 100 }: { value: number; max?: number }) {
  const safeMax = max <= 0 ? 100 : max
  const clamped = Math.min(safeMax, Math.max(0, value))
  const percent = Math.round((clamped / safeMax) * 100)
  return (
    <div
      className="h-1.5 overflow-hidden rounded-full bg-muted"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={safeMax}
      aria-valuenow={clamped}
    >
      <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
    </div>
  )
}

export function BusinessProfileSection({
  title,
  info,
  draft,
  error,
  status,
  missingGapIds,
  onChange,
  onPictureChange,
  onSave,
}: Props) {
  const { snapshot, loading: billingLoading } = useBilling()
  const billing = snapshot?.billing
  const trialDays = daysUntil(billing?.trialEndsAt)
  const fieldMissing = (id: AgencyProfileGapId) => missingGapIds.has(id)

  return (
    <div className="pd-business-profile">
      <header className="pd-settings-panel__header pd-business-profile__header">
        <h2 id="settings-panel-title" className="pd-settings-panel__title">
          {title}
        </h2>
        {info ? <SettingsInfo title={title} body={info} /> : null}
      </header>

      <div className="pd-business-profile__body">
      <div className="pd-business-profile__main">
        <form className="pd-business-profile__card" onSubmit={onSave}>
          <div className="pd-business-profile__identity">
            <ProfilePhotoField
              name={draft.businessName || DEFAULT_BRAND_NAME}
              fallbackName={DEFAULT_BRAND_NAME}
              kind="business"
              value={draft.profilePicture ?? undefined}
              encodeFile={fileToProfilePictureDataUrl}
              onChange={(photoUrl) => onPictureChange(photoUrl ?? null)}
            />
            <div className="pd-business-profile__identity-copy">
              <h3 className="pd-business-profile__company">
                {draft.businessName.trim() || 'Your agency'}
              </h3>
            </div>
          </div>

          <div className="pd-business-profile__fields">
            <div
              className={cx(
                'pd-settings-form__field',
                fieldMissing('businessName') && 'is-attention',
              )}
            >
              <Input
                label="Company Name"
                name="businessName"
                autoComplete="organization"
                placeholder="Your travel agency name"
                required
                value={draft.businessName}
                onChange={(e) => onChange('businessName', e.target.value)}
              />
            </div>

            <div
              className={cx(
                'pd-settings-form__field',
                fieldMissing('address') && 'is-attention',
              )}
            >
              <Textarea
                label="Address"
                name="address"
                autoComplete="street-address"
                placeholder="Office address"
                rows={3}
                required
                value={draft.address}
                onChange={(e) => onChange('address', e.target.value)}
              />
            </div>

            <div className="pd-business-profile__grid">
              <div
                className={cx(
                  'pd-settings-form__field',
                  fieldMissing('mobile') && 'is-attention',
                )}
              >
                <Input
                  label="Mobile Number"
                  name="mobile"
                  type="tel"
                  autoComplete="tel"
                  placeholder="e.g. 01700 000000"
                  required
                  value={draft.mobile}
                  onChange={(e) => onChange('mobile', e.target.value)}
                />
              </div>
              <Input
                label="Website"
                name="website"
                type="text"
                autoComplete="url"
                placeholder="e.g. rhbd.com"
                value={draft.website}
                onChange={(e) => onChange('website', e.target.value)}
              />
            </div>
          </div>

          <div className="pd-business-profile__preview" aria-label="Preview">
            <div className="pd-business-profile__preview-item">
              <Building2 size={14} strokeWidth={2.25} aria-hidden />
              <span>{draft.businessName.trim() || '—'}</span>
            </div>
            <div className="pd-business-profile__preview-item">
              <MapPin size={14} strokeWidth={2.25} aria-hidden />
              <span>{draft.address.trim() || '—'}</span>
            </div>
            <div className="pd-business-profile__preview-item">
              <Phone size={14} strokeWidth={2.25} aria-hidden />
              <span>{draft.mobile.trim() || '—'}</span>
            </div>
            <div className="pd-business-profile__preview-item">
              <Globe size={14} strokeWidth={2.25} aria-hidden />
              <span>{draft.website.trim() || '—'}</span>
            </div>
          </div>

          <div className="pd-settings-form__footer">
            <p
              className={cx(
                'pd-settings-form__status',
                error && 'pd-settings-form__status--error',
              )}
              role={error ? 'alert' : undefined}
            >
              {error ?? status ?? ''}
            </p>
            <Button type="submit" className="h-9 rounded-lg">
              <Check size={16} strokeWidth={2.25} aria-hidden />
              Save Profile
            </Button>
          </div>
        </form>
      </div>

      <aside className="pd-business-profile__aside" aria-label="Workspace summary">
        <section className="pd-business-profile__summary-card">
          <div className="pd-business-profile__summary-head">
            <span className="pd-business-profile__summary-icon" aria-hidden>
              <Package size={15} strokeWidth={2.25} />
            </span>
            <h3 className="pd-business-profile__summary-title">Package</h3>
          </div>
          {billingLoading && !snapshot ? (
            <p className="pd-business-profile__summary-quiet">Loading…</p>
          ) : snapshot ? (
            <>
              <div className="pd-business-profile__package-row">
                <strong>{snapshot.plan?.name ?? 'No plan'}</strong>
                <Badge
                  variant={badgeVariant(billing?.billingStatus ?? 'trial')}
                >
                  {statusLabel(billing?.billingStatus ?? 'trial')}
                </Badge>
              </div>
              <p className="pd-business-profile__summary-meta">
                {billing?.billingStatus === 'trial'
                  ? trialDays != null && trialDays > 0
                    ? `Trial ends ${formatDate(billing.trialEndsAt)} · ${trialDays}d left`
                    : `Trial ended ${formatDate(billing.trialEndsAt)}`
                  : billing?.currentPeriodEnd
                    ? `Renews ${formatDate(billing.currentPeriodEnd)} · ${formatBdt(snapshot.plan?.priceBdt ?? 0)}/${snapshot.plan?.interval === 'year' ? 'yr' : 'mo'}`
                    : snapshot.plan
                      ? `${formatBdt(snapshot.plan.priceBdt)} / ${snapshot.plan.interval === 'year' ? 'year' : 'month'}`
                      : 'Choose a plan under Billing.'}
              </p>
              <Link
                className="pd-business-profile__summary-link"
                to={settingsSectionPath('billing')}
              >
                Manage billing
              </Link>
            </>
          ) : (
            <p className="pd-business-profile__summary-quiet">
              Billing summary unavailable offline.
            </p>
          )}
        </section>

        <section className="pd-business-profile__summary-card">
          <div className="pd-business-profile__summary-head">
            <span className="pd-business-profile__summary-icon" aria-hidden>
              <Users size={15} strokeWidth={2.25} />
            </span>
            <h3 className="pd-business-profile__summary-title">Users</h3>
          </div>
          {snapshot ? (
            <div
              className={cx(
                'pd-billing__meter',
                meterClass(snapshot.tones.users),
              )}
            >
              <div className="pd-billing__meter-label">
                <span>Seats</span>
                <span>
                  {snapshot.usage.seatCommit}/{snapshot.limits.userLimit}
                </span>
              </div>
              <MeterProgress
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
          ) : (
            <p className="pd-business-profile__summary-quiet">—</p>
          )}
        </section>

        <section className="pd-business-profile__summary-card">
          <div className="pd-business-profile__summary-head">
            <span className="pd-business-profile__summary-icon" aria-hidden>
              <Handshake size={15} strokeWidth={2.25} />
            </span>
            <h3 className="pd-business-profile__summary-title">Sub Agents</h3>
          </div>
          {snapshot ? (
            <div
              className={cx(
                'pd-billing__meter',
                meterClass(snapshot.tones.subAgents),
              )}
            >
              <div className="pd-billing__meter-label">
                <span>Agents</span>
                <span>
                  {snapshot.usage.subAgents}/{snapshot.limits.subAgentLimit}
                </span>
              </div>
              <MeterProgress
                value={snapshot.usage.subAgents}
                max={Math.max(1, snapshot.limits.subAgentLimit)}
              />
              <span className="pd-billing__meter-value">
                {snapshot.usage.subAgents === 0
                  ? 'None linked yet'
                  : `${snapshot.usage.subAgents} on this plan`}
              </span>
            </div>
          ) : (
            <p className="pd-business-profile__summary-quiet">—</p>
          )}
        </section>
      </aside>
      </div>
    </div>
  )
}
