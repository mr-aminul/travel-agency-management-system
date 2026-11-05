import { apiFetch, ApiError } from '@/lib/apiClient'
import { normalizeAnnouncementKind } from '@/lib/announcementTemplates'
import { authApiConfigured } from '@/lib/billing/platformFlag'
import type {
  ActiveAnnouncement,
  AnnouncementInput,
  AnnouncementRepeatMode,
  AnnouncementStatus,
  PlatformAnnouncement,
} from '@/types/announcement'

const KV_KEY = 'pd-platform-announcements'
const LOCAL_KEY = 'pd-platform-announcements'

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    const body = error.body
    if (
      body &&
      typeof body === 'object' &&
      'error' in body &&
      typeof (body as { error: unknown }).error === 'string'
    ) {
      return (body as { error: string }).error
    }
  }
  if (error instanceof Error && error.message) return error.message
  return fallback
}

function isNotFound(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404
}

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `ann-${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`
  }
  return `ann-${Date.now().toString(36)}`
}

function normalizeRepeatMode(value: unknown): AnnouncementRepeatMode {
  return value === 'once' ? 'once' : 'continuous'
}

function normalizeNonNegInt(value: unknown, fallback = 0): number {
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0) return fallback
  return Math.min(10_000, Math.floor(n))
}

function lifecycle(
  item: Omit<PlatformAnnouncement, 'status'>,
  now = Date.now(),
): AnnouncementStatus {
  if (!item.published) return 'draft'
  const starts = item.startsAt ? new Date(item.startsAt).getTime() : null
  const ends = item.endsAt ? new Date(item.endsAt).getTime() : null
  if (starts != null && starts > now) return 'scheduled'
  if (ends != null && ends <= now) return 'ended'
  return 'live'
}

function coerceAnnouncement(
  item: Partial<PlatformAnnouncement> & { id: string },
): Omit<PlatformAnnouncement, 'status'> {
  return {
    id: item.id,
    title: String(item.title ?? ''),
    body: String(item.body ?? ''),
    kind: normalizeAnnouncementKind(item.kind),
    imageUrl: item.imageUrl ?? null,
    imageFileId: item.imageFileId ?? null,
    published: item.published !== false,
    showInApp: item.showInApp !== false,
    showOnLanding: Boolean(item.showOnLanding),
    repeatMode: normalizeRepeatMode(item.repeatMode),
    maxShowsPerDay: normalizeNonNegInt(item.maxShowsPerDay, 0),
    intervalMinutes: normalizeNonNegInt(item.intervalMinutes, 0),
    startsAt: item.startsAt ?? null,
    endsAt: item.endsAt ?? null,
    createdAt: item.createdAt ?? new Date().toISOString(),
    updatedAt: item.updatedAt ?? new Date().toISOString(),
    createdBy: item.createdBy ?? null,
  }
}

function withStatus(
  item: Omit<PlatformAnnouncement, 'status'> | Partial<PlatformAnnouncement> & { id: string },
): PlatformAnnouncement {
  const coerced = coerceAnnouncement(item as Partial<PlatformAnnouncement> & { id: string })
  return {
    ...coerced,
    status: lifecycle(coerced),
  }
}

function normalizeRows(raw: unknown): PlatformAnnouncement[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((item) => item && typeof item === 'object' && 'id' in item)
    .map((item) =>
      withStatus(item as Partial<PlatformAnnouncement> & { id: string }),
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

function stripStatus(list: PlatformAnnouncement[]) {
  return list.map(({ status: _status, ...rest }) => rest)
}

function readBrowserLocal(): PlatformAnnouncement[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    if (!raw) return []
    return normalizeRows(JSON.parse(raw) as unknown)
  } catch {
    return []
  }
}

function writeBrowserLocal(list: PlatformAnnouncement[]) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(stripStatus(list)))
}

