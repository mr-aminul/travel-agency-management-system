import crypto from 'node:crypto'
import { query } from './db.js'

const KV_KEY = 'pd-platform-announcements'

const ANNOUNCEMENT_KINDS = new Set([
  'policy',
  'security',
  'promotional',
  'maintenance',
  'feature',
  'billing',
  'holiday',
  'urgent',
  'general',
])

function normalizeKind(value) {
  const kind = String(value ?? '')
    .trim()
    .toLowerCase()
  return ANNOUNCEMENT_KINDS.has(kind) ? kind : 'general'
}

function normalizeRepeatMode(value) {
  return value === 'once' ? 'once' : 'continuous'
}

function normalizeNonNegInt(value, fallback = 0) {
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0) return fallback
  return Math.min(10000, Math.floor(n))
}

function coerceItem(item) {
  return {
    ...item,
    kind: normalizeKind(item.kind),
    published: item.published !== false,
    showInApp: item.showInApp !== false,
    showOnLanding: Boolean(item.showOnLanding),
    repeatMode: normalizeRepeatMode(item.repeatMode),
    maxShowsPerDay: normalizeNonNegInt(item.maxShowsPerDay, 0),
    intervalMinutes: normalizeNonNegInt(item.intervalMinutes, 0),
  }
}

async function readAll() {
  const result = await query(
    `select value from platform.kv_store where key = $1`,
    [KV_KEY],
  )
  const raw = result.rows[0]?.value
  if (!Array.isArray(raw)) return []
  return raw
    .filter((item) => item && typeof item === 'object' && item.id)
    .map(coerceItem)
}

async function writeAll(list) {
  await query(
    `insert into platform.kv_store (key, value, updated_at)
     values ($1, $2::jsonb, now())
     on conflict (key) do update set
       value = excluded.value,
       updated_at = now()`,
    [KV_KEY, JSON.stringify(list)],
  )
}

function trimText(value, max) {
  const text = String(value ?? '').trim()
  if (!text) return ''
  return text.slice(0, max)
}

function parseIsoOrNull(value) {
  if (value == null || value === '') return null
  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid date. Use a valid date and time.')
  }
  return date.toISOString()
}

function normalizeInput(body, { partial = false } = {}) {
  const next = {}

  if (!partial || body.title !== undefined) {
    const title = trimText(body.title, 160)
    if (!title) throw new Error('Title is required.')
    next.title = title
  }

  if (!partial || body.body !== undefined) {
    const text = trimText(body.body, 4000)
    if (!text) throw new Error('Message is required.')
    next.body = text
  }

  if (!partial || body.published !== undefined) {
    next.published = Boolean(body.published)
  }

  if (!partial || body.kind !== undefined) {
    next.kind = normalizeKind(body.kind)
  }

  if (!partial || body.showInApp !== undefined) {
    next.showInApp = Boolean(body.showInApp)
  }

  if (!partial || body.showOnLanding !== undefined) {
    next.showOnLanding = Boolean(body.showOnLanding)
  }

  if (!partial || body.repeatMode !== undefined) {
    next.repeatMode = normalizeRepeatMode(body.repeatMode)
  }

  if (!partial || body.maxShowsPerDay !== undefined) {
    next.maxShowsPerDay = normalizeNonNegInt(body.maxShowsPerDay, 0)
  }

  if (!partial || body.intervalMinutes !== undefined) {
    next.intervalMinutes = normalizeNonNegInt(body.intervalMinutes, 0)
  }

  if (!partial || body.startsAt !== undefined) {
    next.startsAt = parseIsoOrNull(body.startsAt)
  }

  if (!partial || body.endsAt !== undefined) {
    next.endsAt = parseIsoOrNull(body.endsAt)
  }

  if (next.startsAt && next.endsAt) {
    if (new Date(next.endsAt).getTime() <= new Date(next.startsAt).getTime()) {
      throw new Error('End time must be after the start time.')
    }
  }

  if (!partial || body.imageUrl !== undefined) {
    const url = body.imageUrl == null ? null : String(body.imageUrl).trim()
    next.imageUrl = url || null
  }

  if (!partial || body.imageFileId !== undefined) {
    const id =
      body.imageFileId == null ? null : String(body.imageFileId).trim()
    next.imageFileId = id || null
  }

  return next
}

export function announcementLifecycle(item, now = Date.now()) {
  if (!item?.published) return 'draft'
  const starts = item.startsAt ? new Date(item.startsAt).getTime() : null
  const ends = item.endsAt ? new Date(item.endsAt).getTime() : null
  if (starts != null && starts > now) return 'scheduled'
  if (ends != null && ends <= now) return 'ended'
  return 'live'
}

