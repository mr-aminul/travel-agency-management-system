import { useState, type FormEvent } from 'react'
import { Button, Input, Select } from '@/components/ui'
import { absolutePublicUrl } from '@/lib/publicUrl'
import {
  createUserInvite,
  getActiveTenantId,
  provisionSubAgentUser,
} from '@/lib/authApi'
import {
  setSubAgentLoginStatus,
  upsertSubAgentLogin,
  useSubAgentLogin,
} from '@/lib/subAgentLoginsStore'
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
  const [mode, setMode] = useState<'invite' | 'password'>('invite')
  const [email, setEmail] = useState(subAgent.email ?? '')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

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
    if (mode === 'password') {
      const passwordError = validateRequiredText(password, 'Password', 8)
      if (passwordError) {
        setError(passwordError)
        return
      }
    }

    setBusy(true)
    try {
      onEmailSaved?.(email.trim().toLowerCase())
      if (mode === 'invite') {
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
        setStatus('Invite created. Copy the link and send it to the partner.')
      } else {
        const created = await provisionSubAgentUser({
          email: email.trim(),
          name: subAgent.name,
          password,
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
        setStatus('Login created. They can sign in with this email and password.')
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
        ? 'Login disabled. They can no longer sign in.'
        : 'Login re-enabled.',
    )
  }

  return (
    <section className="pd-settings-block" aria-labelledby="sub-agent-login-heading">
      <header className="pd-settings-block__header">
        <h2 id="sub-agent-login-heading">Partner login</h2>
        <p>
          Give this sub-agent the same sign-in and password-reset experience as
          agency staff. They only see their referred clients and submissions.
        </p>
      </header>

      {login ? (
        <p className="pd-settings-block__meta">
          Status: <strong>{login.status}</strong> · {login.email}
        </p>
      ) : (
        <p className="pd-settings-block__meta">No login yet.</p>
      )}

      <form className="pd-form-stack" onSubmit={(event) => void handleSubmit(event)}>
        <Select
          label="How to grant access"
          value={mode}
          onChange={(event) => setMode(event.target.value as 'invite' | 'password')}
          options={[
            { value: 'invite', label: 'Send invite link (they set password)' },
            { value: 'password', label: 'Set password now' },
          ]}
        />
        <Input
          label="Login email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          autoComplete="off"
        />
        {mode === 'password' ? (
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
        {error ? <p role="alert">{error}</p> : null}
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
              : mode === 'invite'
                ? login
                  ? 'Resend invite'
                  : 'Create invite'
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
