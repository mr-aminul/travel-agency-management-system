import { useSyncExternalStore } from 'react'
import { DATA_KEYS } from '@/lib/data/keys'
import { loadJsonParsed, saveJson } from '@/lib/data/jsonStore'

export const USER_AVATAR_EVENT = 'pd-user-avatars-change'

type TenantAvatarMap = Record<string, string>
type AvatarStore = Record<string, TenantAvatarMap>

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function normalizeUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  if (trimmed.startsWith('data:image/')) return trimmed
  try {
    const url = new URL(trimmed)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    return trimmed
  } catch {
    return null
  }
}

function readAll(): AvatarStore {
  return loadJsonParsed(DATA_KEYS.userAvatars, {} as AvatarStore, (value) => {
    if (!isRecord(value)) return {}
    const next: AvatarStore = {}
    for (const [tenantId, users] of Object.entries(value)) {
      if (!isRecord(users)) continue
      const map: TenantAvatarMap = {}
      for (const [userId, url] of Object.entries(users)) {
        const normalized = normalizeUrl(url)
        if (normalized) map[userId] = normalized
      }
      next[tenantId] = map
    }
    return next
  })
}

function writeAll(map: AvatarStore) {
  saveJson(DATA_KEYS.userAvatars, map)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(USER_AVATAR_EVENT))
  }
}

export function readUserAvatar(
  tenantId: string,
  userId: string,
): string | null {
  if (!tenantId || !userId) return null
  return readAll()[tenantId]?.[userId] ?? null
}

export function saveUserAvatar(
  tenantId: string,
  userId: string,
  avatarUrl: string | null,
): string | null {
  if (!tenantId || !userId) {
    throw new Error('Missing user for avatar save.')
  }
  const all = readAll()
  const tenantMap = { ...(all[tenantId] ?? {}) }
  const normalized = normalizeUrl(avatarUrl)
  if (normalized) {
    tenantMap[userId] = normalized
  } else {
    delete tenantMap[userId]
  }
  const next: AvatarStore = { ...all }
  if (Object.keys(tenantMap).length === 0) {
    delete next[tenantId]
  } else {
    next[tenantId] = tenantMap
  }
  writeAll(next)
  return normalized
}

function subscribe(onStoreChange: () => void) {
  if (typeof window === 'undefined') return () => {}
  const onChange = () => onStoreChange()
  window.addEventListener(USER_AVATAR_EVENT, onChange)
  window.addEventListener('pd-data-rehydrated', onChange)
  window.addEventListener('storage', onChange)
  return () => {
    window.removeEventListener(USER_AVATAR_EVENT, onChange)
    window.removeEventListener('pd-data-rehydrated', onChange)
    window.removeEventListener('storage', onChange)
  }
}

export function useUserAvatar(
  tenantId: string,
  userId: string | undefined,
): string | null {
  return useSyncExternalStore(
    subscribe,
    () => (userId ? readUserAvatar(tenantId, userId) : null),
    () => null,
  )
}
