import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Building2, Eye, EyeOff, Handshake } from 'lucide-react'
import { Input } from '@/components/clients/clientShadcnFields'
import { Button } from '@/components/shadcn/button'
import { layoutConfig } from '@/config/layout'
import { useAuth } from '@/lib/auth'
import {
  postLoginPath,
  type LoginIntent,
} from '@/lib/authWorkspaces'
import { publicUrl } from '@/lib/publicUrl'
import { marketingHomeUrl } from '@/lib/siteOrigins'
import {
  validateRequiredEmail,
  validateRequiredPassword,
} from '@/lib/fieldValidation'
import { useTouchedFields } from '@/lib/useTouchedFields'
import { cn } from '@/lib/utils'
import {
  authActionsClass,
  authBrandClass,
  authBrandLogoClass,
  authCardWideClass,
  authCornerLogoClass,
  authFormClass,
  authInlineLinkClass,
  authInputClass,
  authOutsideLinkClass,
  authPageBackgroundStyle,
  authShellClass,
  authStackClass,
  authSubmitClass,
  authTextLinkClass,
  authTitleClass,
  usePublicBrandTheme,
} from './authShell'

const LOGIN_INTENTS: {
  value: LoginIntent
  label: string
  icon: typeof Building2
}[] = [
  { value: 'agency', label: 'Agency', icon: Building2 },
  { value: 'sub_agent', label: 'Sub Agent', icon: Handshake },
]

export default function LoginPage() {
  usePublicBrandTheme()
  const navigate = useNavigate()
  const { status, session, signInWithPassword } = useAuth()
  const [loginAs, setLoginAs] = useState<LoginIntent>('agency')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { markAllTouched, showError, blur } = useTouchedFields<
    'email' | 'password'
  >()
  const emailError = validateRequiredEmail(email)
  const passwordError = validateRequiredPassword(password)

  if (status === 'authenticated' && session) {
    return <Navigate to={postLoginPath(session)} replace />
  }

  const handlePasswordSignIn = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    markAllTouched(['email', 'password'])
    if (emailError || passwordError) return
    setIsSubmitting(true)
    try {
      const next = await signInWithPassword(email, password, {
        intent: loginAs,
      })
      navigate(postLoginPath(next), { replace: true })
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Could not sign in.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedIntentIndex = LOGIN_INTENTS.findIndex(
    (option) => option.value === loginAs,
  )

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
            <h1 className={authTitleClass}>Sign In</h1>
          </div>

          <div className={authActionsClass}>
            <form className={authFormClass} onSubmit={handlePasswordSignIn}>
              <fieldset className="m-0 border-0 bg-transparent p-0 text-start">
                <legend className="mb-[0.3rem] p-0 text-xs font-semibold text-[#64748b]">
                  Sign In As
                </legend>
                <div
                  className="relative isolate grid grid-cols-2 items-stretch gap-0 rounded-[calc(0.75rem-0.125rem)] border border-[#e5e7eb] p-0.5 shadow-[inset_0_1px_1px_color-mix(in_srgb,black_4%,transparent)]"
                  style={{
                    background:
                      'linear-gradient(180deg, color-mix(in srgb, #0a0a0a 3.5%, white), color-mix(in srgb, #0a0a0a 1.5%, white))',
                  }}
                >
                  <span
                    aria-hidden
                    className="pointer-events-none absolute top-0.5 left-0.5 z-0 h-10 w-[calc(50%-0.125rem)] rounded-[calc(0.75rem-0.25rem)] bg-[var(--color-theme)] shadow-[0_1px_2px_color-mix(in_srgb,var(--color-theme)_35%,transparent)] transition-transform duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
                    style={{
                      transform:
                        selectedIntentIndex > 0
                          ? `translateX(${selectedIntentIndex * 100}%)`
                          : undefined,
                    }}
                  />
                  {LOGIN_INTENTS.map((option) => {
                    const Icon = option.icon
                    const isSelected = loginAs === option.value
                    return (
                      <label
                        key={option.value}
                        className={cn(
                          'relative z-[1] box-border flex h-10 min-h-10 w-full cursor-pointer items-center justify-center gap-[0.3rem] rounded-[calc(0.75rem-0.25rem)] px-2 transition-colors duration-[180ms] ease-out',
                          isSelected
                            ? 'text-[var(--color-on-theme,#fff)]'
                            : 'text-[#64748b] hover:text-[color-mix(in_srgb,#64748b_35%,#0a0a0a)]',
                        )}
                        htmlFor={`login-as-${option.value}`}
                      >
                        <input
                          id={`login-as-${option.value}`}
                          className="sr-only"
                          type="radio"
                          name="login-as"
                          value={option.value}
                          checked={isSelected}
                          onChange={() => setLoginAs(option.value)}
                        />
                        <span
                          className="inline-flex shrink-0 items-center justify-center leading-none"
                          aria-hidden
                        >
                          <Icon size={13} strokeWidth={2} className="block" />
                        </span>
                        <span className="block text-center text-xs font-semibold leading-none tracking-[-0.01em] whitespace-nowrap max-md:whitespace-normal max-md:text-[0.6875rem] max-md:leading-[1.15]">
                          {option.label}
                        </span>
                      </label>
                    )
                  })}
                </div>
              </fieldset>
              <Input
                id="login-email"
                label="Email"
                type="email"
                autoComplete="email"
                placeholder="name@company.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                onBlur={blur('email')}
                required
                error={showError('email') ? emailError : undefined}
                className={authInputClass}
              />
              <div className="relative">
                <Input
                  id="login-password"
                  label="Password"
                  type={isPasswordVisible ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  onBlur={blur('password')}
                  required
                  error={showError('password') ? passwordError : undefined}
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
                {isSubmitting ? 'Logging In…' : 'Log In'}
              </Button>
              <Link to="/forgot-password" className={authTextLinkClass}>
                Forgot password?
              </Link>
              <p className="m-[0.15rem_auto_0] text-center text-sm leading-snug text-[#64748b]">
                New agency?{' '}
                <Link to="/subscribe" className={authInlineLinkClass}>
                  Start free trial
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
