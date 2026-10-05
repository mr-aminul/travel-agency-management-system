import { useMemo } from 'react'
import { useSyncExternalStore } from 'react'
import { getActiveTenantId } from '@/lib/authApi'
import { useAuth } from '@/lib/useAuth'
import { DEFAULT_TENANT_ID } from '@/types/tenant'
import {
  PAGE_ACCESS_LEVELS,
  type PageAccessLevel,
  type UserPageAccess,
} from '@/types/userAccess'

type Listener = () => void

const STORAGE_KEY = 'pd-user-page-access'
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
  const employeeId =
    typeof value.employeeId === 'string' ? value.employeeId.trim() : ''
  const pagePath =
    typeof value.pagePath === 'string' ? value.pagePath.trim() : ''
  const level = parseLevel(value.level)
  if (!tenantId || !employeeId || !pagePath || !level) return undefined
  return { tenantId, employeeId, pagePath, level }
}

function loadAll(): UserPageAccess[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .map(normalizeEntry)
      .filter((item): item is UserPageAccess => item != null)
  } catch {
    return []
  }
}

function persist(next: UserPageAccess[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    /* ignore quota / private mode */
  }
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
  employeeId: string,
  pagePath: string,
  all: UserPageAccess[] = entries,
  activeTenantId: string = tenantId(),
): PageAccessLevel {
  const match = all.find(
    (entry) =>
      entry.tenantId === activeTenantId &&
      entry.employeeId === employeeId &&
      entry.pagePath === pagePath,
  )
  return match?.level ?? DEFAULT_LEVEL
}

export function setPageAccessLevel(
  employeeId: string,
  pagePath: string,
  level: PageAccessLevel,
): void {
  const activeTenantId = tenantId()
  const without = entries.filter(
    (entry) =>
      !(
        entry.tenantId === activeTenantId &&
        entry.employeeId === employeeId &&
        entry.pagePath === pagePath
      ),
  )

  // Default is edit — drop the row when restoring default to keep storage lean.
  if (level === DEFAULT_LEVEL) {
    replaceAll(without)
    return
  }

  replaceAll([
    ...without,
    {
      tenantId: activeTenantId,
      employeeId,
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
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
  entries = []
  emit()
}
