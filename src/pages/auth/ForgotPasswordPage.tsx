import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'
import { layoutConfig } from '@/config/layout'
import { requestPasswordReset } from '@/lib/authApi'
import { publicUrl } from '@/lib/publicUrl'
import { validateRequiredEmail } from '@/lib/fieldValidation'
import { useTouchedFields } from '@/lib/useTouchedFields'
import { Button } from '@/components/shadcn/button'
import { Input } from '@/components/clients/clientShadcnFields'
import {
  authBrandClass,
  authCardClass,
  authCornerLogoClass,
  authFormClass,
  authPageBackgroundStyle,
  authShellClass,
  authSuccessClass,
  authSuccessIconClass,
  authTextLinkClass,
  authTitleClass,
} from './authShell'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const { markAllTouched, showError, blur } = useTouchedFields<'email'>()
  const emailError = validateRequiredEmail(email)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    markAllTouched(['email'])
    if (emailError) return
    setIsSubmitting(true)
    try {
      await requestPasswordReset(email)
      setDone(true)
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Could not start reset.',
      )
    } finally {
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
        {done ? (
          <div className={authSuccessClass} role="status">
            <div className={authSuccessIconClass} aria-hidden>
              <Check size={36} strokeWidth={2.75} />
            </div>
            <h1 className={authTitleClass}>Check your email</h1>
            <Link to="/login" className={`${authTextLinkClass} mt-[0.35rem]`}>
              Back to login
            </Link>
          </div>
        ) : (
          <>
            <div className={authBrandClass}>
              <h1 className={authTitleClass}>Reset password</h1>
            </div>
            <form className={authFormClass} onSubmit={handleSubmit} noValidate>
              <Input
                id="forgot-email"
                label="Email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                onBlur={blur('email')}
                required
                error={showError('email') ? emailError : undefined}
              />
              {error ? (
                <p className="m-0 text-sm text-destructive" role="alert">
                  {error}
                </p>
              ) : null}
              <Button
                type="submit"
                size="lg"
                className="h-[2.875rem] w-full rounded-lg font-semibold"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Sending…' : 'Email Reset Link'}
              </Button>
              <Link to="/login" className={authTextLinkClass}>
                Back to login
              </Link>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
