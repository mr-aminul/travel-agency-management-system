import { useEffect, useState, type FormEvent } from 'react'
import { Check, Mail, Shield, UserRound } from 'lucide-react'
import {
  ProfilePhotoField,
  type AvatarKind,
} from '@/components/ProfilePhotoField'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/shadcn/avatar'
import { Button } from '@/components/shadcn/button'
import { Card, CardContent } from '@/components/shadcn/card'
import { FieldError } from '@/components/shadcn/field'
import { Input } from '@/components/clients/clientShadcnFields'
import { elevatedPageClass } from '@/components/clients/shadcnChrome'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth'
import { fileToProfilePictureDataUrl } from '@/lib/agencyProfile'
import { getActiveTenantId } from '@/lib/authApi'
import {
  validateRequiredEmail,
  validateRequiredName,
} from '@/lib/fieldValidation'
import {
  findTenantMemberForUser,
  updateTenantMember,
} from '@/lib/tenantMembersStore'
import type { TenantMemberRole } from '@/types/tenant'
import {
  saveUserAvatar,
  useUserAvatar,
} from '@/lib/userAvatarStore'

function avatarKindForMemberRole(
  role: TenantMemberRole | undefined,
): AvatarKind {
  if (role === 'owner') return 'owner'
  return 'staff'
}

function roleLabel(
  role: string | undefined,
  memberRole: string | undefined,
): string {
  if (role === 'platform_admin') return 'Platform admin'
  if (role === 'sub_agent') return 'Sub agent'
  if (memberRole === 'owner') return 'Owner'
  if (memberRole === 'manager') return 'Manager'
  return 'Agency user'
}

function CopyEmail({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), 1500)
    return () => window.clearTimeout(timer)
  }, [copied])
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 text-left hover:underline"
      onClick={() => {
        void navigator.clipboard.writeText(value).then(() => setCopied(true))
      }}
      aria-label={copied ? 'Copied' : `Copy ${value}`}
    >
      {value}
      {copied ? <Check size={12} strokeWidth={2.5} aria-hidden /> : null}
    </button>
  )
}

