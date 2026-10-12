import { useCallback } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { BillingSettingsSection } from '@/components/billing/BillingSettingsSection'
import { Button } from '@/components/ui'
import { useAuth } from '@/lib/auth'
import { queryClient } from '@/lib/queryClient'
import '@/styles/layout-billing.css'
import '@/styles/layout-settings.css'

/** Standalone billing surface for trial-expired / plan changes without the full shell. */
export default function BillingPage() {
  const { status, user, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = useCallback(async () => {
    queryClient.clear()
    await signOut()
    navigate('/login', { replace: true })
  }, [navigate, signOut])

  if (status !== 'authenticated' || !user) {
    return <Navigate to="/login" replace />
  }

  if (user.role === 'platform_admin') {
    return <Navigate to="/admin" replace />
  }

  return (
    <div className="pd-billing-wall" style={{ alignItems: 'start', paddingTop: '2.5rem' }}>
      <div
        className="pd-billing-wall__card"
        style={{ width: 'min(100%, 52rem)', textAlign: 'left' }}
      >
        <div className="pd-billing__checkout-head">
          <div>
            <h1 style={{ margin: 0, fontSize: '1.35rem' }}>Billing</h1>
            <p className="pd-billing__meta">
              Pick a plan and submit payment to restore full access.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => void handleSignOut()}>
            Sign out
          </Button>
        </div>
        <BillingSettingsSection
          title="Subscription"
          info="Plans unlock modules and monthly limits for users, sub agents, storage, and SMS."
        />
      </div>
    </div>
  )
}
