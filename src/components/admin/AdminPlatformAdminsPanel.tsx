import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Plus, Search, Shield } from 'lucide-react'
import { CopyableText } from '@/components/CopyableText'
import { Input } from '@/components/clients/clientShadcnFields'
import { floatingSheetClass } from '@/components/clients/shadcnChrome'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/shadcn/avatar'
import { Badge } from '@/components/shadcn/badge'
import { Button } from '@/components/shadcn/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/shadcn/dialog'
import { Empty, EmptyHeader, EmptyTitle } from '@/components/shadcn/empty'
import { Input as SearchInput } from '@/components/shadcn/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shadcn/select'
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/shadcn/sheet'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/shadcn/table'
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
  adminClientsToolbarClass,
  adminCredentialNameClass,
  adminCredentialRowClass,
  adminFormStackClass,
  adminPanelClass,
  adminPanelTitleClass,
  adminPanelToolbarClass,
  adminQuietClass,
  adminUserClass,
  adminUserNameClass,
  chromeHeadClass,
  tableShellClass,
  whiteControlClass,
} from '@/components/admin/adminChrome'
import '@/styles/layout-clients.css'

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'disabled', label: 'Disabled' },
]

const statusTriggerClass = 'h-8 w-[7.5rem] rounded-lg'

type CreateField = 'name' | 'email' | 'password'

type CreatedCredentials = {
  name: string
  email: string
  password: string
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
    <section className={adminPanelClass} aria-label="Platform Admins">
      <div className={adminPanelToolbarClass}>
        <h2 className={adminPanelTitleClass}>Platform Admins</h2>
        <Button
          className="h-9 rounded-lg"
          disabled={!apiReady}
          onClick={() => setCreateOpen(true)}
        >
          <Plus size={16} strokeWidth={2.2} aria-hidden />
          Add Admin
        </Button>
      </div>

      {!apiReady ? (
        <p className={adminQuietClass}>
          Connect the platform API to manage live admin accounts.
        </p>
      ) : null}

      <div className={adminClientsToolbarClass}>
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <SearchInput
            className={cn('pl-8', whiteControlClass)}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search Admins…"
            aria-label="Search Admins"
          />
        </div>
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
        <p className={adminQuietClass}>Loading admins…</p>
      ) : admins.length === 0 ? (
        <Empty className="bg-card shadow-sm">
          <EmptyHeader>
            <Shield size={20} aria-hidden />
            <EmptyTitle>No Platform Admins</EmptyTitle>
          </EmptyHeader>
          <Button className="h-9 rounded-lg" disabled={!apiReady} onClick={() => setCreateOpen(true)}>
            <Plus size={16} aria-hidden />
            Add Admin
          </Button>
        </Empty>
      ) : filtered.length === 0 ? (
        <Empty className="bg-card shadow-sm">
          <EmptyHeader>
            <Shield size={20} aria-hidden />
            <EmptyTitle>No Matching Admins</EmptyTitle>
          </EmptyHeader>
          <Button variant="outline" className="h-9 rounded-lg" onClick={() => setSearch('')}>
            Clear Search
          </Button>
        </Empty>
      ) : (
        <div className={tableShellClass}>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-0">
                <TableHead className={chromeHeadClass}>Admin</TableHead>
                <TableHead className={chromeHeadClass}>Email</TableHead>
                <TableHead className={chromeHeadClass}>Status</TableHead>
                <TableHead className={chromeHeadClass}>Type</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((admin) => {
                const isYou = user?.id === admin.id
                return (
                  <TableRow key={admin.id}>
                    <TableCell>
                      <span className={adminUserClass}>
                        <Avatar size="sm">
                          <AvatarFallback>{initials(admin.name)}</AvatarFallback>
                        </Avatar>
                        <span>
                          <span className={adminUserNameClass}>
                            {admin.name}
                            {isYou ? (
                              <>
                                {' '}
                                <Badge variant="outline">You</Badge>
                              </>
                            ) : null}
                          </span>
                        </span>
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{admin.email}</TableCell>
                    <TableCell>
                      <Select
                        value={admin.status}
                        disabled={!apiReady || busyId != null || isYou}
                        onValueChange={(next) => void handleStatusChange(admin, next)}
                      >
                        <SelectTrigger
                          aria-label={`Status for ${admin.name}`}
                          className={statusTriggerClass}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {admin.isBootstrap ? (
                        <Badge variant="secondary">Bootstrap</Badge>
                      ) : (
                        <span className={adminQuietClass}>Operator</span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Sheet
        open={createOpen}
        onOpenChange={(next) => {
          if (!next) closeCreate()
        }}
      >
        <SheetContent className={floatingSheetClass}>
          <SheetHeader className="border-b border-border px-5 py-4 pr-12">
            <SheetTitle className="text-base font-semibold">Add Platform Admin</SheetTitle>
          </SheetHeader>
          <form
            id="pd-admin-create-platform-admin"
            className="flex flex-col gap-4 p-5"
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
              label="Initial Password"
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
            />
            {formError ? (
              <p className="m-0 text-sm text-destructive" role="alert">
                {formError}
              </p>
            ) : null}
          </form>
          <SheetFooter className="border-t border-border px-5 py-4 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              className="h-9 rounded-lg"
              onClick={closeCreate}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="pd-admin-create-platform-admin"
              className="h-9 rounded-lg"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating…' : 'Add Admin'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Dialog
        open={createdCredentials != null}
        onOpenChange={(next) => {
          if (!next) setCreatedCredentials(null)
        }}
      >
        <DialogContent className="border border-border bg-card shadow-[var(--shadow-deep)] ring-0 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Copy This Password. It Will Not Be Shown Again.
            </DialogTitle>
          </DialogHeader>
          {createdCredentials ? (
            <div className={adminFormStackClass}>
              <p className={adminCredentialNameClass}>{createdCredentials.name}</p>
              <p className={adminCredentialRowClass}>
                Email <CopyableText value={createdCredentials.email} />
              </p>
              <p className={adminCredentialRowClass}>
                Password{' '}
                <CopyableText
                  value={createdCredentials.password}
                  label="password"
                />
              </p>
            </div>
          ) : null}
          <DialogFooter className="border-0 bg-transparent">
            <Button
              className="h-9 rounded-lg"
              onClick={() => setCreatedCredentials(null)}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
