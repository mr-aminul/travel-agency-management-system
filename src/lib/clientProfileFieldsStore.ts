import { useMemo } from 'react'
import { useSyncExternalStore } from 'react'
import { getActiveTenantId } from '@/lib/authApi'
import { useAuth } from '@/lib/useAuth'
import { DEFAULT_TENANT_ID } from '@/types/tenant'
import {
  CLIENT_PROFILE_FIELD_TYPES,
  type ClientProfileField,
  type ClientProfileFieldDraft,
  type ClientProfileFieldType,
} from '@/types/clientProfileField'

type Listener = () => void

const STORAGE_KEY = 'pd-client-profile-fields'

const listeners = new Set<Listener>()
let fields: ClientProfileField[] = loadAll()

function emit() {
  listeners.forEach((listener) => listener())
}

export function subscribeClientProfileFields(listener: Listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot() {
  return fields
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseType(value: unknown): ClientProfileFieldType | undefined {
  return CLIENT_PROFILE_FIELD_TYPES.find((entry) => entry === value)
}

function parseOptions(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
}

function normalizeField(value: unknown): ClientProfileField | undefined {
  if (!isRecord(value)) return undefined
  const id = typeof value.id === 'string' ? value.id.trim() : ''
  const tenantId =
    typeof value.tenantId === 'string' ? value.tenantId.trim() : ''
  const label = typeof value.label === 'string' ? value.label.trim() : ''
  const type = parseType(value.type)
  if (!id || !tenantId || !label || !type) return undefined
  return {
    id,
    tenantId,
    label,
    type,
    required: value.required === true,
    options: type === 'select' ? parseOptions(value.options) : [],
    createdAt:
      typeof value.createdAt === 'string' && value.createdAt
        ? value.createdAt
        : new Date().toISOString(),
  }
}

function loadAll(): ClientProfileField[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .map(normalizeField)
      .filter((item): item is ClientProfileField => item != null)
  } catch {
    return []
  }
}

function persist(next: ClientProfileField[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    /* ignore quota / private mode */
  }
}

function replaceAll(next: ClientProfileField[]) {
  fields = next
  persist(fields)
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
  return `cf-${String(next).padStart(4, '0')}`
}

export function listClientProfileFields(
  forTenantId = tenantId(),
): ClientProfileField[] {
  return fields.filter((item) => item.tenantId === forTenantId)
}

export function validateClientProfileField(
  draft: ClientProfileFieldDraft,
  forTenantId = tenantId(),
  exceptId?: string,
): string | undefined {
  const label = draft.label.trim()
  if (label.length < 2) return 'Give the field a name.'
  if (label.length > 40) return 'Keep the name under 40 characters.'
  if (!parseType(draft.type)) return 'Choose a field type.'
  if (draft.type === 'select') {
    const options = (draft.options ?? [])
      .map((item) => item.trim())
      .filter(Boolean)
    if (options.length < 2) return 'Add at least two choices.'
  }
  const duplicate = listClientProfileFields(forTenantId).find(
    (item) =>
      item.id !== exceptId && item.label.toLowerCase() === label.toLowerCase(),
  )
  if (duplicate) return 'You already have a field with that name.'
  return undefined
}

export function createClientProfileField(
  draft: ClientProfileFieldDraft,
): ClientProfileField {
  const error = validateClientProfileField(draft)
  if (error) throw new Error(error)

  const created: ClientProfileField = {
    id: nextId(fields.map((item) => item.id)),
    tenantId: tenantId(),
    label: draft.label.trim(),
    type: draft.type,
    required: draft.required === true,
    options:
      draft.type === 'select'
        ? (draft.options ?? []).map((item) => item.trim()).filter(Boolean)
        : [],
    createdAt: new Date().toISOString(),
  }
  replaceAll([...fields, created])
  return created
}

export function deleteClientProfileField(id: string): boolean {
  const exists = fields.some(
    (item) => item.id === id && item.tenantId === tenantId(),
  )
  if (!exists) return false
  replaceAll(
    fields.filter((item) => !(item.id === id && item.tenantId === tenantId())),
  )
  return true
}

export function resetClientProfileFields() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
  fields = []
  emit()
}

export function useClientProfileFields(): ClientProfileField[] {
  const { session } = useAuth()
  const all = useSyncExternalStore(
    subscribeClientProfileFields,
    getSnapshot,
    getSnapshot,
  )
  const activeId = session?.tenantId ?? DEFAULT_TENANT_ID
  return useMemo(
    () => all.filter((item) => item.tenantId === activeId),
    [all, activeId],
  )
}

export function useClientProfileFieldsForTenant(
  forTenantId?: string,
): ClientProfileField[] {
  const all = useSyncExternalStore(
    subscribeClientProfileFields,
    getSnapshot,
    getSnapshot,
  )
  return useMemo(() => {
    if (!forTenantId) return []
    return all.filter((item) => item.tenantId === forTenantId)
  }, [all, forTenantId])
}