function normalizeInput(
  input: AnnouncementInput,
  { partial = false }: { partial?: boolean } = {},
) {
  const next: Partial<AnnouncementInput> = {}

  if (!partial || input.title !== undefined) {
    const title = String(input.title ?? '')
      .trim()
      .slice(0, 160)
    if (!title) throw new Error('Title is required.')
    next.title = title
  }

  if (!partial || input.body !== undefined) {
    const body = String(input.body ?? '')
      .trim()
      .slice(0, 4000)
    if (!body) throw new Error('Message is required.')
    next.body = body
  }

  if (!partial || input.published !== undefined) {
    next.published = input.published !== false
  }

  if (!partial || input.kind !== undefined) {
    next.kind = normalizeAnnouncementKind(input.kind)
  }

  if (!partial || input.showInApp !== undefined) {
    next.showInApp = input.showInApp !== false
  }

  if (!partial || input.showOnLanding !== undefined) {
    next.showOnLanding = Boolean(input.showOnLanding)
  }

  if (!partial || input.repeatMode !== undefined) {
    next.repeatMode = normalizeRepeatMode(input.repeatMode)
  }

  if (!partial || input.maxShowsPerDay !== undefined) {
    next.maxShowsPerDay = normalizeNonNegInt(input.maxShowsPerDay, 0)
  }

  if (!partial || input.intervalMinutes !== undefined) {
    next.intervalMinutes = normalizeNonNegInt(input.intervalMinutes, 0)
  }

  if (!partial || input.startsAt !== undefined) {
    next.startsAt = input.startsAt?.trim() ? input.startsAt : null
  }

  if (!partial || input.endsAt !== undefined) {
    next.endsAt = input.endsAt?.trim() ? input.endsAt : null
  }

  if (next.startsAt && next.endsAt) {
    if (new Date(next.endsAt) <= new Date(next.startsAt)) {
      throw new Error('End time must be after the start time.')
    }
  }

  if (!partial || input.imageUrl !== undefined) {
    next.imageUrl = input.imageUrl?.trim() || null
  }

  if (!partial || input.imageFileId !== undefined) {
    next.imageFileId = input.imageFileId?.trim() || null
  }

  return next
}

async function readKvList(): Promise<PlatformAnnouncement[]> {
  try {
    const data = await apiFetch<{ value: unknown }>(
      `/api/platform/kv/${encodeURIComponent(KV_KEY)}`,
    )
    return normalizeRows(data.value)
  } catch (error) {
    if (isNotFound(error)) return []
    throw new Error(errorMessage(error, 'Could not load announcements.'))
  }
}

async function writeKvList(list: PlatformAnnouncement[]): Promise<void> {
  await apiFetch(`/api/platform/kv/${encodeURIComponent(KV_KEY)}`, {
    method: 'PUT',
    body: { value: stripStatus(list) },
  })
}

function toActive(item: PlatformAnnouncement): ActiveAnnouncement {
  const full = withStatus(item)
  return {
    id: full.id,
    title: full.title,
    body: full.body,
    kind: full.kind,
    imageUrl: full.imageUrl,
    imageFileId: full.imageFileId,
    showInApp: full.showInApp,
    showOnLanding: full.showOnLanding,
    repeatMode: full.repeatMode,
    maxShowsPerDay: full.maxShowsPerDay,
    intervalMinutes: full.intervalMinutes,
    startsAt: full.startsAt,
    endsAt: full.endsAt,
    updatedAt: full.updatedAt,
    status: 'live',
  }
}

function mergeCreateFields(fields: Partial<AnnouncementInput>) {
  return {
    title: fields.title!,
    body: fields.body!,
    kind: fields.kind ?? 'general',
    published: fields.published ?? true,
    showInApp: fields.showInApp !== false,
    showOnLanding: Boolean(fields.showOnLanding),
    repeatMode: normalizeRepeatMode(fields.repeatMode),
    maxShowsPerDay: normalizeNonNegInt(fields.maxShowsPerDay, 0),
    intervalMinutes: normalizeNonNegInt(fields.intervalMinutes, 0),
    startsAt: fields.startsAt ?? null,
    endsAt: fields.endsAt ?? null,
    imageUrl: fields.imageUrl ?? null,
    imageFileId: fields.imageFileId ?? null,
  }
}

