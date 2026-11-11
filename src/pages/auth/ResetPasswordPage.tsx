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
import { Button } from '@/components/shadcn/button'
import { Input } from '@/components/clients/clientShadcnFields'
import {
  authActionsClass,
  authBrandClass,
  authCardClass,
  authCornerLogoClass,
  authFormClass,
  authPageBackgroundStyle,
  authShellClass,
  authTextLinkClass,
  authTitleClass,
  usePublicBrandTheme,
} from './authShell'

export default function ResetPasswordPage() {
  usePublicBrandTheme()
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
          <h1 className={authTitleClass}>
            {emailMasked ? `New password for ${emailMasked}` : 'Choose a new password'}
          </h1>
        </div>
        {loadError ? (
          <div className={authActionsClass}>
            <p className="m-0 text-sm text-destructive" role="alert">
              {loadError}
            </p>
            <Link to="/forgot-password" className={authTextLinkClass}>
              Request a new link
            </Link>
          </div>
        ) : (
          <form className={authFormClass} onSubmit={handleSubmit} noValidate>
            <Input
              label="New Password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              onBlur={blur('password')}
              required
              error={showError('password') ? passwordError : undefined}
            />
            <Input
              label="Confirm Password"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              onBlur={blur('confirm')}
              required
              error={showError('confirm') ? confirmError : undefined}
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
              {isSubmitting ? 'Saving…' : 'Save Password'}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
