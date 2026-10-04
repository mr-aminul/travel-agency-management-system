import { useMemo } from 'react'
import { useSyncExternalStore } from 'react'
import { getActiveTenantId } from '@/lib/authApi'
import { useAuth } from '@/lib/useAuth'
import {
  isBuiltinService,
  slugifyServiceName,
  CASE_SERVICE_SLUGS,
} from '@/types/case'
import {
  deleteAllServiceTemplates,
  renameServiceTemplate,
  saveServiceTemplate,
} from '@/lib/serviceTemplatesStore'
import { DEFAULT_TENANT_ID } from '@/types/tenant'
import type { CustomService, CustomServiceDraft } from '@/types/customService'
import {
  DEFAULT_CUSTOM_DOCUMENTS,
  DEFAULT_CUSTOM_STEPS,
} from '@/types/serviceTemplate'

type Listener = () => void

const STORAGE_KEY = 'pd-custom-services'

const listeners = new Set<Listener>()
let services: CustomService[] = loadAll()

function emit() {
  listeners.forEach((listener) => listener())
}

export function subscribeCustomServices(listener: Listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot() {
  return services
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeService(value: unknown): CustomService | undefined {
  if (!isRecord(value)) return undefined
  const id = typeof value.id === 'string' ? value.id.trim() : ''
  const tenantId =
    typeof value.tenantId === 'string' ? value.tenantId.trim() : ''
  const name = typeof value.name === 'string' ? value.name.trim() : ''
  if (!id || !tenantId || !name) return undefined
  return {
    id,
    tenantId,
    name,
    description:
      typeof value.description === 'string' ? value.description.trim() : '',
    createdAt:
      typeof value.createdAt === 'string' && value.createdAt
        ? value.createdAt
        : new Date().toISOString(),
  }
}

function loadAll(): CustomService[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .map(normalizeService)
      .filter((item): item is CustomService => item != null)
  } catch {
    return []
  }
}

function persist(next: CustomService[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    /* ignore quota / private mode */
  }
}

function replaceAll(next: CustomService[]) {
  services = next
  persist(services)
  emit()
}

function tenantId() {
  return getActiveTenantId() || DEFAULT_TENANT_ID
}

function nextId(existing: string[]) {
  const nums = existing
    .map((id) => Number(id.replace(/\D/g, '').slice(-4)))
    .filter((n) => !Number.isNaN(n))
  const next = (nums.length ? Math.max(...nums) : 0) + 1
  return `svc-${String(next).padStart(4, '0')}`
}

export function listCustomServices(forTenantId = tenantId()): CustomService[] {
  return services.filter((item) => item.tenantId === forTenantId)
}

export function tenantHasCustomService(
  forTenantId: string,
  serviceName: string,
): boolean {
  const needle = serviceName.trim().toLowerCase()
  return services.some(
    (item) =>
      item.tenantId === forTenantId && item.name.toLowerCase() === needle,
  )
}

export function findCustomServiceBySlug(
  slug: string,
  forTenantId = tenantId(),
): CustomService | undefined {
  const needle = slug.trim().toLowerCase()
  if (!needle) return undefined
  return listCustomServices(forTenantId).find(
    (item) => slugifyServiceName(item.name) === needle,
  )
}

export function validateCustomServiceName(
  name: string,
  forTenantId = tenantId(),
  exceptId?: string,
): string | undefined {
  const trimmed = name.trim()
  if (trimmed.length < 2) return 'Give the service a name.'
  if (trimmed.length > 40) return 'Keep the name under 40 characters.'
  if (isBuiltinService(trimmed)) {
    return 'That name is already used by a built-in service template.'
  }

  const slug = slugifyServiceName(trimmed)
  if (!slug) return 'Use letters or numbers in the service name.'
  if (slug in CASE_SERVICE_SLUGS) {
    return 'That name is too close to a built-in service template.'
  }

  const duplicate = listCustomServices(forTenantId).find(
    (item) =>
      item.id !== exceptId &&
      (item.name.toLowerCase() === trimmed.toLowerCase() ||
        slugifyServiceName(item.name) === slug),
  )
  if (duplicate) return 'You already have a service with that name.'
  return undefined
}

export function createCustomService(draft: CustomServiceDraft): CustomService {
  const name = draft.name.trim()
  const error = validateCustomServiceName(name)
  if (error) throw new Error(error)

  const created: CustomService = {
    id: nextId(services.map((item) => item.id)),
    tenantId: tenantId(),
    name,
    description: draft.description?.trim() ?? '',
    createdAt: new Date().toISOString(),
  }
  replaceAll([created, ...services])
  saveServiceTemplate({
    serviceName: created.name,
    steps: DEFAULT_CUSTOM_STEPS,
    documents: DEFAULT_CUSTOM_DOCUMENTS,
  })
  return created
}

export function updateCustomService(
  id: string,
  patch: CustomServiceDraft,
): CustomService | undefined {
  const current = services.find(
    (item) => item.id === id && item.tenantId === tenantId(),
  )
  if (!current) return undefined

  const name = patch.name.trim()
  const error = validateCustomServiceName(name, tenantId(), id)
  if (error) throw new Error(error)

  let updated: CustomService | undefined
  replaceAll(
    services.map((item) => {
      if (item.id !== id || item.tenantId !== tenantId()) return item
      updated = {
        ...item,
        name,
        description: patch.description?.trim() ?? '',
      }
      return updated
    }),
  )
  if (updated && current.name !== updated.name) {
    renameServiceTemplate(current.name, updated.name)
  }
  return updated
}

export function deleteCustomService(id: string): boolean {
  const exists = services.some(
    (item) => item.id === id && item.tenantId === tenantId(),
  )
  if (!exists) return false
  const removed = services.find(
    (item) => item.id === id && item.tenantId === tenantId(),
  )
  replaceAll(
    services.filter((item) => !(item.id === id && item.tenantId === tenantId())),
  )
  if (removed) deleteAllServiceTemplates(removed.name)
  return true
}

export function resetCustomServices() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
  services = []
  emit()
}

export function useCustomServices(): CustomService[] {
  const { session } = useAuth()
  const all = useSyncExternalStore(subscribeCustomServices, getSnapshot, getSnapshot)
  const activeId = session?.tenantId ?? DEFAULT_TENANT_ID
  return useMemo(
    () => all.filter((item) => item.tenantId === activeId),
    [all, activeId],
  )
}