export async function listAnnouncementsAdmin(): Promise<PlatformAnnouncement[]> {
  if (!authApiConfigured()) return readBrowserLocal()

  try {
    const data = await apiFetch<{ announcements: PlatformAnnouncement[] }>(
      '/api/platform/admin/announcements',
    )
    return normalizeRows(data.announcements)
  } catch (error) {
    if (!isNotFound(error)) {
      throw new Error(errorMessage(error, 'Could not load announcements.'))
    }
    return readKvList()
  }
}

export type AnnouncementSurface = 'app' | 'landing'

export async function listActiveAnnouncements(
  surface: AnnouncementSurface = 'app',
): Promise<ActiveAnnouncement[]> {
  const matchesSurface = (item: ActiveAnnouncement | PlatformAnnouncement) =>
    surface === 'landing' ? item.showOnLanding : item.showInApp !== false

  if (!authApiConfigured()) {
    return readBrowserLocal()
      .filter((item) => item.status === 'live' && matchesSurface(item))
      .map(toActive)
  }

  if (surface === 'landing') {
    try {
      const data = await apiFetch<{ announcements: ActiveAnnouncement[] }>(
        '/api/platform/announcements/public',
        { skipAuth: true },
      )
      return (data.announcements ?? [])
        .map((item) => toActive({ ...item, published: true, createdAt: item.updatedAt }))
        .filter(matchesSurface)
    } catch (error) {
      if (!isNotFound(error)) return []
      // Fall through to KV only when signed in; guests get nothing without public route.
      try {
        const list = await readKvList()
        return list
          .filter((item) => item.status === 'live' && matchesSurface(item))
          .map(toActive)
      } catch {
        return []
      }
    }
  }

  try {
    const data = await apiFetch<{ announcements: ActiveAnnouncement[] }>(
      '/api/platform/announcements/active',
    )
    return (data.announcements ?? [])
      .map((item) =>
        toActive({
          ...item,
          published: true,
          createdAt: item.updatedAt,
        }),
      )
      .filter(matchesSurface)
  } catch (error) {
    if (!isNotFound(error)) {
      throw new Error(errorMessage(error, 'Could not load announcements.'))
    }
    const list = await readKvList()
    return list
      .filter((item) => item.status === 'live' && matchesSurface(item))
      .map(toActive)
  }
}

export async function createAnnouncement(
  input: AnnouncementInput,
): Promise<PlatformAnnouncement> {
  const fields = normalizeInput(input)
  const base = mergeCreateFields(fields)

  if (!authApiConfigured()) {
    const now = new Date().toISOString()
    const item = withStatus({
      id: newId(),
      ...base,
      createdAt: now,
      updatedAt: now,
      createdBy: null,
    })
    const list = readBrowserLocal()
    list.unshift(item)
    writeBrowserLocal(list)
    return item
  }

  try {
    const data = await apiFetch<{ announcement: PlatformAnnouncement }>(
      '/api/platform/admin/announcements',
      { method: 'POST', body: fields },
    )
    return withStatus(data.announcement)
  } catch (error) {
    if (!isNotFound(error)) {
      throw new Error(errorMessage(error, 'Could not create announcement.'))
    }
  }

  const now = new Date().toISOString()
  const item = withStatus({
    id: newId(),
    ...base,
    createdAt: now,
    updatedAt: now,
    createdBy: null,
  })
  const list = await readKvList()
  list.unshift(item)
  try {
    await writeKvList(list)
  } catch (error) {
    throw new Error(errorMessage(error, 'Could not create announcement.'))
  }
  return item
}

