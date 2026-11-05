import type {
  ActiveAnnouncement,
  AnnouncementRepeatMode,
} from '@/types/announcement'

const TRACK_KEY = 'pd-announcement-display'

type TrackEntry = {
  /** Sticky dismiss for `once` mode — matches announcement.updatedAt. */
  dismissedUpdatedAt?: string
  /** Last announcement.updatedAt we tracked against (resets caps on edit). */
  trackedUpdatedAt?: string
  lastShownAt?: string
  dayKey?: string
  shownToday?: number
}

type TrackMap = Record<string, TrackEntry>

function dayKey(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function readTrack(): TrackMap {
  try {
    const raw = localStorage.getItem(TRACK_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {}
    }
    return parsed as TrackMap
  } catch {
    return {}
  }
}

function writeTrack(map: TrackMap) {
  try {
    localStorage.setItem(TRACK_KEY, JSON.stringify(map))
  } catch {
    /* private mode */
  }
}

function normalizeRepeatMode(value: unknown): AnnouncementRepeatMode {
  return value === 'once' ? 'once' : 'continuous'
}

function entryFor(
  map: TrackMap,
  item: ActiveAnnouncement,
  now = new Date(),
): TrackEntry {
  const current = map[item.id] ?? {}
  const today = dayKey(now)
  const updatedChanged = current.trackedUpdatedAt !== item.updatedAt
  if (updatedChanged || current.dayKey !== today) {
    return {
      dismissedUpdatedAt:
        current.dismissedUpdatedAt === item.updatedAt
          ? current.dismissedUpdatedAt
          : undefined,
      trackedUpdatedAt: item.updatedAt,
      dayKey: today,
      shownToday: 0,
      lastShownAt: updatedChanged ? undefined : current.lastShownAt,
    }
  }
  return { ...current, trackedUpdatedAt: item.updatedAt }
}

/** Whether this browser should show the announcement right now. */
export function shouldShowAnnouncement(
  item: ActiveAnnouncement,
  now = Date.now(),
): boolean {
  const map = readTrack()
  const entry = entryFor(map, item, new Date(now))
  const mode = normalizeRepeatMode(item.repeatMode)

  if (mode === 'once') {
    return entry.dismissedUpdatedAt !== item.updatedAt
  }

  const maxPerDay = Math.max(0, Number(item.maxShowsPerDay) || 0)
  const shownToday = entry.shownToday ?? 0
  if (maxPerDay > 0 && shownToday >= maxPerDay) return false

  const intervalMinutes = Math.max(0, Number(item.intervalMinutes) || 0)
  if (intervalMinutes > 0 && entry.lastShownAt) {
    const last = new Date(entry.lastShownAt).getTime()
    if (Number.isFinite(last) && now - last < intervalMinutes * 60_000) {
      return false
    }
  }

  return true
}

/** Call when the popup is actually opened for the user. */
export function markAnnouncementShown(
  item: ActiveAnnouncement,
  now = Date.now(),
) {
  const map = readTrack()
  const at = new Date(now)
  const entry = entryFor(map, item, at)
  map[item.id] = {
    ...entry,
    trackedUpdatedAt: item.updatedAt,
    lastShownAt: at.toISOString(),
    dayKey: dayKey(at),
    shownToday: (entry.shownToday ?? 0) + 1,
  }
  writeTrack(map)
}

/**
 * Got it — for `once`, sticky dismiss; for `continuous`, just close
 * (interval / daily cap still apply via markAnnouncementShown).
 */
export function markAnnouncementDismissed(item: ActiveAnnouncement) {
  const map = readTrack()
  const entry = entryFor(map, item)
  if (normalizeRepeatMode(item.repeatMode) === 'once') {
    map[item.id] = {
      ...entry,
      trackedUpdatedAt: item.updatedAt,
      dismissedUpdatedAt: item.updatedAt,
    }
  } else {
    map[item.id] = { ...entry, trackedUpdatedAt: item.updatedAt }
  }
  writeTrack(map)
}

export function filterAnnouncementsForDisplay(
  items: ActiveAnnouncement[],
): ActiveAnnouncement[] {
  return items.filter((item) => shouldShowAnnouncement(item))
}
