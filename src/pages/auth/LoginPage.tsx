import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { layoutConfig } from '@/config/layout'
import { useAuth } from '@/lib/auth'
import { signedInHomePath } from '@/lib/modules'
import { publicUrl } from '@/lib/publicUrl'
import { Button, Input } from '@/components/ui'
import {
  validateRequiredEmail,
  validateRequiredPassword,
} from '@/lib/fieldValidation'
import { useTouchedFields } from '@/lib/useTouchedFields'
import '@/styles/layout-login.css'

export default function LoginPage() {
  const navigate = useNavigate()
  const { status, user, signInWithPassword } = useAuth()
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

  if (status === 'authenticated') {
    return (
      <Navigate
        to={signedInHomePath(user?.role ?? 'agency_user')}
        replace
      />
    )
  }

  const handlePasswordSignIn = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    markAllTouched(['email', 'password'])
    if (emailError || passwordError) return
    setIsSubmitting(true)
    try {
      const session = await signInWithPassword(email, password)
      navigate(signedInHomePath(session.user.role), { replace: true })
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Could not sign in.',
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
          <h1 className="pd-login__title">{layoutConfig.brand.name}</h1>
          <p className="pd-login__subtitle">
            Welcome back — sign in to continue
          </p>
        </div>

        <div className="pd-login__actions">
          <form className="pd-login__form" onSubmit={handlePasswordSignIn}>
            <Input
              id="login-email"
              label="Email"
              labelVariant="default"
              type="email"
              autoComplete="email"
              placeholder="name@company.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              onBlur={blur('email')}
              required
              error={showError('email') ? emailError : undefined}
            />
            <div className="pd-login__password-control">
              <Input
                id="login-password"
                label="Password"
                labelVariant="default"
                type={isPasswordVisible ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                onBlur={blur('password')}
                required
                error={showError('password') ? passwordError : undefined}
              />
              <button
                type="button"
                className="pd-login__password-toggle"
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
              <p className="pd-field__error" role="alert">
                {error}
              </p>
            ) : null}
            <Button type="submit" size="lg" loading={isSubmitting}>
              Log in
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
