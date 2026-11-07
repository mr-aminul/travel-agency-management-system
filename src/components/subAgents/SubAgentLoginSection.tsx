import { useMemo, useState, type FormEvent } from 'react'
import { Button } from '@/components/shadcn/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shadcn/card'
import { FieldError } from '@/components/shadcn/field'
import { Input, Select } from '@/components/clients/clientShadcnFields'
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
            ? 'Invite created. They already have an agency login. After accepting, they should choose Sub agent login on the sign-in page.'
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
    <Card className="shadow-sm" aria-labelledby="sub-agent-login-heading">
      <CardHeader>
        <CardTitle id="sub-agent-login-heading">Sub Agent Login</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {login ? (
          <p className="m-0 text-sm text-muted-foreground">
            Status: <strong className="text-foreground">{login.status}</strong> · {login.email}
          </p>
        ) : (
          <p className="m-0 text-sm text-muted-foreground">No login yet.</p>
        )}

        {existingLogin && !login ? (
          <p className="m-0 text-sm text-muted-foreground" role="status">
            This email already has an agency login. Prefer linking. They will use
            the same password and choose Sub agent login when signing in.
          </p>
        ) : null}

        <form className="flex flex-col gap-3" onSubmit={(event) => void handleSubmit(event)}>
          <Select
            label="How to Grant Access"
            value={effectiveMode}
            onChange={(event) =>
              setMode(event.target.value as 'invite' | 'password' | 'link')
            }
            options={grantOptions}
          />
          <Input
            label="Login Email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoComplete="off"
          />
          {effectiveMode === 'password' ? (
            <Input
              label="Initial Password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              autoComplete="new-password"
            />
          ) : null}
          {error ? <FieldError role="alert">{error}</FieldError> : null}
          {status ? <p className="m-0 text-sm" role="status">{status}</p> : null}
          {inviteLink ? (
            <p className="m-0 break-all text-sm">
              Invite link:{' '}
              <a
                className="text-primary underline-offset-2 hover:underline"
                href={inviteLink}
                target="_blank"
                rel="noreferrer"
              >
                {inviteLink}
              </a>
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" className="h-9 rounded-lg" disabled={busy}>
              {busy
                ? 'Working…'
                : effectiveMode === 'invite'
                  ? login
                    ? 'Resend Invite'
                    : 'Create Invite'
                  : effectiveMode === 'link'
                    ? 'Link Sub-Agent Access'
                    : login
                      ? 'Reset Password'
                      : 'Create Login'}
            </Button>
            {login && login.status !== 'invited' ? (
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-lg"
                onClick={toggleDisabled}
              >
                {login.status === 'disabled' ? 'Enable Login' : 'Disable Login'}
              </Button>
            ) : null}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
