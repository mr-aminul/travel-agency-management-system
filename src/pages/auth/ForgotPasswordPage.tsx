import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'
import { layoutConfig } from '@/config/layout'
import { requestPasswordReset } from '@/lib/authApi'
import { publicUrl } from '@/lib/publicUrl'
import { validateRequiredEmail } from '@/lib/fieldValidation'
import { useTouchedFields } from '@/lib/useTouchedFields'
import { Button, Input } from '@/components/ui'
import '@/styles/layout-login.css'

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
        {done ? (
          <div className="pd-login__success" role="status">
            <div className="pd-login__success-icon" aria-hidden>
              <Check size={36} strokeWidth={2.75} />
            </div>
            <h1 className="pd-login__title">Check your email</h1>
            <p className="pd-login__subtitle">
              We sent a reset link if that account exists.
            </p>
            <Link to="/login" className="pd-login__text-link">
              Back to login
            </Link>
          </div>
        ) : (
          <>
            <div className="pd-login__brand">
              <h1 className="pd-login__title">Reset password</h1>
              <p className="pd-login__subtitle">
                Enter your email and we’ll send a reset link.
              </p>
            </div>
            <form className="pd-login__form" onSubmit={handleSubmit} noValidate>
              <Input
                id="forgot-email"
                label="Email"
                labelVariant="default"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                onBlur={blur('email')}
                required
                error={showError('email') ? emailError : undefined}
              />
              {error ? (
                <p className="pd-field__error" role="alert">
                  {error}
                </p>
              ) : null}
              <Button type="submit" size="lg" loading={isSubmitting}>
                Email reset link
              </Button>
              <Link to="/login" className="pd-login__text-link">
                Back to login
              </Link>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
