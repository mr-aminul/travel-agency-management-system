import { useMemo, useState, type FormEvent } from 'react'
import { Button, Input, Select } from '@/components/ui'
import { absolutePublicUrl } from '@/lib/publicUrl'
import {
  createUserInvite,
  getActiveTenantId,
  provisionSubAgentUser,
} from '@/lib/authApi'
import {
  findProvisionedAccountByEmail,
} from '@/lib/provisionedUsers'
import { findSeededAccountByEmail } from '@/lib/seededUsers'
import {
  setSubAgentLoginStatus,
  upsertSubAgentLogin,
  useSubAgentLogin,
} from '@/lib/subAgentLoginsStore'
import { useTenantMembers } from '@/lib/tenantMembersStore'
import { validateOptionalEmail, validateRequiredText } from '@/lib/fieldValidation'
import type { SubAgent } from '@/types/subAgent'

type Props = {
  subAgent: SubAgent
  /** Prefer the email already on the CRM profile. */
  onEmailSaved?: (email: string) => void
}

export function SubAgentLoginSection({ subAgent, onEmailSaved }: Props) {
  const tenantId = getActiveTenantId()
  const login = useSubAgentLogin(subAgent.id, tenantId)
  const members = useTenantMembers()
  const [mode, setMode] = useState<'invite' | 'password' | 'link'>('invite')
  const [email, setEmail] = useState(subAgent.email ?? '')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const existingLogin = useMemo(() => {
    const normalized = email.trim().toLowerCase()
    if (!normalized) return false
    if (findSeededAccountByEmail(normalized)) return true
    if (findProvisionedAccountByEmail(normalized)) return true
    return members.some(
      (member) =>
        member.email.trim().toLowerCase() === normalized &&
        member.status !== 'disabled',
    )
  }, [email, members])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setStatus(null)
    setInviteLink(null)

    const emailError = validateOptionalEmail(email)
    if (emailError || !email.trim()) {
      setError(emailError ?? 'Email is required for login.')
      return
    }

    const grantMode =
      mode === 'password' && existingLogin ? 'link' : mode

    if (grantMode === 'password') {
      const passwordError = validateRequiredText(password, 'Password', 8)
      if (passwordError) {
        setError(passwordError)
        return
      }
    }

    setBusy(true)
    try {
      onEmailSaved?.(email.trim().toLowerCase())
      if (grantMode === 'invite') {
        const invite = await createUserInvite({
          email: email.trim(),
          name: subAgent.name,
          tenantId,
          subAgentId: subAgent.id,
          role: 'sub_agent',
        })
        const link = absolutePublicUrl(`invite/${invite.token}`)
        setInviteLink(link)
        upsertSubAgentLogin({
          subAgentId: subAgent.id,
          tenantId,
          userId: invite.id,
          email: email.trim().toLowerCase(),
          status: 'invited',
          invitedAt: new Date().toISOString(),
        })
        setStatus(
          existingLogin
            ? 'Invite created. They already have an agency login — after accepting, they should choose Sub agent login on the sign-in page.'
            : 'Invite created. Copy the link and send it to the sub agent.',
        )
      } else {
        const created = await provisionSubAgentUser({
          email: email.trim(),
          name: subAgent.name,
          ...(grantMode === 'link' ? {} : { password }),
          tenantId,
          subAgentId: subAgent.id,
        })
        upsertSubAgentLogin({
          subAgentId: subAgent.id,
          tenantId,
          userId: created.id,
          email: created.email,
          status: 'active',
          activatedAt: new Date().toISOString(),
        })
        setPassword('')
        setStatus(
          created.linkedExisting || grantMode === 'link'
            ? 'Sub-agent access linked. They keep their existing password and sign in with Sub agent login.'
            : 'Login created. They can sign in with Sub agent login using this email and password.',
        )
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not set up login.')
    } finally {
      setBusy(false)
    }
  }

  const toggleDisabled = () => {
    if (!login) return
    const next = login.status === 'disabled' ? 'active' : 'disabled'
    setSubAgentLoginStatus(subAgent.id, next, tenantId)
    setStatus(
      next === 'disabled'
        ? 'Login disabled. They can no longer sign in as a sub agent.'
        : 'Login re-enabled.',
    )
  }

  const grantOptions = existingLogin
    ? [
        {
          value: 'link',
          label: 'Link existing login (same password)',
        },
        {
          value: 'invite',
          label: 'Send invite link',
        },
      ]
    : [
        { value: 'invite', label: 'Send invite link (they set password)' },
        { value: 'password', label: 'Set password now' },
      ]

  const effectiveMode = existingLogin && mode === 'password' ? 'link' : mode

  return (
    <section className="pd-settings-block" aria-labelledby="sub-agent-login-heading">
      <header className="pd-settings-block__header">
        <h2 id="sub-agent-login-heading">Sub agent login</h2>
        <p>
          Sub agents sign in with <strong>Sub agent login</strong> on the
          sign-in page. If this email already runs an agency, we link sub-agent
          access — we do not overwrite their agency password.
        </p>
      </header>

      {login ? (
        <p className="pd-settings-block__meta">
          Status: <strong>{login.status}</strong> · {login.email}
        </p>
      ) : (
        <p className="pd-settings-block__meta">No login yet.</p>
      )}

      {existingLogin && !login ? (
        <p className="pd-settings-block__meta" role="status">
          This email already has an agency login. Prefer linking — they will use
          the same password and choose Sub agent login when signing in.
        </p>
      ) : null}

      <form className="pd-form-stack" onSubmit={(event) => void handleSubmit(event)}>
        <Select
          label="How to grant access"
          value={effectiveMode}
          onChange={(event) =>
            setMode(event.target.value as 'invite' | 'password' | 'link')
          }
          options={grantOptions}
        />
        <Input
          label="Login email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          autoComplete="off"
        />
        {effectiveMode === 'password' ? (
          <Input
            label="Initial password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            hint="At least 8 characters"
            required
            autoComplete="new-password"
          />
        ) : null}
        {error ? (
          <p className="pd-field__error" role="alert">
            {error}
          </p>
        ) : null}
        {status ? <p role="status">{status}</p> : null}
        {inviteLink ? (
          <p>
            Invite link:{' '}
            <a href={inviteLink} target="_blank" rel="noreferrer">
              {inviteLink}
            </a>
          </p>
        ) : null}
        <div className="pd-form-actions">
          <Button type="submit" disabled={busy}>
            {busy
              ? 'Working…'
              : effectiveMode === 'invite'
                ? login
                  ? 'Resend invite'
                  : 'Create invite'
                : effectiveMode === 'link'
                  ? 'Link sub-agent access'
                  : login
                    ? 'Reset password'
                    : 'Create login'}
          </Button>
          {login && login.status !== 'invited' ? (
            <Button type="button" variant="secondary" onClick={toggleDisabled}>
              {login.status === 'disabled' ? 'Enable login' : 'Disable login'}
            </Button>
          ) : null}
        </div>
      </form>
    </section>
  )
}
