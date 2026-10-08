import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { layoutConfig } from '@/config/layout'
import { requestPasswordReset } from '@/lib/authApi'
import { absolutePublicUrl, publicUrl } from '@/lib/publicUrl'
import { validateRequiredEmail } from '@/lib/fieldValidation'
import { useTouchedFields } from '@/lib/useTouchedFields'
import { Button, CopyableText, Input } from '@/components/ui'
import '@/styles/layout-login.css'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [resetLink, setResetLink] = useState<string | null>(null)
  const { markAllTouched, showError, blur } = useTouchedFields<'email'>()
  const emailError = validateRequiredEmail(email)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    markAllTouched(['email'])
    if (emailError) return
    setIsSubmitting(true)
    try {
      const result = await requestPasswordReset(email)
      setDone(true)
      if (result.token) {
        setResetLink(absolutePublicUrl(`reset/${result.token}`))
      }
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
        <div className="pd-login__brand">
          <h1 className="pd-login__title">Reset password</h1>
          <p className="pd-login__subtitle">
            Enter your email. We’ll give you a reset link (email delivery comes
            later — copy the link for now).
          </p>
        </div>
        {done ? (
          <div className="pd-login__actions">
            <p className="pd-login__subtitle" role="status">
              If an account exists for that email, a reset link is ready.
            </p>
            {resetLink ? (
              <CopyableText label="Reset link" value={resetLink} />
            ) : null}
            <Link to="/login" className="pd-btn pd-btn--secondary">
              Back to login
            </Link>
          </div>
        ) : (
          <form className="pd-login__form" onSubmit={handleSubmit} noValidate>
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
              <p className="pd-field__error" role="alert">
                {error}
              </p>
            ) : null}
            <Button type="submit" size="lg" loading={isSubmitting}>
              Continue
            </Button>
            <Link to="/login" className="pd-login__subtitle">
              Back to login
            </Link>
          </form>
        )}
      </div>
    </div>
  )
}
