import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { layoutConfig } from '@/config/layout'
import { DEMO_ACCOUNTS } from '@/lib/authApi'
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

function GoogleMark() {
  return (
    <svg
      className="pd-login__google-mark"
      viewBox="0 0 24 24"
      width="20"
      height="20"
      aria-hidden
    >
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z"
      />
    </svg>
  )
}

export default function LoginPage() {
  const navigate = useNavigate()
  const { status, user, signInWithGoogle, signInWithPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false)
  const emailFieldRef = useRef<HTMLDivElement>(null)
  const { markAllTouched, showError, blur } = useTouchedFields<
    'email' | 'password'
  >()
  const emailError = validateRequiredEmail(email)
  const passwordError = validateRequiredPassword(password)

  useEffect(() => {
    if (!isAccountMenuOpen) return
    const handlePointer = (event: MouseEvent) => {
      if (
        emailFieldRef.current &&
        !emailFieldRef.current.contains(event.target as Node)
      ) {
        setIsAccountMenuOpen(false)
      }
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsAccountMenuOpen(false)
    }
    document.addEventListener('mousedown', handlePointer)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handlePointer)
      document.removeEventListener('keydown', handleKey)
    }
  }, [isAccountMenuOpen])

  if (status === 'authenticated') {
    return (
      <Navigate
        to={signedInHomePath(user?.role ?? 'agency_user')}
        replace
      />
    )
  }

  const goHome = (role: 'platform_admin' | 'agency_user') => {
    navigate(signedInHomePath(role), { replace: true })
  }

  const fillAccount = (accountEmail: string) => {
    setEmail(accountEmail)
    setPassword(accountEmail)
    setError(null)
    setIsAccountMenuOpen(false)
  }

  const handleGoogleSignIn = async () => {
    setError(null)
    await signInWithGoogle()
    goHome('agency_user')
  }

  const handlePasswordSignIn = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    markAllTouched(['email', 'password'])
    if (emailError || passwordError) return
    setIsSubmitting(true)
    try {
      await signInWithPassword(email, password)
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
          <button
            type="button"
            className="pd-login__google"
            onClick={handleGoogleSignIn}
          >
            <GoogleMark />
            Continue with Google
          </button>

          <p className="pd-login__divider" role="separator" aria-label="or">
            or
          </p>

          <form className="pd-login__form" onSubmit={handlePasswordSignIn}>
            <div className="pd-login__email-control" ref={emailFieldRef}>
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
              <button
                type="button"
                className="pd-login__email-menu-btn"
                aria-label="Choose a saved account"
                aria-expanded={isAccountMenuOpen}
                aria-haspopup="listbox"
                onClick={() => setIsAccountMenuOpen((open) => !open)}
              >
                <ChevronDown size={16} strokeWidth={2} aria-hidden />
              </button>
              {isAccountMenuOpen ? (
                <ul className="pd-login__email-menu" role="listbox">
                  {DEMO_ACCOUNTS.map((account) => (
                    <li key={account.id} role="none">
                      <button
                        type="button"
                        className="pd-login__email-option"
                        role="option"
                        onClick={() => fillAccount(account.user.email)}
                      >
                        <span className="pd-login__account-name">
                          {account.label}
                        </span>
                        <span className="pd-login__account-meta">
                          {account.description}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            <Input
              id="login-password"
              label="Password"
              labelVariant="default"
              type="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              onBlur={blur('password')}
              required
              error={showError('password') ? passwordError : undefined}
            />
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
