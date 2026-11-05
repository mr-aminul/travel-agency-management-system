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
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  Input,
  SearchField,
  Select,
  SideDrawer,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
  type SelectOption,
} from '@/components/ui'
import { AnnouncementRichBody } from '@/components/announcements/AnnouncementRichBody'
import type {
  AnnouncementKind,
  AnnouncementRepeatMode,
  PlatformAnnouncement,
} from '@/types/announcement'
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

const REPEAT_OPTIONS: SelectOption[] = [
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
    <section className="pd-admin__panel" aria-label="Announcements">
      <div className="pd-admin__panel-header">
        <div>
          <h2 className="pd-admin__panel-title">Announcements</h2>
          <p className="pd-admin__panel-desc">
            Pick a template, edit the copy, and every agency sees a popup while
            it is live — policy, security, promo, maintenance, and more.
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus size={16} strokeWidth={2.2} aria-hidden />
          New announcement
        </Button>
      </div>

      <div className="pd-announce-kind-strip" aria-hidden>
        {ANNOUNCEMENT_KINDS.map((kind) => {
          const meta = ANNOUNCEMENT_KIND_META[kind]
          const Icon = meta.icon
          return (
            <span
              key={kind}
              className={cx(
                'pd-announce-kind-chip',
                `pd-announce-kind-chip--${kind}`,
              )}
            >
              <Icon size={13} strokeWidth={2.2} aria-hidden />
              {meta.shortLabel}
            </span>
          )
        })}
      </div>

      <div className="pd-clients__toolbar">
        <SearchField
          className="pd-clients__search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onClear={() => setSearch('')}
          placeholder="Search announcements…"
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
      {status ? (
        <p className="pd-settings-form__status" role="status">
          {status}
        </p>
      ) : null}

      {loading ? (
        <p className="pd-admin__quiet">Loading announcements…</p>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No announcements yet"
          description="Start from a template — policy, security, promo, or a blank message."
          action={
            <Button onClick={openCreate}>
              <LayoutTemplate size={16} aria-hidden />
              Choose a template
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No matching announcements"
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
              <TableHead>Announcement</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>On</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Where</TableHead>
              <TableHead>Starts</TableHead>
              <TableHead>Ends</TableHead>
              <TableHead className="pd-table__actions-col">Actions</TableHead>
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
                        <span className="pd-admin__user-name">{item.title}</span>
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
                    <Switch
                      label={item.published ? 'On' : 'Off'}
                      checked={item.published}
                      disabled={togglingId === item.id}
                      onChange={() => void togglePublished(item)}
                    />
                  </TableCell>
                  <TableCell>
                    <Badge variant={announcementStatusVariant(item.status)}>
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
                        variant="secondary"
                        onClick={() => openEdit(item)}
                      >
                        <Pencil size={14} aria-hidden />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
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
      )}

      <SideDrawer
        open={editorOpen}
        onClose={closeEditor}
        title={
          editorMode === 'edit'
            ? 'Edit announcement'
            : createStep === 'templates'
              ? 'Choose a template'
              : 'Compose announcement'
        }
        description={
          editorMode === 'edit'
            ? 'Update the message every agency will see while it is live.'
            : createStep === 'templates'
              ? 'Start from a ready-made notice, then tweak the wording.'
              : 'Edit the copy, schedule when it shows, then publish.'
        }
        footer={
          showCompose ? (
            <>
              {editorMode === 'create' ? (
                <Button
                  variant="secondary"
                  disabled={saving || uploading}
                  onClick={() => setCreateStep('templates')}
                >
                  Templates
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  disabled={saving || uploading}
                  onClick={closeEditor}
                >
                  Cancel
                </Button>
              )}
              <Button
                type="submit"
                form={formId}
                disabled={saving || uploading}
              >
                {saving
                  ? 'Saving…'
                  : editorMode === 'create'
                    ? 'Publish'
                    : 'Save changes'}
              </Button>
            </>
          ) : (
            <Button variant="secondary" onClick={closeEditor}>
              Cancel
            </Button>
          )
        }
      >
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
                    <span className="pd-announce-template__desc">
                      {template.description}
                    </span>
                    <span className="pd-announce-template__kind">
                      {ANNOUNCEMENT_KIND_META[template.kind].label}
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

            {draft.templateId ? (
              <p className="pd-announce-template-hint">
                <KindIcon size={14} aria-hidden />
                Started from template — edit the bracketed placeholders before
                publishing.
              </p>
            ) : null}

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
              hint="Tip: lines like “How it works:”, “• bullet”, and “1. step” become colored boxes in the popup."
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
              <p className="pd-announce-format-hint">
                Change Type above to restyle colors for every agency. Publish when
                the preview looks right.
              </p>
            </div>

            <div className="pd-announce-schedule">
              <Input
                label="Starts (optional)"
                type="datetime-local"
                value={draft.startsAtLocal}
                onChange={(event) =>
                  patchDraft('startsAtLocal', event.target.value)
                }
                hint="Blank = show as soon as it is published."
              />
              <Input
                label="Ends (optional)"
                type="datetime-local"
                value={draft.endsAtLocal}
                onChange={(event) =>
                  patchDraft('endsAtLocal', event.target.value)
                }
                hint="Blank = stay live until you unpublish or delete."
              />
            </div>

            <div className="pd-announce-publish">
              <Switch
                checked={draft.published}
                onChange={(event) =>
                  patchDraft('published', event.target.checked)
                }
                label="On (published)"
              />
              <p className="pd-admin__quiet">
                Turn off anytime from the list — Off announcements never pop up.
              </p>
            </div>

            <div className="pd-announce-publish">
              <span className="pd-announce-image__label">Where it shows</span>
              <Switch
                checked={draft.showInApp}
                onChange={(event) =>
                  patchDraft('showInApp', event.target.checked)
                }
                label="Agency app popup"
              />
              <Switch
                checked={draft.showOnLanding}
                onChange={(event) =>
                  patchDraft('showOnLanding', event.target.checked)
                }
                label="Main landing page popup"
              />
              <p className="pd-admin__quiet">
                Landing page is the public marketing site. Leave off unless you
                want guests to see this too.
              </p>
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
                    label="Max times per day"
                    type="number"
                    min={0}
                    value={draft.maxShowsPerDay}
                    onChange={(event) =>
                      patchDraft('maxShowsPerDay', event.target.value)
                    }
                    hint="0 = unlimited (standard)."
                  />
                  <Input
                    label="Minutes between shows"
                    type="number"
                    min={0}
                    value={draft.intervalMinutes}
                    onChange={(event) =>
                      patchDraft('intervalMinutes', event.target.value)
                    }
                    hint="0 = every visit. 60 = once per hour."
                  />
                </div>
              ) : (
                <p className="pd-admin__quiet">
                  After Got it, this stays hidden until you edit and save it
                  again.
                </p>
              )}
            </div>

            <div className="pd-announce-image">
              <div className="pd-announce-image__header">
                <span className="pd-announce-image__label">
                  Image (optional)
                </span>
                <div className="pd-announce-actions">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
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
                <p className="pd-admin__quiet">
                  PNG, JPG, or WebP up to 1.5 MB. Shown above the message in the
                  popup.
                </p>
              )}
            </div>
          </form>
        )}
      </SideDrawer>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => {
          if (!deleting) setPendingDelete(null)
        }}
        title="Delete announcement?"
        description={
          pendingDelete
            ? `“${pendingDelete.title}” will stop showing for all agencies.`
            : undefined
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
