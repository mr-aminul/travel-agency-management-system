import { useMemo } from 'react'
import { useSyncExternalStore } from 'react'
import { getActiveTenantId } from '@/lib/authApi'
import { useAuth } from '@/lib/useAuth'
import { DEFAULT_TENANT_ID } from '@/types/tenant'

type ServiceIconOverride = {
  tenantId: string
  serviceName: string
  iconId: string
}

type Listener = () => void

const STORAGE_KEY = 'pd-service-icon-overrides'

const listeners = new Set<Listener>()
let overrides: ServiceIconOverride[] = loadAll()

function emit() {
  listeners.forEach((listener) => listener())
}

export function subscribeServiceIconOverrides(listener: Listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot() {
  return overrides
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeOverride(value: unknown): ServiceIconOverride | undefined {
  if (!isRecord(value)) return undefined
  const tenantId =
    typeof value.tenantId === 'string' ? value.tenantId.trim() : ''
  const serviceName =
    typeof value.serviceName === 'string' ? value.serviceName.trim() : ''
  const iconId = typeof value.iconId === 'string' ? value.iconId.trim() : ''
  if (!tenantId || !serviceName || !iconId) return undefined
  return { tenantId, serviceName, iconId }
}

function loadAll(): ServiceIconOverride[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .map(normalizeOverride)
      .filter((item): item is ServiceIconOverride => item != null)
  } catch {
    return []
  }
}

function persist(next: ServiceIconOverride[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    /* ignore quota / private mode */
  }
}

function replaceAll(next: ServiceIconOverride[]) {
  overrides = next
  persist(overrides)
  emit()
}

function tenantId() {
  return getActiveTenantId() || DEFAULT_TENANT_ID
}

function matchesService(
  item: ServiceIconOverride,
  serviceName: string,
  forTenantId: string,
) {
  return (
    item.tenantId === forTenantId &&
    item.serviceName.toLowerCase() === serviceName.trim().toLowerCase()
  )
}

export function getServiceIconOverride(
  serviceName: string,
  forTenantId = tenantId(),
): string | undefined {
  const needle = serviceName.trim()
  if (!needle) return undefined
  return overrides.find((item) => matchesService(item, needle, forTenantId))
    ?.iconId
}

export function setServiceIconOverride(
  serviceName: string,
  iconId: string | null,
  forTenantId = tenantId(),
): void {
  const name = serviceName.trim()
  if (!name) return

  const without = overrides.filter(
    (item) => !matchesService(item, name, forTenantId),
  )
  if (!iconId?.trim()) {
    replaceAll(without)
    return
  }
  replaceAll([
    { tenantId: forTenantId, serviceName: name, iconId: iconId.trim() },
    ...without,
  ])
}

export function renameServiceIconOverride(
  fromName: string,
  toName: string,
  forTenantId = tenantId(),
): void {
  const from = fromName.trim()
  const to = toName.trim()
  if (!from || !to || from.toLowerCase() === to.toLowerCase()) return

  const current = getServiceIconOverride(from, forTenantId)
  const without = overrides.filter(
    (item) =>
      !matchesService(item, from, forTenantId) &&
      !matchesService(item, to, forTenantId),
  )
  if (!current) {
    replaceAll(without)
    return
  }
  replaceAll([
    { tenantId: forTenantId, serviceName: to, iconId: current },
    ...without,
  ])
}

export function clearServiceIconOverride(
  serviceName: string,
  forTenantId = tenantId(),
): void {
  setServiceIconOverride(serviceName, null, forTenantId)
}

export function resetServiceIconOverrides() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
  overrides = []
  emit()
}

export function useServiceIconOverrides(): ServiceIconOverride[] {
  const { session } = useAuth()
  const all = useSyncExternalStore(
    subscribeServiceIconOverrides,
    getSnapshot,
    getSnapshot,
  )
  const activeId = session?.tenantId ?? DEFAULT_TENANT_ID
  return useMemo(
    () => all.filter((item) => item.tenantId === activeId),
    [all, activeId],
  )
}
