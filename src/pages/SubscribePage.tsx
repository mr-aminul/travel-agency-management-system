import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { layoutConfig } from '@/config/layout'
import { publicSubscribe } from '@/lib/billing/billingApi'
import { TRIAL_PLAN_ID } from '@/lib/billing/planCatalog'
import { useAuth } from '@/lib/auth'
import { postLoginPath } from '@/lib/authWorkspaces'
import { publicUrl } from '@/lib/publicUrl'
import { marketingHomeUrl } from '@/lib/siteOrigins'
import { Button } from '@/components/shadcn/button'
import { Input } from '@/components/clients/clientShadcnFields'
import {
  validateNewPassword,
  validateRequiredEmail,
  validateRequiredName,
  validateRequiredPhone,
} from '@/lib/fieldValidation'
import { useTouchedFields } from '@/lib/useTouchedFields'
import {
  authActionsClass,
  authBrandClass,
  authBrandLogoClass,
  authCardWideClass,
  authCornerLogoClass,
  authFormClass,
  authFormRowClass,
  authInlineLinkClass,
  authInputClass,
  authOutsideLinkClass,
  authPageBackgroundStyle,
  authShellClass,
  authStackClass,
  authSubmitClass,
  authTitleClass,
  usePublicBrandTheme,
} from '@/pages/auth/authShell'

export default function SubscribePage() {
  usePublicBrandTheme()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { status, session, signInWithPassword } = useAuth()
  const planId =
    String(searchParams.get('plan') || '').trim() || TRIAL_PLAN_ID

  const [ownerName, setOwnerName] = useState('')
  const [ownerEmail, setOwnerEmail] = useState('')
  const [agencyName, setAgencyName] = useState('')
  const [ownerMobile, setOwnerMobile] = useState('')
  const [ownerPassword, setOwnerPassword] = useState('')
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { markAllTouched, showError, blur } = useTouchedFields<
    | 'agencyName'
    | 'ownerName'
    | 'ownerEmail'
    | 'ownerMobile'
    | 'ownerPassword'
  >()

  const ownerNameError = validateRequiredName(ownerName, 'Your name')
  const emailError = validateRequiredEmail(ownerEmail)
  const agencyError = validateRequiredName(agencyName, 'Name of business')
  const mobileError = validateRequiredPhone(ownerMobile)
  const passwordError = validateNewPassword(ownerPassword)

  if (status === 'authenticated' && session) {
    return <Navigate to={postLoginPath(session)} replace />
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    markAllTouched([
      'ownerName',
      'ownerEmail',
      'agencyName',
      'ownerMobile',
      'ownerPassword',
    ])
    if (
      ownerNameError ||
      emailError ||
      agencyError ||
      mobileError ||
      passwordError
    ) {
      return
    }

    setIsSubmitting(true)
    try {
      await publicSubscribe({
        agencyName,
        ownerName,
        ownerEmail,
        ownerMobile,
        ownerPassword,
        planId,
        acceptedTerms: true,
      })
      const next = await signInWithPassword(ownerEmail, ownerPassword, {
        intent: 'agency',
      })
      navigate(postLoginPath(next), { replace: true })
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Could not start your trial.',
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

      <div className={authStackClass}>
        <div className={authCardWideClass}>
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
            <h1 className={authTitleClass}>Sign Up</h1>
          </div>

          <div className={authActionsClass}>
            <form className={authFormClass} onSubmit={handleSubmit}>
              <Input
                id="signup-name"
                label="Your Name"
                autoComplete="name"
                value={ownerName}
                onChange={(event) => setOwnerName(event.target.value)}
                onBlur={blur('ownerName')}
                required
                error={showError('ownerName') ? ownerNameError : undefined}
                className={authInputClass}
              />
              <Input
                id="signup-agency"
                label="Name of Business"
                autoComplete="organization"
                value={agencyName}
                onChange={(event) => setAgencyName(event.target.value)}
                onBlur={blur('agencyName')}
                required
                error={showError('agencyName') ? agencyError : undefined}
                className={authInputClass}
              />
              <div className={authFormRowClass}>
                <Input
                  id="signup-email"
                  label="Email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@company.com"
                  value={ownerEmail}
                  onChange={(event) => setOwnerEmail(event.target.value)}
                  onBlur={blur('ownerEmail')}
                  required
                  error={showError('ownerEmail') ? emailError : undefined}
                  className={authInputClass}
                />
                <Input
                  id="signup-mobile"
                  label="Mobile number"
                  type="tel"
                  autoComplete="tel"
                  inputMode="tel"
                  placeholder="01XXXXXXXXX"
                  value={ownerMobile}
                  onChange={(event) => setOwnerMobile(event.target.value)}
                  onBlur={blur('ownerMobile')}
                  required
                  error={showError('ownerMobile') ? mobileError : undefined}
                  className={authInputClass}
                />
              </div>
              <div className="relative">
                <Input
                  id="signup-password"
                  label="Password"
                  type={isPasswordVisible ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="8+ characters, letter and number"
                  value={ownerPassword}
                  onChange={(event) => setOwnerPassword(event.target.value)}
                  onBlur={blur('ownerPassword')}
                  required
                  error={showError('ownerPassword') ? passwordError : undefined}
                  className={`${authInputClass} pe-11`}
                />
                <button
                  type="button"
                  className="absolute end-0 top-[1.75rem] flex size-11 cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-[#64748b] hover:text-[#0a0a0a] focus-visible:rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-[color-mix(in_srgb,var(--color-theme)_55%,transparent)]"
                  aria-label={
                    isPasswordVisible ? 'Hide password' : 'Show password'
                  }
                  aria-pressed={isPasswordVisible}
                  onClick={() => setIsPasswordVisible((visible) => !visible)}
                >
                  {isPasswordVisible ? (
                    <EyeOff size={18} strokeWidth={2} aria-hidden />
                  ) : (
                    <Eye size={18} strokeWidth={2} aria-hidden />
                  )}
                </button>
              </div>
              {error ? (
                <p className="m-0 text-sm text-destructive" role="alert">
                  {error}
                </p>
              ) : null}
              <Button
                type="submit"
                size="lg"
                className={authSubmitClass}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Creating…' : 'Start Free Trial'}
              </Button>
              <p className="m-[0.15rem_auto_0] text-center text-sm leading-snug text-[#64748b]">
                Already have an account?{' '}
                <Link to="/login" className={authInlineLinkClass}>
                  Sign in
                </Link>
              </p>
            </form>
          </div>
        </div>
        <a href={marketingHomeUrl()} className={authOutsideLinkClass}>
          Back to OneTrack
        </a>
      </div>
    </div>
  )
}
