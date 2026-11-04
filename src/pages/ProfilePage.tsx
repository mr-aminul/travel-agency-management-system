import { useEffect, useState, type FormEvent } from 'react'
import { Check, Mail, Shield, UserRound } from 'lucide-react'
import { ProfilePhotoField } from '@/components/ProfilePhotoField'
import {
  Avatar,
  avatarKindForMemberRole,
  Button,
  CopyableText,
  Input,
  PageHeader,
} from '@/components/ui'
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
import {
  saveUserAvatar,
  useUserAvatar,
} from '@/lib/userAvatarStore'
import '@/styles/layout-ops.css'

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
    <div className="pd-page pd-ops pd-profile-page" aria-label="My profile">
      <PageHeader
        title="My profile"
        description="Your staff account for this workspace — name, email, and photo."
      />

      <div className="pd-profile-layout">
        <section className="pd-profile-card" aria-label="Profile details">
          <div className="pd-profile-card__hero">
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
              <Avatar
                name={user?.name ?? 'Staff'}
                src={avatarUrl}
                size="xl"
                kind={avatarKind}
              />
            )}

            <div className="pd-profile-card__intro">
              <h2 className="pd-profile-card__name">
                {user?.name ?? 'Staff account'}
              </h2>
              <p className="pd-profile-card__email">
                {user?.email ? (
                  <CopyableText value={user.email} />
                ) : (
                  'No email on this account'
                )}
              </p>
              <p className="pd-profile-card__role">
                <Shield size={14} strokeWidth={2.25} aria-hidden />
                {displayRole}
              </p>
            </div>
          </div>

          {isViewingAs ? (
            <p className="pd-profile-card__notice" role="status">
              Support Mode is on. Exit it to edit your own name, email, or photo.
            </p>
          ) : null}

          <div className="pd-profile-card__body">
            {canEdit ? (
              <form
                className="pd-profile-form"
                onSubmit={handleSave}
                noValidate
              >
                <div className="pd-profile-form__grid">
                  <Input
                    label="Full name"
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
                    hint="Used to sign in to this workspace."
                  />
                </div>

                {error ? (
                  <p className="pd-field__error" role="alert">
                    {error}
                  </p>
                ) : null}
                {success ? (
                  <p className="pd-profile-form__status" role="status">
                    <Check size={14} strokeWidth={2.5} aria-hidden />
                    {success}
                  </p>
                ) : null}

                <div className="pd-profile-form__actions">
                  <Button type="submit" disabled={isSaving || !dirty}>
                    {isSaving ? 'Saving…' : 'Save changes'}
                  </Button>
                </div>
              </form>
            ) : (
              <dl className="pd-profile-info">
                <div className="pd-profile-info__item">
                  <dt>
                    <UserRound size={14} strokeWidth={2.25} aria-hidden />
                    Name
                  </dt>
                  <dd>{user?.name ?? '—'}</dd>
                </div>
                <div className="pd-profile-info__item">
                  <dt>
                    <Mail size={14} strokeWidth={2.25} aria-hidden />
                    Email
                  </dt>
                  <dd>
                    {user?.email ? (
                      <CopyableText value={user.email} />
                    ) : (
                      '—'
                    )}
                  </dd>
                </div>
                <div className="pd-profile-info__item">
                  <dt>
                    <Shield size={14} strokeWidth={2.25} aria-hidden />
                    Role
                  </dt>
                  <dd>{displayRole}</dd>
                </div>
              </dl>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
