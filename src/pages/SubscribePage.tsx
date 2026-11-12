import { useEffect, useState, type FormEvent } from 'react'
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
import { Button } from '@/components/shadcn/button'
import { Input, Select } from '@/components/clients/clientShadcnFields'
import {
  validateRequiredEmail,
  validateRequiredName,
  validateRequiredPassword,
} from '@/lib/fieldValidation'
import { useTouchedFields } from '@/lib/useTouchedFields'
import type { PlanTemplate } from '@/types/billing'
import {
  authActionsClass,
  authBrandClass,
  authBrandLogoClass,
  authCardClass,
  authCornerLogoClass,
  authFormClass,
  authPageBackgroundStyle,
  authShellClass,
  authTextLinkClass,
  authTitleClass,
  usePublicBrandTheme,
} from '@/pages/auth/authShell'

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
  usePublicBrandTheme()
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
    <div className={authShellClass} style={authPageBackgroundStyle}>
      <img
        src={publicUrl('images/logo.svg')}
        alt={layoutConfig.brand.name}
        className={authCornerLogoClass}
        width={86}
        height={44}
        decoding="async"
      />

      <div className={authCardClass}>
        <div className={authBrandClass}>
          {layoutConfig.brand.logoUrl ? (
            <div className={authBrandLogoClass}>
              <img
                src={layoutConfig.brand.logoUrl}
                alt=""
                width={48}
                height={48}
                decoding="async"
                className="block size-full object-contain"
              />
            </div>
          ) : null}
          <h1 className={authTitleClass}>Start OneTrack</h1>
        </div>

        <div className={authActionsClass}>
          <form className={authFormClass} onSubmit={handleSubmit}>
            {plansError ? (
              <p className="m-0 text-sm text-destructive" role="alert">
                {plansError}
              </p>
            ) : null}

            <Select
              label="Plan"
              value={planId}
              disabled={isSubmitting || plans.length === 0}
              options={plans.map((plan) => ({
                value: plan.id,
                label: `${plan.name} · ${formatBdt(plan.priceBdt)}/${plan.interval === 'year' ? 'yr' : 'mo'}`,
              }))}
              onChange={(e) => setPlanId(e.target.value)}
            />

            <Input
              label="Agency Name"
              autoComplete="organization"
              value={agencyName}
              disabled={isSubmitting}
              error={showError('agencyName') ? agencyError : undefined}
              onBlur={blur('agencyName')}
              onChange={(e) => setAgencyName(e.target.value)}
              required
            />
            <Input
              label="Your Name"
              autoComplete="name"
              value={ownerName}
              disabled={isSubmitting}
              error={showError('ownerName') ? ownerNameError : undefined}
              onBlur={blur('ownerName')}
              onChange={(e) => setOwnerName(e.target.value)}
              required
            />
            <Input
              label="Work Email"
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
              <p className="m-0 text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}

            <Button
              type="submit"
              size="lg"
              className="h-9 rounded-lg"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Starting…' : 'Continue To Payment'}
              <ArrowRight size={16} strokeWidth={2.25} aria-hidden />
            </Button>

            <Link to="/login" className={authTextLinkClass}>
              Already have an account? Sign in
            </Link>
            <a href={marketingHomeUrl()} className={authTextLinkClass}>
              Back to OneTrack
            </a>
          </form>
        </div>
      </div>
    </div>
  )
}
