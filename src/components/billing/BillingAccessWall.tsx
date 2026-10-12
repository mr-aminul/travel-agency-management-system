import { Button } from '@/components/ui'
import '@/styles/layout-billing.css'

type Props = {
  kind: 'expired' | 'suspended'
  onBilling?: () => void
  onSignOut: () => void
}

export function BillingAccessWall({ kind, onBilling, onSignOut }: Props) {
  const isSuspended = kind === 'suspended'
  return (
    <div className="pd-billing-wall" aria-label={isSuspended ? 'Suspended' : 'Subscription ended'}>
      <div className="pd-billing-wall__card">
        <h1>{isSuspended ? 'Agency suspended' : 'Subscription ended'}</h1>
        <p>
          {isSuspended
            ? 'This agency is suspended. Contact inventivelab support if you believe this is a mistake.'
            : 'Your trial or subscription has ended. Choose a plan to restore access — your data is still here.'}
        </p>
        <div className="pd-billing-wall__actions">
          {!isSuspended && onBilling ? (
            <Button onClick={onBilling}>Choose a plan</Button>
          ) : null}
          <Button variant="ghost" onClick={onSignOut}>
            Sign out
          </Button>
        </div>
      </div>
    </div>
  )
}
