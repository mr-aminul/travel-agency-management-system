import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { layoutConfig } from '@/config/layout'
import {
  fetchPublicBillingPlans,
  publicSubscribe,
} from '@/lib/billing/billingApi'
import { formatBdt } from '@/lib/billing/format'
import { writeSession, type AuthSession, type AuthUser } from '@/lib/authApi'
import { useAuth } from '@/lib/auth'
import { postLoginPath } from '@/lib/authWorkspaces'
import { publicUrl } from '@/lib/publicUrl'
import { marketingHomeUrl } from '@/lib/siteOrigins'
import { Button, Input, Select } from '@/components/ui'
import {
  validateRequiredEmail,
  validateRequiredName,
  validateRequiredPassword,
} from '@/lib/fieldValidation'
import { useTouchedFields } from '@/lib/useTouchedFields'
import type { PlanTemplate } from '@/types/billing'
import '@/styles/layout-login.css'

function sessionFromSubscribe(result: {
  accessToken: string | null
  tenantId: string
  signedInAt?: string
  user?: { id: string; email: string; name: string; role: string }
}): AuthSession | null {
  if (!result.accessToken || !result.user) return null
  const role = result.user.role
  if (
    role !== 'agency_user' &&
    role !== 'platform_admin' &&
    role !== 'sub_agent'
  ) {
    return null
  }
  const user: AuthUser = {
    id: result.user.id,
    email: result.user.email,
    name: result.user.name,
    role,
  }
  return {
    accessToken: result.accessToken,
    tenantId: result.tenantId,
    signedInAt: result.signedInAt || new Date().toISOString(),
    user,
  }
}

export default function SubscribePage() {
  const [searchParams] = useSearchParams()
  const { status, session } = useAuth()
  const preselectedPlan = String(searchParams.get('plan') || 'growth').trim()

  const [plans, setPlans] = useState<PlanTemplate[]>([])
  const [planId, setPlanId] = useState(preselectedPlan)
  const [agencyName, setAgencyName] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [ownerEmail, setOwnerEmail] = useState('')
  const [ownerPassword, setOwnerPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [plansError, setPlansError] = useState<string | null>(null)

  const { markAllTouched, showError, blur } = useTouchedFields<
    'agencyName' | 'ownerName' | 'ownerEmail' | 'ownerPassword'
  >()

  const agencyError = validateRequiredName(agencyName, 'Agency name')
  const ownerNameError = validateRequiredName(ownerName, 'Your name')
  const emailError = validateRequiredEmail(ownerEmail)
  const passwordError = validateRequiredPassword(ownerPassword)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const catalog = await fetchPublicBillingPlans()
        if (cancelled) return
        const sorted = [...catalog.plans].sort(
          (a, b) => a.sortOrder - b.sortOrder,
        )
        setPlans(sorted)
        setPlansError(null)
        setPlanId((current) =>
          sorted.some((plan) => plan.id === current)
            ? current
            : sorted[0]?.id || current,
        )
      } catch (err) {
        if (!cancelled) {
          setPlansError(
            err instanceof Error ? err.message : 'Could not load plans.',
          )
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.id === planId) ?? null,
    [plans, planId],
  )

  if (status === 'authenticated' && session) {
    return <Navigate to={postLoginPath(session)} replace />
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    markAllTouched([
      'agencyName',
      'ownerName',
      'ownerEmail',
      'ownerPassword',
    ])
    if (agencyError || ownerNameError || emailError || passwordError) return
    if (!planId) {
      setError('Choose a plan.')
      return
    }

    setIsSubmitting(true)
    try {
      const result = await publicSubscribe({
        agencyName,
        ownerName,
        ownerEmail,
        ownerPassword,
        planId,
        returnUrl: `${window.location.origin}/billing`,
      })
      const nextSession = sessionFromSubscribe(result)
      if (nextSession) writeSession(nextSession)

      if (result.redirectUrl) {
        window.location.href = result.redirectUrl
        return
      }
      window.location.href = result.activated
        ? '/billing?payment=success'
        : '/billing'
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Could not start checkout.',
      )
      setIsSubmitting(false)
    }
  }

  return (
    <div className="pd-login">
      <img
        src={publicUrl('images/logo.svg')}
        alt={layoutConfig.brand.name}
        className="pd-login__corner-logo"
        width={86}
        height={44}
        decoding="async"
      />

      <div className="pd-login__card">
        <div className="pd-login__brand">
          {layoutConfig.brand.logoUrl ? (
            <div className="pd-app-logo pd-login__brand-logo">
              <img
                src={layoutConfig.brand.logoUrl}
                alt=""
                width={48}
                height={48}
                decoding="async"
              />
            </div>
          ) : null}
          <h1 className="pd-login__title">Start OneTrack</h1>
          <p className="pd-login__subtitle">
            Create your agency, then pay securely with Paymently (bKash, Nagad,
            and more). Access activates after payment.
          </p>
        </div>

        <div className="pd-login__actions">
          <form className="pd-login__form" onSubmit={handleSubmit}>
            {plansError ? (
              <p className="pd-field__error" role="alert">
                {plansError}
              </p>
            ) : null}

            <Select
              label="Plan"
              labelVariant="default"
              value={planId}
              disabled={isSubmitting || plans.length === 0}
              options={plans.map((plan) => ({
                value: plan.id,
                label: `${plan.name} · ${formatBdt(plan.priceBdt)}/mo`,
              }))}
              onChange={(e) => setPlanId(e.target.value)}
            />

            {selectedPlan ? (
              <p className="pd-login__subtitle" style={{ margin: 0 }}>
                {selectedPlan.description || selectedPlan.name}. First month{' '}
                {formatBdt(selectedPlan.priceBdt)}.
              </p>
            ) : null}

            <Input
              label="Agency name"
              labelVariant="default"
              autoComplete="organization"
              value={agencyName}
              disabled={isSubmitting}
              error={showError('agencyName') ? agencyError : undefined}
              onBlur={blur('agencyName')}
              onChange={(e) => setAgencyName(e.target.value)}
              required
            />
            <Input
              label="Your name"
              labelVariant="default"
              autoComplete="name"
              value={ownerName}
              disabled={isSubmitting}
              error={showError('ownerName') ? ownerNameError : undefined}
              onBlur={blur('ownerName')}
              onChange={(e) => setOwnerName(e.target.value)}
              required
            />
            <Input
              label="Work email"
              labelVariant="default"
              type="email"
              autoComplete="email"
              value={ownerEmail}
              disabled={isSubmitting}
              error={showError('ownerEmail') ? emailError : undefined}
              onBlur={blur('ownerEmail')}
              onChange={(e) => setOwnerEmail(e.target.value)}
              required
            />
            <Input
              label="Password"
              labelVariant="default"
              type="password"
              autoComplete="new-password"
              value={ownerPassword}
              disabled={isSubmitting}
              error={showError('ownerPassword') ? passwordError : undefined}
              onBlur={blur('ownerPassword')}
              onChange={(e) => setOwnerPassword(e.target.value)}
              required
            />

            {error ? (
              <p className="pd-field__error" role="alert">
                {error}
              </p>
            ) : null}

            <Button type="submit" size="lg" loading={isSubmitting}>
              Continue to payment
              <ArrowRight size={16} strokeWidth={2.25} aria-hidden />
            </Button>

            <Link to="/login" className="pd-login__text-link">
              Already have an account? Sign in
            </Link>
            <a href={marketingHomeUrl()} className="pd-login__text-link">
              Back to OneTrack
            </a>
          </form>
        </div>
      </div>
    </div>
  )
}
