import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react'
import {
  ImagePlus,
  LayoutTemplate,
  Megaphone,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import {
  announcementStatusLabel,
  announcementStatusVariant,
  createAnnouncement,
  deleteAnnouncement,
  listAnnouncementsAdmin,
  updateAnnouncement,
  uploadAnnouncementImage,
} from '@/lib/announcementsApi'
import {
  ANNOUNCEMENT_KIND_META,
  ANNOUNCEMENT_KINDS,
  ANNOUNCEMENT_TEMPLATES,
  announcementKindIcon,
  announcementKindLabel,
  type AnnouncementTemplate,
} from '@/lib/announcementTemplates'
import { cx } from '@/lib/cx'
import {
  floatingSheetClass,
  floatingSheetWideClass,
} from '@/components/clients/shadcnChrome'
import { Input, Select, Textarea } from '@/components/clients/clientShadcnFields'
import { cn } from '@/lib/utils'
import { LabeledSwitch } from '@/components/clients/LabeledSwitch'
import { Badge } from '@/components/shadcn/badge'
import { Button } from '@/components/shadcn/button'
import { ConfirmDialog } from '@/components/shadcn/confirm-dialog'
import { Empty, EmptyHeader, EmptyTitle } from '@/components/shadcn/empty'
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
import { Input as SearchInput } from '@/components/shadcn/input'
import { AnnouncementRichBody } from '@/components/announcements/AnnouncementRichBody'
import type {
  AnnouncementKind,
  AnnouncementRepeatMode,
  PlatformAnnouncement,
} from '@/types/announcement'
import {
  adminClientsToolbarClass,
  adminPanelClass,
  adminPanelHeaderClass,
  adminPanelTitleClass,
  adminQuietClass,
  adminUserNameClass,
  chromeHeadClass,
  tableShellClass,
  whiteControlClass,
} from '@/components/admin/adminChrome'
import '@/styles/layout-clients.css'
import '@/styles/layout-announcements.css'

type EditorMode = 'create' | 'edit'
type CreateStep = 'templates' | 'compose'

type Draft = {
  kind: AnnouncementKind
  title: string
  body: string
  published: boolean
  showInApp: boolean
  showOnLanding: boolean
  repeatMode: AnnouncementRepeatMode
  maxShowsPerDay: string
  intervalMinutes: string
  startsAtLocal: string
  endsAtLocal: string
  imageUrl: string | null
  imageFileId: string | null
  templateId: string | null
}

const REPEAT_OPTIONS = [
  {
    value: 'continuous',
    label: 'Continuous (standard) — can show again',
  },
  {
    value: 'once',
    label: 'Once — hide after Got it until edited',
  },
]

function emptyDraft(): Draft {
  return {
    kind: 'general',
    title: '',
    body: '',
    published: true,
    showInApp: true,
    showOnLanding: false,
    repeatMode: 'continuous',
    maxShowsPerDay: '0',
    intervalMinutes: '60',
    startsAtLocal: '',
    endsAtLocal: '',
    imageUrl: null,
    imageFileId: null,
    templateId: null,
  }
}

function isoToLocalInput(iso: string | null | undefined): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function localInputToIso(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const date = new Date(trimmed)
  if (Number.isNaN(date.getTime())) {
    throw new Error('Enter a valid date and time.')
  }
  return date.toISOString()
}

function draftFromAnnouncement(item: PlatformAnnouncement): Draft {
  return {
    kind: item.kind ?? 'general',
    title: item.title,
    body: item.body,
    published: item.published,
    showInApp: item.showInApp !== false,
    showOnLanding: Boolean(item.showOnLanding),
    repeatMode: item.repeatMode === 'once' ? 'once' : 'continuous',
    maxShowsPerDay: String(item.maxShowsPerDay ?? 0),
    intervalMinutes: String(item.intervalMinutes ?? 0),
    startsAtLocal: isoToLocalInput(item.startsAt),
    endsAtLocal: isoToLocalInput(item.endsAt),
    imageUrl: item.imageUrl,
    imageFileId: item.imageFileId,
    templateId: null,
  }
}

function draftFromTemplate(template: AnnouncementTemplate): Draft {
  return {
    ...emptyDraft(),
    kind: template.kind,
    title: template.title,
    body: template.body,
    templateId: template.id,
  }
}

function formatWhen(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

export function AdminAnnouncementsPanel() {
  const formId = useId()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [items, setItems] = useState<PlatformAnnouncement[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorMode, setEditorMode] = useState<EditorMode>('create')
  const [createStep, setCreateStep] = useState<CreateStep>('templates')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [formError, setFormError] = useState<string | undefined>()
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [pendingDelete, setPendingDelete] =
    useState<PlatformAnnouncement | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setItems(await listAnnouncementsAdmin())
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not load announcements.',
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return items
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.body.toLowerCase().includes(q) ||
        announcementKindLabel(item.kind).toLowerCase().includes(q),
    )
  }, [items, search])

  const showCompose =
    editorMode === 'edit' || (editorMode === 'create' && createStep === 'compose')

  const openCreate = () => {
    setEditorMode('create')
    setCreateStep('templates')
    setEditingId(null)
    setDraft(emptyDraft())
    setFormError(undefined)
    setStatus(null)
    setError(null)
    setEditorOpen(true)
  }

  const openEdit = (item: PlatformAnnouncement) => {
    setEditorMode('edit')
    setCreateStep('compose')
    setEditingId(item.id)
    setDraft(draftFromAnnouncement(item))
    setFormError(undefined)
    setStatus(null)
    setError(null)
    setEditorOpen(true)
  }

  const closeEditor = () => {
    if (saving || uploading) return
    setEditorOpen(false)
  }

  const selectTemplate = (template: AnnouncementTemplate) => {
    setDraft(draftFromTemplate(template))
    setFormError(undefined)
    setCreateStep('compose')
  }

  const patchDraft = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  const handleImagePick = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setUploading(true)
    setFormError(undefined)
    try {
      const uploaded = await uploadAnnouncementImage(file)
      setDraft((prev) => ({
        ...prev,
        imageUrl: uploaded.url,
        imageFileId: uploaded.id,
      }))
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not upload image.')
    } finally {
      setUploading(false)
    }
  }

  const clearImage = () => {
    setDraft((prev) => ({ ...prev, imageUrl: null, imageFileId: null }))
  }

  const handleSave = async (event: FormEvent) => {
    event.preventDefault()
    if (!showCompose) return
    setSaving(true)
    setFormError(undefined)
    setError(null)
    setStatus(null)
    try {
      const payload = {
        title: draft.title,
        body: draft.body,
        kind: draft.kind,
        published: draft.published,
        showInApp: draft.showInApp,
        showOnLanding: draft.showOnLanding,
        repeatMode: draft.repeatMode,
        maxShowsPerDay: Number(draft.maxShowsPerDay) || 0,
        intervalMinutes: Number(draft.intervalMinutes) || 0,
        startsAt: localInputToIso(draft.startsAtLocal),
        endsAt: localInputToIso(draft.endsAtLocal),
        imageUrl: draft.imageUrl,
        imageFileId: draft.imageFileId,
      }
      if (editorMode === 'create') {
        const created = await createAnnouncement(payload)
        setStatus(`Published “${created.title}”.`)
      } else if (editingId) {
        const updated = await updateAnnouncement(editingId, payload)
        setStatus(`Saved “${updated.title}”.`)
      }
      setEditorOpen(false)
      await reload()
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Could not save announcement.',
      )
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return
    setDeleting(true)
    setError(null)
    try {
      await deleteAnnouncement(pendingDelete.id)
      setStatus(`Deleted “${pendingDelete.title}”.`)
      setPendingDelete(null)
      await reload()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not delete announcement.',
      )
    } finally {
      setDeleting(false)
    }
  }

  const togglePublished = async (item: PlatformAnnouncement) => {
    setTogglingId(item.id)
    setError(null)
    try {
      const next = !item.published
      await updateAnnouncement(item.id, { published: next })
      setStatus(
        next
          ? `Turned on “${item.title}”.`
          : `Turned off “${item.title}”.`,
      )
      await reload()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not update announcement.',
      )
    } finally {
      setTogglingId(null)
    }
  }

  const KindIcon = announcementKindIcon(draft.kind)

  return (
    <section className={adminPanelClass} aria-label="Announcements">
      <div className={adminPanelHeaderClass}>
        <div>
          <h2 className={adminPanelTitleClass}>Announcements</h2>
        </div>
        <Button size="sm" className="h-9 rounded-lg" onClick={openCreate}>
          <Plus size={16} strokeWidth={2.2} aria-hidden />
          New Announcement
        </Button>
      </div>

      <div className={adminClientsToolbarClass}>
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <SearchInput
            className={cn('pl-8', whiteControlClass)}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search Announcements…"
            aria-label="Search Announcements"
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
      {status ? (
        <p className="pd-settings-form__status" role="status">
          {status}
        </p>
      ) : null}

      {loading ? (
        <p className={adminQuietClass}>Loading announcements…</p>
      ) : items.length === 0 ? (
        <Empty className="bg-card shadow-sm">
          <EmptyHeader>
            <Megaphone size={20} aria-hidden />
            <EmptyTitle>No Announcements Yet</EmptyTitle>
          </EmptyHeader>
          <Button className="h-9 rounded-lg" onClick={openCreate}>
            <LayoutTemplate size={16} aria-hidden />
            Choose A Template
          </Button>
        </Empty>
      ) : filtered.length === 0 ? (
        <Empty className="bg-card shadow-sm">
          <EmptyHeader>
            <Megaphone size={20} aria-hidden />
            <EmptyTitle>No Matching Announcements</EmptyTitle>
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
                <TableHead className={chromeHeadClass}>Announcement</TableHead>
                <TableHead className={chromeHeadClass}>Type</TableHead>
                <TableHead className={chromeHeadClass}>On</TableHead>
                <TableHead className={chromeHeadClass}>Status</TableHead>
                <TableHead className={chromeHeadClass}>Where</TableHead>
                <TableHead className={chromeHeadClass}>Starts</TableHead>
                <TableHead className={chromeHeadClass}>Ends</TableHead>
                <TableHead className={cn(chromeHeadClass, 'pd-table__actions-col')}>
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
          <TableBody>
            {filtered.map((item) => {
              const RowIcon = announcementKindIcon(item.kind)
              return (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="pd-announce-row">
                      {item.imageUrl ? (
                        <img
                          className="pd-announce-row__thumb"
                          src={item.imageUrl}
                          alt=""
                        />
                      ) : (
                        <span
                          className={cx(
                            'pd-announce-row__thumb',
                            'pd-announce-row__thumb--empty',
                            `pd-announce-row__thumb--${item.kind}`,
                          )}
                        >
                          <RowIcon size={16} aria-hidden />
                        </span>
                      )}
                      <span className="pd-announce-row__text">
                        <span className={adminUserNameClass}>{item.title}</span>
                        <span className="pd-announce-row__preview">
                          {item.body}
                        </span>
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={cx(
                        'pd-announce-kind-chip',
                        `pd-announce-kind-chip--${item.kind}`,
                      )}
                    >
                      {announcementKindLabel(item.kind)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <LabeledSwitch
                      label={item.published ? 'On' : 'Off'}
                      checked={item.published}
                      disabled={togglingId === item.id}
                      onChange={() => void togglePublished(item)}
                    />
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        (
                          {
                            completed: 'default',
                            'in-progress': 'secondary',
                            neutral: 'secondary',
                            pending: 'outline',
                          } as const
                        )[announcementStatusVariant(item.status)]
                      }
                    >
                      {announcementStatusLabel(item.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="pd-announce-where">
                      {[
                        item.showInApp !== false ? 'App' : null,
                        item.showOnLanding ? 'Landing' : null,
                      ]
                        .filter(Boolean)
                        .join(' · ') || '—'}
                    </span>
                  </TableCell>
                  <TableCell>{formatWhen(item.startsAt)}</TableCell>
                  <TableCell>{formatWhen(item.endsAt)}</TableCell>
                  <TableCell>
                    <div className="pd-announce-actions">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-9 rounded-lg"
                        onClick={() => openEdit(item)}
                      >
                        <Pencil size={14} aria-hidden />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-9 rounded-lg"
                        onClick={() => setPendingDelete(item)}
                        aria-label={`Delete ${item.title}`}
                      >
                        <Trash2 size={14} aria-hidden />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
        </div>
      )}

      <Sheet
        open={editorOpen}
        onOpenChange={(next) => {
          if (!next) closeEditor()
        }}
      >
        <SheetContent className={`${floatingSheetClass} ${floatingSheetWideClass}`}>
          <SheetHeader className="border-b border-border px-5 py-4 pr-12">
            <SheetTitle className="text-base font-semibold">
              {editorMode === 'edit'
                ? 'Edit Announcement'
                : createStep === 'templates'
                  ? 'Choose A Template'
                  : 'Compose Announcement'}
            </SheetTitle>
          </SheetHeader>
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5">
        {editorMode === 'create' && createStep === 'templates' ? (
          <div className="pd-announce-templates" role="list">
            {ANNOUNCEMENT_TEMPLATES.map((template) => {
              const Icon = template.icon
              return (
                <button
                  key={template.id}
                  type="button"
                  role="listitem"
                  className={cx(
                    'pd-announce-template',
                    `pd-announce-template--${template.kind}`,
                  )}
                  onClick={() => selectTemplate(template)}
                >
                  <span
                    className={cx(
                      'pd-announce-template__icon',
                      `pd-announce-kind-chip--${template.kind}`,
                    )}
                    aria-hidden
                  >
                    <Icon size={18} strokeWidth={2.1} />
                  </span>
                  <span className="pd-announce-template__body">
                    <span className="pd-announce-template__label">
                      {template.label}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        ) : (
          <form id={formId} className="pd-announce-form" onSubmit={handleSave}>
            {formError ? (
              <p
                className="pd-settings-form__status pd-settings-form__status--error"
                role="alert"
              >
                {formError}
              </p>
            ) : null}

            <div className="pd-announce-kind-picker" role="group" aria-label="Type">
              <span className="pd-announce-image__label">Type</span>
              <div className="pd-announce-kind-picker__grid">
                {ANNOUNCEMENT_KINDS.map((kind) => {
                  const meta = ANNOUNCEMENT_KIND_META[kind]
                  const Icon = meta.icon
                  const selected = draft.kind === kind
                  return (
                    <button
                      key={kind}
                      type="button"
                      className={cx(
                        'pd-announce-kind-option',
                        `pd-announce-kind-option--${kind}`,
                        selected && 'is-selected',
                      )}
                      aria-pressed={selected}
                      onClick={() => patchDraft('kind', kind)}
                    >
                      <Icon size={14} strokeWidth={2.2} aria-hidden />
                      {meta.shortLabel}
                    </button>
                  )
                })}
              </div>
            </div>

            <Input
              label="Title"
              value={draft.title}
              onChange={(event) => patchDraft('title', event.target.value)}
              maxLength={160}
              required
              autoFocus
            />

            <Textarea
              label="Message"
              value={draft.body}
              onChange={(event) => patchDraft('body', event.target.value)}
              rows={8}
              maxLength={4000}
              required
            />

            <div className="pd-announce-preview">
              <span className="pd-announce-preview__label">Agency popup preview</span>
              <div
                className={cx(
                  'pd-announce-preview__card',
                  `pd-announce-dialog--${draft.kind}`,
                )}
              >
                <header className="pd-announce-dialog__hero">
                  <span
                    className={cx(
                      'pd-announce-kind-chip',
                      `pd-announce-kind-chip--${draft.kind}`,
                    )}
                  >
                    <KindIcon size={13} strokeWidth={2.2} aria-hidden />
                    {announcementKindLabel(draft.kind)}
                  </span>
                  <div className="pd-announce-dialog__hero-main">
                    {draft.imageUrl ? (
                      <img
                        className="pd-announce-dialog__cover"
                        src={draft.imageUrl}
                        alt=""
                      />
                    ) : (
                      <div
                        className={cx(
                          'pd-announce-dialog__badge',
                          `pd-announce-popup__icon--${draft.kind}`,
                        )}
                        aria-hidden
                      >
                        <KindIcon size={26} strokeWidth={1.75} />
                      </div>
                    )}
                    <h3 className="pd-announce-dialog__title">
                      {draft.title.trim() || 'Announcement title'}
                    </h3>
                  </div>
                </header>
                <div className="pd-announce-dialog__body">
                  <AnnouncementRichBody
                    body={
                      draft.body.trim() ||
                      'Your message will appear here with boxed lists and steps.'
                    }
                    kind={draft.kind}
                  />
                </div>
              </div>
            </div>

            <div className="pd-announce-schedule">
              <Input
                label="Starts"
                type="datetime-local"
                value={draft.startsAtLocal}
                onChange={(event) =>
                  patchDraft('startsAtLocal', event.target.value)
                }
              />
              <Input
                label="Ends"
                type="datetime-local"
                value={draft.endsAtLocal}
                onChange={(event) =>
                  patchDraft('endsAtLocal', event.target.value)
                }
              />
            </div>

            <div className="pd-announce-publish">
              <LabeledSwitch
                checked={draft.published}
                onChange={(event) =>
                  patchDraft('published', event.target.checked)
                }
                label="On (published)"
              />
            </div>

            <div className="pd-announce-publish">
              <span className="pd-announce-image__label">Where it shows</span>
              <LabeledSwitch
                checked={draft.showInApp}
                onChange={(event) =>
                  patchDraft('showInApp', event.target.checked)
                }
                label="Agency app popup"
              />
              <LabeledSwitch
                checked={draft.showOnLanding}
                onChange={(event) =>
                  patchDraft('showOnLanding', event.target.checked)
                }
                label="Main landing page popup"
              />
            </div>

            <div className="pd-announce-publish">
              <Select
                label="How often"
                options={REPEAT_OPTIONS}
                value={draft.repeatMode}
                onChange={(event) =>
                  patchDraft(
                    'repeatMode',
                    event.target.value === 'once' ? 'once' : 'continuous',
                  )
                }
              />
              {draft.repeatMode === 'continuous' ? (
                <div className="pd-announce-schedule">
                  <Input
                    label="Max per day, 0 = no cap"
                    type="number"
                    min={0}
                    value={draft.maxShowsPerDay}
                    onChange={(event) =>
                      patchDraft('maxShowsPerDay', event.target.value)
                    }
                  />
                  <Input
                    label="Minutes between shows, 0 = every visit"
                    type="number"
                    min={0}
                    value={draft.intervalMinutes}
                    onChange={(event) =>
                      patchDraft('intervalMinutes', event.target.value)
                    }
                  />
                </div>
              ) : null}
            </div>

            <div className="pd-announce-image">
              <div className="pd-announce-image__header">
                <span className="pd-announce-image__label">Image</span>
                <div className="pd-announce-actions">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <ImagePlus size={14} aria-hidden />
                    {uploading
                      ? 'Uploading…'
                      : draft.imageUrl
                        ? 'Replace'
                        : 'Add'}
                  </Button>
                  {draft.imageUrl ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={uploading}
                      onClick={clearImage}
                    >
                      <X size={14} aria-hidden />
                      Remove
                    </Button>
                  ) : null}
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                hidden
                onChange={(event) => void handleImagePick(event)}
              />
              {draft.imageUrl ? (
                <img
                  className="pd-announce-image__preview"
                  src={draft.imageUrl}
                  alt="Announcement preview"
                />
              ) : (
                <p className={adminQuietClass}>
                  PNG, JPG, or WebP up to 1.5 MB. Shown above the message in the
                  popup.
                </p>
              )}
            </div>
          </form>
        )}
          </div>
          <SheetFooter className="border-t border-border px-5 py-4 sm:flex-row sm:justify-end">
            {showCompose ? (
              <>
                {editorMode === 'create' ? (
                  <Button
                    variant="outline"
                    className="h-9 rounded-lg"
                    disabled={saving || uploading}
                    onClick={() => setCreateStep('templates')}
                  >
                    Templates
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="h-9 rounded-lg"
                    disabled={saving || uploading}
                    onClick={closeEditor}
                  >
                    Cancel
                  </Button>
                )}
                <Button
                  type="submit"
                  form={formId}
                  className="h-9 rounded-lg"
                  disabled={saving || uploading}
                >
                  {saving
                    ? 'Saving…'
                    : editorMode === 'create'
                      ? 'Publish'
                      : 'Save Changes'}
                </Button>
              </>
            ) : (
              <Button variant="outline" className="h-9 rounded-lg" onClick={closeEditor}>
                Cancel
              </Button>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => {
          if (!deleting) setPendingDelete(null)
        }}
        title={
          pendingDelete
            ? `Delete “${pendingDelete.title}”? It stops showing.`
            : 'Delete announcement?'
        }
        confirmLabel={deleting ? 'Deleting…' : 'Delete'}
        confirmVariant="danger"
        onConfirm={() => {
          if (!deleting) void confirmDelete()
        }}
      />
    </section>
  )
}
