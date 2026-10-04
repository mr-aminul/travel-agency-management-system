import { useMemo } from 'react'
import { useSyncExternalStore } from 'react'
import { getActiveTenantId } from '@/lib/authApi'
import { useAuth } from '@/lib/useAuth'
import { DEFAULT_TENANT_ID } from '@/types/tenant'

type HiddenService = {
  tenantId: string
  serviceName: string
}

type Listener = () => void

const STORAGE_KEY = 'pd-hidden-services'

const listeners = new Set<Listener>()
let hidden: HiddenService[] = loadAll()

function emit() {
  listeners.forEach((listener) => listener())
}

export function subscribeHiddenServices(listener: Listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot() {
  return hidden
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeHidden(value: unknown): HiddenService | undefined {
  if (!isRecord(value)) return undefined
  const tenantId =
    typeof value.tenantId === 'string' ? value.tenantId.trim() : ''
  const serviceName =
    typeof value.serviceName === 'string' ? value.serviceName.trim() : ''
  if (!tenantId || !serviceName) return undefined
  return { tenantId, serviceName }
}

function loadAll(): HiddenService[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .map(normalizeHidden)
      .filter((item): item is HiddenService => item != null)
  } catch {
    return []
  }
}

function persist(next: HiddenService[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    /* ignore quota / private mode */
  }
}

function replaceAll(next: HiddenService[]) {
  hidden = next
  persist(hidden)
  emit()
}

function tenantId() {
  return getActiveTenantId() || DEFAULT_TENANT_ID
}

export function listHiddenServices(forTenantId = tenantId()): string[] {
  return hidden
    .filter((item) => item.tenantId === forTenantId)
    .map((item) => item.serviceName)
}

export function isCatalogServiceHidden(
  serviceName: string,
  forTenantId = tenantId(),
): boolean {
  const needle = serviceName.trim().toLowerCase()
  return hidden.some(
    (item) =>
      item.tenantId === forTenantId &&
      item.serviceName.toLowerCase() === needle,
  )
}

export function hideCatalogService(serviceName: string): boolean {
  const name = serviceName.trim()
  if (!name) return false
  const active = tenantId()
  if (isCatalogServiceHidden(name, active)) return false
  replaceAll([...hidden, { tenantId: active, serviceName: name }])
  return true
}

export function restoreCatalogService(serviceName: string): boolean {
  const needle = serviceName.trim().toLowerCase()
  const active = tenantId()
  const exists = hidden.some(
    (item) =>
      item.tenantId === active && item.serviceName.toLowerCase() === needle,
  )
  if (!exists) return false
  replaceAll(
    hidden.filter(
      (item) =>
        !(
          item.tenantId === active &&
          item.serviceName.toLowerCase() === needle
        ),
    ),
  )
  return true
}

export function resetHiddenServices() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
  hidden = []
  emit()
}

export function useHiddenServices(): string[] {
  const { session } = useAuth()
  const all = useSyncExternalStore(
    subscribeHiddenServices,
    getSnapshot,
    getSnapshot,
  )
  const activeId = session?.tenantId ?? DEFAULT_TENANT_ID
  return useMemo(
    () =>
      all
        .filter((item) => item.tenantId === activeId)
        .map((item) => item.serviceName),
    [all, activeId],
  )
}
