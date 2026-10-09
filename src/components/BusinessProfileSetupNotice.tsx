import { Link } from 'react-router-dom'
import { Building2, X } from 'lucide-react'
import type { AgencyProfile } from '@/lib/agencyProfile'
import {
  agencyProfileIsIncomplete,
  listAgencyProfileGaps,
} from '@/lib/agencyProfileGaps'
import { settingsSectionPath } from '@/lib/workPaths'

type ProfileSource = Pick<AgencyProfile, 'businessName' | 'address' | 'mobile'>

type BusinessProfileSetupNoticeProps = {
  profile: ProfileSource
  /** Home nudge can be dismissed; invoice/docs notices stay until fixed. */
  onDismiss?: () => void
  variant?: 'home' | 'invoice' | 'documents'
}

export function BusinessProfileSetupNotice({
  profile,
  onDismiss,
  variant = 'home',
}: BusinessProfileSetupNoticeProps) {
  if (!agencyProfileIsIncomplete(profile)) return null

  const gaps = listAgencyProfileGaps(profile)
  const labels = gaps.map((gap) => gap.label.toLowerCase())
  const missing =
    labels.length === 1
      ? labels[0]
      : `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`

  const body =
    variant === 'invoice'
      ? `Add your ${missing} before sharing this invoice so clients see complete agency details.`
      : variant === 'documents'
        ? `Add your ${missing} before printing so embassy and manpower sheets show your agency name correctly.`
        : `Add your ${missing} so invoices and documents show the right agency details.`

  return (
    <aside
      className={`pd-profile-setup-notice pd-profile-setup-notice--${variant}`}
      role="status"
      aria-label="Business profile incomplete"
    >
      <span className="pd-profile-setup-notice__icon" aria-hidden>
        <Building2 size={16} strokeWidth={2} />
      </span>
      <div className="pd-profile-setup-notice__body">
        <p className="pd-profile-setup-notice__text">{body}</p>
        <Link
          to={settingsSectionPath('business')}
          className="pd-profile-setup-notice__link"
        >
          Open Business profile
        </Link>
      </div>
      {onDismiss ? (
        <button
          type="button"
          className="pd-profile-setup-notice__dismiss"
          aria-label="Dismiss business profile reminder"
          onClick={onDismiss}
        >
          <X size={14} strokeWidth={2} aria-hidden />
        </button>
      ) : null}
    </aside>
  )
}