export default function ProfilePage() {
  const { user, isViewingAs, updateProfile } = useAuth()
  const tenantId = getActiveTenantId()
  const member =
    user && user.role !== 'platform_admin'
      ? findTenantMemberForUser(tenantId, user.id, user.email)
      : undefined
  const avatarKind = avatarKindForMemberRole(member?.role)
  const avatarUrl = useUserAvatar(tenantId, user?.id)

  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [error, setError] = useState<string | undefined>()
  const [success, setSuccess] = useState<string | undefined>()
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    setName(user?.name ?? '')
    setEmail(user?.email ?? '')
    setError(undefined)
    setSuccess(undefined)
  }, [user?.id, user?.name, user?.email])

  const canEdit = Boolean(user) && !isViewingAs
  const dirty =
    name.trim() !== (user?.name ?? '') ||
    email.trim().toLowerCase() !== (user?.email ?? '').toLowerCase()
  const displayRole = roleLabel(user?.role, member?.role)
  const initials = (user?.name ?? 'Staff')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')

  const handlePhotoChange = (photoUrl: string | undefined) => {
    if (!user || !canEdit) return
    try {
      saveUserAvatar(tenantId, user.id, photoUrl ?? null)
      setSuccess('Profile photo updated.')
      setError(undefined)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save photo.')
      setSuccess(undefined)
    }
  }

  const handleSave = async (event: FormEvent) => {
    event.preventDefault()
    if (!user || !canEdit) return
    setError(undefined)
    setSuccess(undefined)

    const nameError = validateRequiredName(name, 'Full name')
    const emailError = validateRequiredEmail(email)
    if (nameError || emailError) {
      setError(nameError ?? emailError)
      return
    }

    const nextName = name.trim()
    const nextEmail = email.trim().toLowerCase()
    const nameChanged = nextName !== user.name
    const emailChanged = nextEmail !== user.email.toLowerCase()
    if (!nameChanged && !emailChanged) return

    setIsSaving(true)
    try {
      const updated = await updateProfile({
        ...(nameChanged ? { name: nextName } : {}),
        ...(emailChanged ? { email: nextEmail } : {}),
      })
      if (user.role !== 'platform_admin') {
        const row =
          findTenantMemberForUser(tenantId, user.id, user.email) ??
          findTenantMemberForUser(tenantId, user.id, updated.email)
        if (row) {
          updateTenantMember(row.id, {
            ...(nameChanged ? { name: updated.name } : {}),
            ...(emailChanged ? { email: updated.email } : {}),
          })
        }
      }
      setName(updated.name)
      setEmail(updated.email)
      setSuccess(
        emailChanged
          ? 'Email updated. Use the new address the next time you sign in.'
          : 'Profile updated.',
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update profile.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className={cn(elevatedPageClass, 'gap-5')} data-elevated-canvas aria-label="My Profile">
      <h1 className="m-0 text-xl font-semibold tracking-tight">My Profile</h1>

      <div className="mx-auto w-full max-w-xl">
        <Card className="shadow-sm" aria-label="Profile details">
          <CardContent className="flex flex-col gap-5 pt-6">
            <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:items-start sm:text-left">
              {canEdit ? (
                <ProfilePhotoField
                  name={name || user?.name || 'Staff'}
                  fallbackName="Staff"
                  kind={avatarKind}
                  value={avatarUrl ?? undefined}
                  encodeFile={fileToProfilePictureDataUrl}
                  onChange={handlePhotoChange}
                />
              ) : (
                <Avatar className="size-20">
                  {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
                  <AvatarFallback>{initials || 'S'}</AvatarFallback>
                </Avatar>
              )}

              <div className="flex min-w-0 flex-col gap-1">
                <h2 className="m-0 text-lg font-semibold tracking-tight">
                  {user?.name ?? 'Staff account'}
                </h2>
                <p className="m-0 text-sm text-muted-foreground">
                  {user?.email ? (
                    <CopyEmail value={user.email} />
                  ) : (
                    'No email on this account'
                  )}
                </p>
                <p className="m-0 inline-flex items-center justify-center gap-1.5 text-sm text-muted-foreground sm:justify-start">
                  <Shield size={14} strokeWidth={2.25} aria-hidden />
                  {displayRole}
                </p>
              </div>
            </div>

            {isViewingAs ? (
              <p className="m-0 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm" role="status">
                Support Mode is on. Exit it to edit your own name, email, or photo.
              </p>
            ) : null}

            {canEdit ? (
              <form className="flex flex-col gap-4" onSubmit={handleSave} noValidate>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    label="Full Name"
                    name="fullName"
                    autoComplete="name"
                    required
                    value={name}
                    onChange={(event) => {
                      setName(event.target.value)
                      setSuccess(undefined)
                    }}
                  />
                  <Input
                    label="Email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value)
                      setSuccess(undefined)
                    }}
                  />
                </div>

                {error ? <FieldError role="alert">{error}</FieldError> : null}
                {success ? (
                  <p className="m-0 inline-flex items-center gap-1.5 text-sm text-foreground" role="status">
                    <Check size={14} strokeWidth={2.5} aria-hidden />
                    {success}
                  </p>
                ) : null}

                <div>
                  <Button type="submit" className="h-9 rounded-lg" disabled={isSaving || !dirty}>
                    {isSaving ? 'Saving…' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            ) : (
              <dl className="m-0 grid gap-3">
                <div className="grid gap-1">
                  <dt className="m-0 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <UserRound size={14} strokeWidth={2.25} aria-hidden />
                    Name
                  </dt>
                  <dd className="m-0 text-sm">{user?.name ?? '—'}</dd>
                </div>
                <div className="grid gap-1">
                  <dt className="m-0 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <Mail size={14} strokeWidth={2.25} aria-hidden />
                    Email
                  </dt>
                  <dd className="m-0 text-sm">
                    {user?.email ? <CopyEmail value={user.email} /> : '—'}
                  </dd>
                </div>
                <div className="grid gap-1">
                  <dt className="m-0 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <Shield size={14} strokeWidth={2.25} aria-hidden />
                    Role
                  </dt>
                  <dd className="m-0 text-sm">{displayRole}</dd>
                </div>
              </dl>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
