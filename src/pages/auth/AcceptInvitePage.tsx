import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { layoutConfig } from '@/config/layout'
import { acceptUserInvite, fetchInvite } from '@/lib/authApi'
import { createTenantMember } from '@/lib/tenantMembersStore'
import { upsertSubAgentLogin } from '@/lib/subAgentLoginsStore'
import { publicUrl } from '@/lib/publicUrl'
import { validateRequiredPassword } from '@/lib/fieldValidation'
import { useTouchedFields } from '@/lib/useTouchedFields'
import type { TenantMemberRole, UserRole } from '@/types/tenant'
import { Button, Input } from '@/components/ui'
import '@/styles/layout-login.css'

export default function AcceptInvitePage() {
  const { token = '' } = useParams()
  const navigate = useNavigate()
  const [invite, setInvite] = useState<{
    email: string
    name: string
    memberRole: string
    tenantId: string
    agencyName: string
    subAgentId?: string
    role?: UserRole
  } | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
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
    void fetchInvite(token)
      .then((body) => {
        if (cancelled) return
        setInvite(body)
      })
      .catch((caught) => {
        if (cancelled) return
        setLoadError(
          caught instanceof Error ? caught.message : 'Invalid invite.',
        )
      })
    return () => {
      cancelled = true
    }
  }, [token])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!invite) return
    setError(null)
    markAllTouched(['password', 'confirm'])
    if (passwordError || confirmError) return
    setIsSubmitting(true)
    try {
      const accepted = await acceptUserInvite(token, password)
      const isSubAgent =
        accepted.role === 'sub_agent' ||
        Boolean(accepted.subAgentId) ||
        invite.role === 'sub_agent'
      if (isSubAgent && accepted.subAgentId) {
        upsertSubAgentLogin({
          subAgentId: accepted.subAgentId,
          tenantId: accepted.tenantId,
          userId: accepted.userId,
          email: accepted.email,
          status: 'active',
          activatedAt: new Date().toISOString(),
        })
      } else {
        const role = (
          ['owner', 'manager', 'staff'].includes(accepted.memberRole)
            ? accepted.memberRole
            : 'staff'
        ) as TenantMemberRole
        try {
          createTenantMember({
            id: accepted.userId,
            tenantId: accepted.tenantId,
            name: accepted.name,
            email: accepted.email,
            role,
            password,
            status: 'active',
          })
        } catch {
          /* member row may already exist from admin side */
        }
      }
      navigate('/login', { replace: true })
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Could not accept invite.',
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
          <h1 className="pd-login__title">
            {invite?.role === 'sub_agent' || invite?.subAgentId
              ? 'Join as partner'
              : 'Join your agency'}
          </h1>
          <p className="pd-login__subtitle">
            {invite
              ? `${invite.agencyName} · ${invite.email}`
              : 'Loading invite…'}
          </p>
        </div>
        {loadError ? (
          <div className="pd-login__actions">
            <p className="pd-field__error" role="alert">
              {loadError}
            </p>
            <Link to="/login" className="pd-login__text-link">
              Go to login
            </Link>
          </div>
        ) : (
          <form className="pd-login__form" onSubmit={handleSubmit} noValidate>
            <Input
              label="Your name"
              labelVariant="default"
              value={invite?.name ?? ''}
              readOnly
            />
            <Input
              label="Password"
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
              Create account
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
