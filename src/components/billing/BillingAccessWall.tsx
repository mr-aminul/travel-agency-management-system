import { Button } from '@/components/shadcn/button'
import '@/styles/layout-billing.css'

type Props = {
  kind: 'expired' | 'suspended'
  /** Server access.reason — e.g. trial_expired vs canceled. */
  reason?: string
  onBilling?: () => void
  onSignOut: () => void
}

export function BillingAccessWall({
  kind,
  reason,
  onBilling,
  onSignOut,
}: Props) {
  const isSuspended = kind === 'suspended'
  const isTrialEnded = reason === 'trial_expired'
  const title = isSuspended
    ? 'Agency Suspended'
    : isTrialEnded
      ? 'Trial Ended'
      : 'Subscription Ended'
  const body = isSuspended
    ? 'This agency is suspended. Contact inventivelab support if you believe this is a mistake.'
    : isTrialEnded
      ? 'Your free trial has ended. Choose a plan to keep working — your data is still here.'
      : 'Your subscription has ended. Choose a plan to restore access — your data is still here.'

  return (
    <div className="pd-billing-wall" aria-label={title}>
      <div className="pd-billing-wall__card">
        <h1>{title}</h1>
        <p>{body}</p>
        <div className="pd-billing-wall__actions">
          {!isSuspended && onBilling ? (
            <Button className="h-9 rounded-lg" onClick={onBilling}>
              Choose A Plan
            </Button>
          ) : null}
          <Button
            variant="ghost"
            className="h-9 rounded-lg"
            onClick={onSignOut}
          >
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  )
}