export async function updateAnnouncement(
  id: string,
  input: Partial<AnnouncementInput>,
): Promise<PlatformAnnouncement> {
  const applyLocal = (
    list: PlatformAnnouncement[],
  ): PlatformAnnouncement => {
    const index = list.findIndex((item) => item.id === id)
    if (index < 0) throw new Error('Announcement not found.')
    const current = list[index]
    const fields = normalizeInput(
      {
        title: input.title ?? current.title,
        body: input.body ?? current.body,
        kind: input.kind ?? current.kind,
        published: input.published ?? current.published,
        showInApp: input.showInApp ?? current.showInApp,
        showOnLanding: input.showOnLanding ?? current.showOnLanding,
        repeatMode: input.repeatMode ?? current.repeatMode,
        maxShowsPerDay: input.maxShowsPerDay ?? current.maxShowsPerDay,
        intervalMinutes: input.intervalMinutes ?? current.intervalMinutes,
        startsAt:
          input.startsAt !== undefined ? input.startsAt : current.startsAt,
        endsAt: input.endsAt !== undefined ? input.endsAt : current.endsAt,
        imageUrl:
          input.imageUrl !== undefined ? input.imageUrl : current.imageUrl,
        imageFileId:
          input.imageFileId !== undefined
            ? input.imageFileId
            : current.imageFileId,
      },
      { partial: false },
    )
    const next = withStatus({
      ...current,
      ...fields,
      updatedAt: new Date().toISOString(),
    })
    list[index] = next
    return next
  }

  if (!authApiConfigured()) {
    const list = readBrowserLocal()
    const next = applyLocal(list)
    writeBrowserLocal(list)
    return next
  }

  try {
    const data = await apiFetch<{ announcement: PlatformAnnouncement }>(
      `/api/platform/admin/announcements/${encodeURIComponent(id)}`,
      { method: 'PATCH', body: input },
    )
    return withStatus(data.announcement)
  } catch (error) {
    if (!isNotFound(error)) {
      throw new Error(errorMessage(error, 'Could not update announcement.'))
    }
  }

  const list = await readKvList()
  const next = applyLocal(list)
  try {
    await writeKvList(list)
  } catch (error) {
    throw new Error(errorMessage(error, 'Could not update announcement.'))
  }
  return next
}

export async function deleteAnnouncement(id: string): Promise<void> {
  if (!authApiConfigured()) {
    writeBrowserLocal(readBrowserLocal().filter((item) => item.id !== id))
    return
  }

  try {
    await apiFetch(
      `/api/platform/admin/announcements/${encodeURIComponent(id)}`,
      { method: 'DELETE' },
    )
    return
  } catch (error) {
    if (!isNotFound(error)) {
      throw new Error(errorMessage(error, 'Could not delete announcement.'))
    }
  }

  const list = await readKvList()
  const next = list.filter((item) => item.id !== id)
  if (next.length === list.length) {
    throw new Error('Announcement not found.')
  }
  try {
    await writeKvList(next)
  } catch (error) {
    throw new Error(errorMessage(error, 'Could not delete announcement.'))
  }
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(new Error('Could not read image.'))
    reader.readAsDataURL(file)
  })
}

export async function uploadAnnouncementImage(
  file: File,
): Promise<{ id: string; url: string }> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose an image file (PNG, JPG, or WebP).')
  }
  if (file.size > 1.5 * 1024 * 1024) {
    throw new Error('Image must be 1.5 MB or smaller.')
  }
  const dataUrl = await fileToDataUrl(file)
  return { id: `embed-${newId()}`, url: dataUrl }
}

export function announcementStatusLabel(status: AnnouncementStatus): string {
  if (status === 'live') return 'Live'
  if (status === 'scheduled') return 'Scheduled'
  if (status === 'ended') return 'Ended'
  return 'Off'
}

export function announcementStatusVariant(
  status: AnnouncementStatus,
): 'completed' | 'in-progress' | 'neutral' | 'pending' {
  if (status === 'live') return 'completed'
  if (status === 'scheduled') return 'in-progress'
  if (status === 'ended') return 'neutral'
  return 'pending'
}
