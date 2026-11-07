import { Button } from '@/components/shadcn/button'
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
        <h1>{isSuspended ? 'Agency Suspended' : 'Subscription Ended'}</h1>
        <p>
          {isSuspended
            ? 'This agency is suspended. Contact inventivelab support if you believe this is a mistake.'
            : 'Your trial or subscription has ended. Choose a plan to restore access — your data is still here.'}
        </p>
        <div className="pd-billing-wall__actions">
          {!isSuspended && onBilling ? (
            <Button className="h-9 rounded-lg" onClick={onBilling}>Choose A Plan</Button>
          ) : null}
          <Button variant="ghost" className="h-9 rounded-lg" onClick={onSignOut}>
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  )
}
