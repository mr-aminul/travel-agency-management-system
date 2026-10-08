import { useMemo } from 'react'
import { useSyncExternalStore } from 'react'
import { getActiveTenantId } from '@/lib/authApi'
import { DATA_KEYS, loadJsonParsed, removeJson, saveJson } from '@/lib/data'
import { useAuth } from '@/lib/useAuth'
import { DEFAULT_TENANT_ID } from '@/types/tenant'

type HiddenService = {
  tenantId: string
  serviceName: string
}

type Listener = () => void

const STORAGE_KEY = DATA_KEYS.hiddenServices

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
  return loadJsonParsed(STORAGE_KEY, [] as HiddenService[], (value) => {
    if (!Array.isArray(value)) return []
    return value
      .map(normalizeHidden)
      .filter((item): item is HiddenService => item != null)
  })
}

function persist(next: HiddenService[]) {
  saveJson(STORAGE_KEY, next)
}

function replaceAll(next: HiddenService[]) {
  hidden = next
  persist(hidden)
  emit()
}

function tenantId() {
  return getActiveTenantId() || DEFAULT_TENANT_ID
}

function reloadFromStorage() {
  hidden = loadAll()
  emit()
}

if (typeof window !== 'undefined') {
  window.addEventListener('pd-data-rehydrated', reloadFromStorage)
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
  removeJson(STORAGE_KEY)
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
