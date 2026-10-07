import { useMemo } from 'react'
import { useSyncExternalStore } from 'react'
import { getActiveTenantId } from '@/lib/authApi'
import {
  DATA_KEYS,
  loadJsonParsed,
  removeJson,
  saveJson,
} from '@/lib/data'
import { useAuth } from '@/lib/useAuth'
import { DEFAULT_TENANT_ID } from '@/types/tenant'
import {
  PAGE_ACCESS_LEVELS,
  type PageAccessLevel,
  type UserPageAccess,
} from '@/types/userAccess'

type Listener = () => void

const STORAGE_KEY = DATA_KEYS.userPageAccess
const DEFAULT_LEVEL: PageAccessLevel = 'edit'

const listeners = new Set<Listener>()
let entries: UserPageAccess[] = loadAll()

function emit() {
  listeners.forEach((listener) => listener())
}

export function subscribeUserPageAccess(listener: Listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot() {
  return entries
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseLevel(value: unknown): PageAccessLevel | undefined {
  return PAGE_ACCESS_LEVELS.find((entry) => entry === value)
}

function normalizeEntry(value: unknown): UserPageAccess | undefined {
  if (!isRecord(value)) return undefined
  const tenantId =
    typeof value.tenantId === 'string' ? value.tenantId.trim() : ''
  const memberId =
    (typeof value.memberId === 'string' ? value.memberId.trim() : '') ||
    (typeof value.employeeId === 'string' ? value.employeeId.trim() : '')
  const pagePath =
    typeof value.pagePath === 'string' ? value.pagePath.trim() : ''
  const level = parseLevel(value.level)
  if (!tenantId || !memberId || !pagePath || !level) return undefined
  return { tenantId, memberId, pagePath, level }
}

function loadAll(): UserPageAccess[] {
  // Prefer synced data layer; migrate legacy localStorage once.
  const fromData = loadJsonParsed(STORAGE_KEY, [] as UserPageAccess[], (value) => {
    if (!Array.isArray(value)) return []
    return value
      .map(normalizeEntry)
      .filter((item): item is UserPageAccess => item != null)
  })
  if (fromData.length > 0) return fromData
  try {
    const raw = localStorage.getItem('pd-user-page-access')
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    const migrated = parsed
      .map(normalizeEntry)
      .filter((item): item is UserPageAccess => item != null)
    if (migrated.length > 0) {
      saveJson(STORAGE_KEY, migrated)
      localStorage.removeItem('pd-user-page-access')
    }
    return migrated
  } catch {
    return []
  }
}

function persist(next: UserPageAccess[]) {
  saveJson(STORAGE_KEY, next)
}

function replaceAll(next: UserPageAccess[]) {
  entries = next
  persist(entries)
  emit()
}

function tenantId() {
  return getActiveTenantId() || DEFAULT_TENANT_ID
}

export function getPageAccessLevel(
  memberId: string,
  pagePath: string,
  all: UserPageAccess[] = entries,
  activeTenantId: string = tenantId(),
): PageAccessLevel {
  const match = all.find(
    (entry) =>
      entry.tenantId === activeTenantId &&
      entry.memberId === memberId &&
      entry.pagePath === pagePath,
  )
  return match?.level ?? DEFAULT_LEVEL
}

export function setPageAccessLevel(
  memberId: string,
  pagePath: string,
  level: PageAccessLevel,
): void {
  const activeTenantId = tenantId()
  const without = entries.filter(
    (entry) =>
      !(
        entry.tenantId === activeTenantId &&
        entry.memberId === memberId &&
        entry.pagePath === pagePath
      ),
  )

  if (level === DEFAULT_LEVEL) {
    replaceAll(without)
    return
  }

  replaceAll([
    ...without,
    {
      tenantId: activeTenantId,
      memberId,
      pagePath,
      level,
    },
  ])
}

export function useUserPageAccess(): UserPageAccess[] {
  const { session } = useAuth()
  const all = useSyncExternalStore(
    subscribeUserPageAccess,
    getSnapshot,
    getSnapshot,
  )
  const activeId = session?.tenantId ?? DEFAULT_TENANT_ID
  return useMemo(
    () => all.filter((entry) => entry.tenantId === activeId),
    [all, activeId],
  )
}

export function resetUserPageAccess() {
  removeJson(STORAGE_KEY)
  try {
    localStorage.removeItem('pd-user-page-access')
  } catch {
    /* ignore */
  }
  entries = []
  emit()
}
