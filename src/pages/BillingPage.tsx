import { useCallback, useMemo } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
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
  const [searchParams] = useSearchParams()

  const paymentBanner = useMemo(() => {
    const payment = searchParams.get('payment')
    if (payment === 'success') {
      return {
        tone: 'ok' as const,
        text: 'Payment received. Your subscription is active.',
      }
    }
    if (payment === 'pending') {
      return {
        tone: 'pending' as const,
        text: 'Payment is still processing. Refresh in a moment if access does not unlock.',
      }
    }
    if (payment === 'canceled') {
      return {
        tone: 'warn' as const,
        text: 'Payment was canceled. Choose a plan again when you are ready.',
      }
    }
    if (payment === 'failed' || payment === 'error') {
      const reason = searchParams.get('reason')
      return {
        tone: 'error' as const,
        text:
          reason ||
          'Payment could not be confirmed. Try again or contact support.',
      }
    }
    return null
  }, [searchParams])

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
              Pick a plan and pay online to restore full access.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => void handleSignOut()}>
            Sign out
          </Button>
        </div>
        {paymentBanner ? (
          <p
            className={
              paymentBanner.tone === 'error' || paymentBanner.tone === 'warn'
                ? 'pd-settings-form__status pd-settings-form__status--error'
                : 'pd-settings-form__status'
            }
            role="status"
          >
            {paymentBanner.text}
          </p>
        ) : null}
        <BillingSettingsSection
          title="Subscription"
          info="Plans unlock modules and monthly limits for users, sub agents, storage, and SMS. Online payment runs through Paymently."
        />
      </div>
    </div>
  )
}