export function isAnnouncementActive(item, now = Date.now()) {
  return announcementLifecycle(item, now) === 'live'
}

function toPublicActive(item) {
  return {
    id: item.id,
    title: item.title,
    body: item.body,
    kind: normalizeKind(item.kind),
    imageUrl: item.imageUrl ?? null,
    imageFileId: item.imageFileId ?? null,
    showInApp: item.showInApp !== false,
    showOnLanding: Boolean(item.showOnLanding),
    repeatMode: normalizeRepeatMode(item.repeatMode),
    maxShowsPerDay: normalizeNonNegInt(item.maxShowsPerDay, 0),
    intervalMinutes: normalizeNonNegInt(item.intervalMinutes, 0),
    startsAt: item.startsAt ?? null,
    endsAt: item.endsAt ?? null,
    updatedAt: item.updatedAt,
    status: 'live',
  }
}

export async function listAnnouncements() {
  const list = await readAll()
  return list
    .map((item) => ({
      ...item,
      status: announcementLifecycle(item),
    }))
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
}

export async function listActiveAnnouncements({ surface = 'app' } = {}) {
  const now = Date.now()
  const list = await readAll()
  return list
    .filter((item) => isAnnouncementActive(item, now))
    .filter((item) =>
      surface === 'landing' ? item.showOnLanding : item.showInApp !== false,
    )
    .map(toPublicActive)
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
}

export async function createAnnouncement({ body, actorUserId }) {
  try {
    const fields = normalizeInput(body ?? {}, { partial: false })
    const now = new Date().toISOString()
    const item = coerceItem({
      id: `ann-${crypto.randomBytes(8).toString('hex')}`,
      title: fields.title,
      body: fields.body,
      kind: fields.kind ?? 'general',
      imageUrl: fields.imageUrl ?? null,
      imageFileId: fields.imageFileId ?? null,
      published: fields.published ?? true,
      showInApp: fields.showInApp !== false,
      showOnLanding: Boolean(fields.showOnLanding),
      repeatMode: fields.repeatMode ?? 'continuous',
      maxShowsPerDay: fields.maxShowsPerDay ?? 0,
      intervalMinutes: fields.intervalMinutes ?? 0,
      startsAt: fields.startsAt ?? null,
      endsAt: fields.endsAt ?? null,
      createdAt: now,
      updatedAt: now,
      createdBy: actorUserId || null,
    })
    const list = await readAll()
    list.unshift(item)
    await writeAll(list)
    return {
      ok: true,
      status: 201,
      body: { announcement: { ...item, status: announcementLifecycle(item) } },
    }
  } catch (error) {
    return {
      ok: false,
      status: 400,
      error: error instanceof Error ? error.message : 'Invalid announcement.',
    }
  }
}

export async function updateAnnouncement({ id, body }) {
  const announcementId = String(id || '').trim()
  if (!announcementId) {
    return { ok: false, status: 400, error: 'Announcement id is required.' }
  }
  try {
    const list = await readAll()
    const index = list.findIndex((item) => item.id === announcementId)
    if (index < 0) {
      return { ok: false, status: 404, error: 'Announcement not found.' }
    }
    const fields = normalizeInput(body ?? {}, { partial: true })
    const current = list[index]
    const next = coerceItem({
      ...current,
      ...fields,
      id: current.id,
      createdAt: current.createdAt,
      createdBy: current.createdBy ?? null,
      updatedAt: new Date().toISOString(),
    })
    if (
      next.startsAt &&
      next.endsAt &&
      new Date(next.endsAt).getTime() <= new Date(next.startsAt).getTime()
    ) {
      return {
        ok: false,
        status: 400,
        error: 'End time must be after the start time.',
      }
    }
    list[index] = next
    await writeAll(list)
    return {
      ok: true,
      status: 200,
      body: { announcement: { ...next, status: announcementLifecycle(next) } },
    }
  } catch (error) {
    return {
      ok: false,
      status: 400,
      error: error instanceof Error ? error.message : 'Invalid announcement.',
    }
  }
}

export async function deleteAnnouncement(id) {
  const announcementId = String(id || '').trim()
  if (!announcementId) {
    return { ok: false, status: 400, error: 'Announcement id is required.' }
  }
  const list = await readAll()
  const next = list.filter((item) => item.id !== announcementId)
  if (next.length === list.length) {
    return { ok: false, status: 404, error: 'Announcement not found.' }
  }
  await writeAll(next)
  return { ok: true, status: 200, body: { ok: true } }
}
