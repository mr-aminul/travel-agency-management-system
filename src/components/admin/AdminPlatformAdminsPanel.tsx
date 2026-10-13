import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Plus, Shield } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import {
  createPlatformAdmin,
  listPlatformAdmins,
  setPlatformAdminStatus,
  type PlatformAdminRow,
} from '@/lib/authApi'
import { authApiConfigured } from '@/lib/billing/platformFlag'
import { useTouchedFields } from '@/lib/useTouchedFields'
import {
  Avatar,
  Badge,
  Button,
  CopyableText,
  EmptyState,
  Input,
  Modal,
  SearchField,
  Select,
  SideDrawer,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  type SelectOption,
} from '@/components/ui'
import '@/styles/layout-clients.css'

const STATUS_OPTIONS: SelectOption[] = [
  { value: 'active', label: 'Active' },
  { value: 'disabled', label: 'Disabled' },
]

type CreateField = 'name' | 'email' | 'password'

type CreatedCredentials = {
  name: string
  email: string
  password: string
}

function statusToneClass(status: string): string {
  if (status === 'active') return 'pd-select--tone-completed'
  return 'pd-select--tone-danger'
}

export function AdminPlatformAdminsPanel() {
  const { user } = useAuth()
  const apiReady = authApiConfigured()
  const [admins, setAdmins] = useState<PlatformAdminRow[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [formError, setFormError] = useState<string | undefined>()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [createdCredentials, setCreatedCredentials] =
    useState<CreatedCredentials | null>(null)
  const { markAllTouched, showError, blur, resetTouched } =
    useTouchedFields<CreateField>()

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setAdmins(await listPlatformAdmins())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load admins.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return admins
    return admins.filter(
      (admin) =>
        admin.name.toLowerCase().includes(q) ||
        admin.email.toLowerCase().includes(q),
    )
  }, [admins, search])

  const resetCreateForm = () => {
    setName('')
    setEmail('')
    setPassword('')
    setFormError(undefined)
    resetTouched()
  }

  const closeCreate = () => {
    if (isSubmitting) return
    setCreateOpen(false)
    resetCreateForm()
  }

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault()
    markAllTouched(['name', 'email', 'password'])
    const trimmedName = name.trim()
    const trimmedEmail = email.trim().toLowerCase()
    if (!trimmedName) {
      setFormError('Name is required.')
      return
    }
    if (!trimmedEmail) {
      setFormError('Email is required.')
      return
    }
    if (!password || password.length < 8) {
      setFormError('Password must be at least 8 characters.')
      return
    }
    setIsSubmitting(true)
    setFormError(undefined)
    try {
      await createPlatformAdmin({
        name: trimmedName,
        email: trimmedEmail,
        password,
      })
      setCreatedCredentials({
        name: trimmedName,
        email: trimmedEmail,
        password,
      })
      setCreateOpen(false)
      resetCreateForm()
      await reload()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not create admin.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleStatusChange = async (
    admin: PlatformAdminRow,
    nextStatus: string,
  ) => {
    if (nextStatus !== 'active' && nextStatus !== 'disabled') return
    if (nextStatus === admin.status) return
    setBusyId(admin.id)
    setError(null)
    try {
      const updated = await setPlatformAdminStatus({
        userId: admin.id,
        status: nextStatus,
      })
      setAdmins((prev) =>
        prev.map((row) => (row.id === updated.id ? updated : row)),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update status.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section className="pd-admin__panel" aria-label="Platform admins">
      <div className="pd-admin__panel-toolbar">
        <h2 className="pd-admin__panel-title">Platform admins</h2>
        <Button
          size="sm"
          disabled={!apiReady}
          onClick={() => setCreateOpen(true)}
        >
          <Plus size={16} strokeWidth={2.2} aria-hidden />
          Add admin
        </Button>
      </div>

      {!apiReady ? (
        <p className="pd-admin__quiet">
          Connect the platform API to manage live admin accounts.
        </p>
      ) : null}

      <div className="pd-clients__toolbar">
        <SearchField
          className="pd-clients__search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onClear={() => setSearch('')}
          placeholder="Search admins…"
        />
      </div>

      {error ? (
        <p
          className="pd-settings-form__status pd-settings-form__status--error"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="pd-admin__quiet">Loading admins…</p>
      ) : admins.length === 0 ? (
        <EmptyState
          icon={Shield}
          title="No platform admins"
          description="Add the first operator login for Inventivelab."
          action={
            <Button disabled={!apiReady} onClick={() => setCreateOpen(true)}>
              <Plus size={16} aria-hidden />
              Add admin
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Shield}
          title="No matching admins"
          description="Try a different search."
          action={
            <Button variant="secondary" onClick={() => setSearch('')}>
              Clear search
            </Button>
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Admin</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Type</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((admin) => {
              const isYou = user?.id === admin.id
              return (
                <TableRow key={admin.id}>
                  <TableCell>
                    <span className="pd-admin__user">
                      <Avatar name={admin.name} size="sm" />
                      <span>
                        <span className="pd-admin__user-name">
                          {admin.name}
                          {isYou ? (
                            <>
                              {' '}
                              <Badge variant="pending">You</Badge>
                            </>
                          ) : null}
                        </span>
                      </span>
                    </span>
                  </TableCell>
                  <TableCell className="pd-table__code">{admin.email}</TableCell>
                  <TableCell>
                    <Select
                      size="sm"
                      aria-label={`Status for ${admin.name}`}
                      className={statusToneClass(admin.status)}
                      value={admin.status}
                      options={STATUS_OPTIONS}
                      disabled={!apiReady || busyId != null || isYou}
                      onChange={(event) =>
                        void handleStatusChange(admin, event.target.value)
                      }
                    />
                  </TableCell>
                  <TableCell>
                    {admin.isBootstrap ? (
                      <Badge variant="neutral">Bootstrap</Badge>
                    ) : (
                      <span className="pd-admin__quiet">Operator</span>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}

      <SideDrawer
        open={createOpen}
        onClose={closeCreate}
        title="Add platform admin"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={closeCreate}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="pd-admin-create-platform-admin"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating…' : 'Add admin'}
            </Button>
          </>
        }
      >
        <form
          id="pd-admin-create-platform-admin"
          className="pd-admin__form-stack"
          onSubmit={(event) => void handleCreate(event)}
          noValidate
        >
          <Input
            label="Name"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            onBlur={blur('name')}
            error={showError('name') && !name.trim() ? 'Name is required.' : undefined}
          />
          <Input
            label="Email"
            required
            type="email"
            autoComplete="off"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            onBlur={blur('email')}
            error={
              showError('email') && !email.trim()
                ? 'Email is required.'
                : undefined
            }
          />
          <Input
            label="Initial password"
            required
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onBlur={blur('password')}
            error={
              showError('password') && password.length < 8
                ? 'Password must be at least 8 characters.'
                : undefined
            }
            hint="Share it securely. It is only shown once after create."
          />
          {formError ? (
            <p className="pd-field__error" role="alert">
              {formError}
            </p>
          ) : null}
        </form>
      </SideDrawer>

      <Modal
        open={createdCredentials != null}
        onClose={() => setCreatedCredentials(null)}
        title="Admin created"
        description="Share the login now. The password will not be shown again."
        actions={
          <Button onClick={() => setCreatedCredentials(null)}>Done</Button>
        }
      >
        {createdCredentials ? (
          <div className="pd-admin__form-stack">
            <p className="pd-admin__credential-name">{createdCredentials.name}</p>
            <p className="pd-admin__credential-row">
              Email{' '}
              <CopyableText value={createdCredentials.email} />
            </p>
            <p className="pd-admin__credential-row">
              Password{' '}
              <CopyableText value={createdCredentials.password} />
            </p>
          </div>
        ) : null}
      </Modal>
    </section>
  )
}
