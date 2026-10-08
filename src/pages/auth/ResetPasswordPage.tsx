import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { layoutConfig } from '@/config/layout'
import {
  confirmPasswordReset,
  fetchPasswordReset,
} from '@/lib/authApi'
import { publicUrl } from '@/lib/publicUrl'
import { validateRequiredPassword } from '@/lib/fieldValidation'
import { useTouchedFields } from '@/lib/useTouchedFields'
import { Button, Input } from '@/components/ui'
import '@/styles/layout-login.css'

export default function ResetPasswordPage() {
  const { token = '' } = useParams()
  const navigate = useNavigate()
  const [emailMasked, setEmailMasked] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { markAllTouched, showError, blur } = useTouchedFields<
    'password' | 'confirm'
  >()
  const passwordError = validateRequiredPassword(password)
  const confirmError =
    confirm !== password ? 'Passwords do not match.' : undefined

  useEffect(() => {
    let cancelled = false
    void fetchPasswordReset(token)
      .then((body) => {
        if (cancelled) return
        setEmailMasked(body.emailMasked)
      })
      .catch((caught) => {
        if (cancelled) return
        setLoadError(
          caught instanceof Error ? caught.message : 'Invalid reset link.',
        )
      })
    return () => {
      cancelled = true
    }
  }, [token])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    markAllTouched(['password', 'confirm'])
    if (passwordError || confirmError) return
    setIsSubmitting(true)
    try {
      await confirmPasswordReset(token, password)
      navigate('/login', { replace: true })
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Could not reset password.',
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
          <h1 className="pd-login__title">Choose a new password</h1>
          <p className="pd-login__subtitle">
            {emailMasked ? `For ${emailMasked}` : 'Loading…'}
          </p>
        </div>
        {loadError ? (
          <div className="pd-login__actions">
            <p className="pd-field__error" role="alert">
              {loadError}
            </p>
            <Link to="/forgot-password" className="pd-login__text-link">
              Request a new link
            </Link>
          </div>
        ) : (
          <form className="pd-login__form" onSubmit={handleSubmit} noValidate>
            <Input
              label="New password"
              labelVariant="default"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              onBlur={blur('password')}
              required
              error={showError('password') ? passwordError : undefined}
            />
            <Input
              label="Confirm password"
              labelVariant="default"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              onBlur={blur('confirm')}
              required
              error={showError('confirm') ? confirmError : undefined}
            />
            {error ? (
              <p className="pd-field__error" role="alert">
                {error}
              </p>
            ) : null}
            <Button type="submit" size="lg" loading={isSubmitting}>
              Save password
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
