import { useMemo } from 'react'
import { useSyncExternalStore } from 'react'
import { getActiveTenantId } from '@/lib/authApi'
import { DATA_KEYS, loadJsonParsed, removeJson, saveJson } from '@/lib/data'
import { useAuth } from '@/lib/useAuth'
import { DEFAULT_TENANT_ID } from '@/types/tenant'
import {
  DOCUMENT_FORM_FIELD_TYPES,
  type DocumentFormFieldDraft,
  type DocumentFormFieldType,
  type DocumentFormOverride,
} from '@/types/documentFormField'

type Listener = () => void

const STORAGE_KEY = DATA_KEYS.documentFormFields

const listeners = new Set<Listener>()
let overrides: DocumentFormOverride[] = loadAll()
let revision = 0

function emit() {
  revision += 1
  listeners.forEach((listener) => listener())
}

export function subscribeDocumentFormFields(listener: Listener) {
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

function parseType(value: unknown): DocumentFormFieldType | undefined {
  return DOCUMENT_FORM_FIELD_TYPES.find((entry) => entry === value)
}

function parseOptions(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
}

function normalizeField(value: unknown): DocumentFormFieldDraft | undefined {
  if (!isRecord(value)) return undefined
  const key = typeof value.key === 'string' ? value.key.trim() : ''
  const label = typeof value.label === 'string' ? value.label.trim() : ''
  const type = parseType(value.type)
  if (!key || !label || !type) return undefined
  const placeholder =
    typeof value.placeholder === 'string' ? value.placeholder.trim() : ''
  const options = type === 'select' ? parseOptions(value.options) : []
  return {
    key,
    label,
    type,
    required: value.required === true,
    ...(placeholder ? { placeholder } : {}),
    ...(type === 'select' ? { options } : {}),
  }
}

function normalizeOverride(value: unknown): DocumentFormOverride | undefined {
  if (!isRecord(value)) return undefined
  const documentId =
    typeof value.documentId === 'string' ? value.documentId.trim() : ''
  const tenantId =
    typeof value.tenantId === 'string' ? value.tenantId.trim() : ''
  if (!documentId || !tenantId || !Array.isArray(value.fields)) return undefined
  const fields = value.fields
    .map(normalizeField)
    .filter((item): item is DocumentFormFieldDraft => item != null)
  if (fields.length === 0) return undefined
  return {
    documentId,
    tenantId,
    fields,
    updatedAt:
      typeof value.updatedAt === 'string' && value.updatedAt
        ? value.updatedAt
        : new Date().toISOString(),
  }
}

function loadAll(): DocumentFormOverride[] {
  return loadJsonParsed(STORAGE_KEY, [] as DocumentFormOverride[], (value) => {
    if (!Array.isArray(value)) return []
    return value
      .map(normalizeOverride)
      .filter((item): item is DocumentFormOverride => item != null)
  })
}

function persist(next: DocumentFormOverride[]) {
  saveJson(STORAGE_KEY, next)
}

function replaceAll(next: DocumentFormOverride[]) {
  overrides = next
  persist(overrides)
  emit()
}

function tenantId() {
  return getActiveTenantId() || DEFAULT_TENANT_ID
}

function reloadFromStorage() {
  overrides = loadAll()
  emit()
}

if (typeof window !== 'undefined') {
  window.addEventListener('pd-data-rehydrated', reloadFromStorage)
}

const KEY_PATTERN = /^[a-z][a-zA-Z0-9]*$/

/** Keys that identity sync and profile reuse depend on. */
export function requiredKeysForDocument(documentId: string): string[] {
  if (documentId === 'passport') return ['number', 'expiry']
  if (documentId === 'nid') return ['number']
  return []
}

export function listDocumentFormOverrides(
  forTenantId = tenantId(),
): DocumentFormOverride[] {
  return overrides.filter((item) => item.tenantId === forTenantId)
}

export function getDocumentFormOverride(
  documentId: string,
  forTenantId = tenantId(),
): DocumentFormOverride | undefined {
  return overrides.find(
    (item) => item.tenantId === forTenantId && item.documentId === documentId,
  )
}

export function validateDocumentFormFields(
  documentId: string,
  fields: DocumentFormFieldDraft[],
): string | undefined {
  const documentKey = documentId.trim()
  if (!documentKey) return 'Choose a document type from the list.'
  if (fields.length === 0) return 'Add at least one field.'

  const keys = new Set<string>()
  for (const field of fields) {
    const key = field.key.trim()
    const label = field.label.trim()
    if (!label) return 'Give every field a name.'
    if (label.length > 40) return 'Keep field names under 40 characters.'
    if (!KEY_PATTERN.test(key)) {
      return 'Use a clearer field name (letters and numbers).'
    }
    if (keys.has(key)) return `You already have a field named “${label || key}”.`
    keys.add(key)
    if (!parseType(field.type)) return 'Choose a valid field type.'
    if (field.type === 'select') {
      const options = (field.options ?? []).map((item) => item.trim()).filter(Boolean)
      if (options.length < 2) {
        return `Add at least two choices for “${label}”.`
      }
    }
  }

  const missingLocked = requiredKeysForDocument(documentId).filter(
    (requiredKey) => !keys.has(requiredKey),
  )
  if (missingLocked.length > 0) {
    if (documentId === 'passport') {
      return 'Passport needs number and expiry fields so they can sync to the client profile.'
    }
    if (documentId === 'nid') {
      return 'National ID needs a number field so it can sync to the client profile.'
    }
    return 'Keep the fields that sync to the client profile.'
  }
  return undefined
}

export function documentFieldsEqual(
  left: DocumentFormFieldDraft[],
  right: DocumentFormFieldDraft[],
): boolean {
  if (left.length !== right.length) return false
  return left.every((field, index) => {
    const other = right[index]
    const leftOptions = (field.options ?? []).join('\n')
    const rightOptions = (other.options ?? []).join('\n')
    return (
      field.key === other.key &&
      field.label === other.label &&
      field.type === other.type &&
      Boolean(field.required) === Boolean(other.required) &&
      (field.placeholder ?? '') === (other.placeholder ?? '') &&
      leftOptions === rightOptions
    )
  })
}

export function saveDocumentFormOverride(
  documentId: string,
  fields: DocumentFormFieldDraft[],
): DocumentFormOverride {
  const error = validateDocumentFormFields(documentId, fields)
  if (error) throw new Error(error)

  const normalized = fields.map((field) => {
    const options =
      field.type === 'select'
        ? (field.options ?? []).map((item) => item.trim()).filter(Boolean)
        : undefined
    return {
      key: field.key.trim(),
      label: field.label.trim(),
      type: field.type,
      required: field.required === true,
      ...(field.placeholder?.trim()
        ? { placeholder: field.placeholder.trim() }
        : {}),
      ...(options?.length ? { options } : {}),
    }
  })

  const next: DocumentFormOverride = {
    documentId,
    tenantId: tenantId(),
    fields: normalized,
    updatedAt: new Date().toISOString(),
  }

  const without = overrides.filter(
    (item) =>
      !(item.tenantId === next.tenantId && item.documentId === documentId),
  )
  replaceAll([...without, next])
  return next
}

export function clearDocumentFormOverride(documentId: string): boolean {
  const exists = overrides.some(
    (item) =>
      item.documentId === documentId && item.tenantId === tenantId(),
  )
  if (!exists) return false
  replaceAll(
    overrides.filter(
      (item) =>
        !(item.documentId === documentId && item.tenantId === tenantId()),
    ),
  )
  return true
}

export function resetDocumentFormFields() {
  removeJson(STORAGE_KEY)
  overrides = []
  emit()
}

export function useDocumentFormOverrides(): DocumentFormOverride[] {
  const { session } = useAuth()
  const all = useSyncExternalStore(
    subscribeDocumentFormFields,
    getSnapshot,
    getSnapshot,
  )
  const activeId = session?.tenantId ?? DEFAULT_TENANT_ID
  return useMemo(
    () => all.filter((item) => item.tenantId === activeId),
    [all, activeId],
  )
}

function getRevisionSnapshot() {
  return revision
}

export function useDocumentFormFieldsVersion(): number {
  return useSyncExternalStore(
    subscribeDocumentFormFields,
    getRevisionSnapshot,
    getRevisionSnapshot,
  )
}
