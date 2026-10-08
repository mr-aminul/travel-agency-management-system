import { useMemo } from 'react'
import { useSyncExternalStore } from 'react'
import { getActiveTenantId } from '@/lib/authApi'
import {
  matchCountryFromDestination,
  normalizeCountryName,
} from '@/lib/destinationCountries'
import { DATA_KEYS, loadJsonParsed, removeJson, saveJson } from '@/lib/data'
import { useAuth } from '@/lib/useAuth'
import { slugifyServiceName } from '@/types/case'
import { DEFAULT_TENANT_ID } from '@/types/tenant'
import { syncDocumentUnlockSteps } from '@/lib/stepDocumentLinks'
import type {
  ServiceDocumentConfig,
  ServiceStepConfig,
  ServiceTemplateOverride,
} from '@/types/serviceTemplate'

type Listener = () => void

const STORAGE_KEY = DATA_KEYS.serviceTemplates

const listeners = new Set<Listener>()
let templates: ServiceTemplateOverride[] = loadAll()

function emit() {
  listeners.forEach((listener) => listener())
}

export function subscribeServiceTemplates(listener: Listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot() {
  return templates
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeStep(value: unknown): ServiceStepConfig | undefined {
  if (!isRecord(value)) return undefined
  const id = typeof value.id === 'string' ? value.id.trim() : ''
  const label = typeof value.label === 'string' ? value.label.trim() : ''
  if (!id || !label) return undefined
  const requiredDocumentIds = Array.isArray(value.requiredDocumentIds)
    ? value.requiredDocumentIds
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean)
    : undefined
  return {
    id,
    label,
    ...(requiredDocumentIds?.length ? { requiredDocumentIds } : {}),
  }
}

function normalizeDocument(value: unknown): ServiceDocumentConfig | undefined {
  if (!isRecord(value)) return undefined
  const id = typeof value.id === 'string' ? value.id.trim() : ''
  const name = typeof value.name === 'string' ? value.name.trim() : ''
  if (!id || !name) return undefined
  return {
    id,
    name,
    required: value.required !== false,
    unlockStepId:
      typeof value.unlockStepId === 'string' && value.unlockStepId.trim()
        ? value.unlockStepId.trim()
        : undefined,
  }
}

function sameServiceName(left: string, right: string) {
  return left.trim().toLowerCase() === right.trim().toLowerCase()
}

function sameCountry(left: string, right: string) {
  return (
    normalizeCountryName(left).toLowerCase() ===
    normalizeCountryName(right).toLowerCase()
  )
}

export function templateRecordId(serviceName: string, country = '') {
  const base = slugifyServiceName(serviceName) || 'service'
  const countrySlug = slugifyServiceName(country)
  return countrySlug ? `tpl-${base}--${countrySlug}` : `tpl-${base}`
}

function normalizeTemplate(value: unknown): ServiceTemplateOverride | undefined {
  if (!isRecord(value)) return undefined
  const id = typeof value.id === 'string' ? value.id.trim() : ''
  const tenantId =
    typeof value.tenantId === 'string' ? value.tenantId.trim() : ''
  const serviceName =
    typeof value.serviceName === 'string' ? value.serviceName.trim() : ''
  if (!id || !tenantId || !serviceName) return undefined
  const steps = Array.isArray(value.steps)
    ? value.steps
        .map(normalizeStep)
        .filter((item): item is ServiceStepConfig => item != null)
    : []
  const documents = Array.isArray(value.documents)
    ? value.documents
        .map(normalizeDocument)
        .filter((item): item is ServiceDocumentConfig => item != null)
    : []
  if (steps.length === 0) return undefined
  const country =
    typeof value.country === 'string' ? normalizeCountryName(value.country) : ''
  return { id, tenantId, serviceName, country, steps, documents }
}

function loadAll(): ServiceTemplateOverride[] {
  return loadJsonParsed(STORAGE_KEY, [] as ServiceTemplateOverride[], (value) => {
    if (!Array.isArray(value)) return []
    return value
      .map(normalizeTemplate)
      .filter((item): item is ServiceTemplateOverride => item != null)
  })
}

function persist(next: ServiceTemplateOverride[]) {
  saveJson(STORAGE_KEY, next)
}

function replaceAll(next: ServiceTemplateOverride[]) {
  templates = next
  persist(templates)
  emit()
}

function tenantId() {
  return getActiveTenantId() || DEFAULT_TENANT_ID
}

function reloadFromStorage() {
  templates = loadAll()
  emit()
}

if (typeof window !== 'undefined') {
  window.addEventListener('pd-data-rehydrated', reloadFromStorage)
}

export function nextTemplateItemId(label: string, existing: string[]): string {
  const base = slugifyServiceName(label) || 'item'
  let id = base
  let n = 2
  while (existing.includes(id)) {
    id = `${base}-${n}`
    n += 1
  }
  return id
}

export function listServiceTemplates(
  serviceName: string,
  forTenantId = tenantId(),
): ServiceTemplateOverride[] {
  return templates.filter(
    (item) =>
      item.tenantId === forTenantId &&
      sameServiceName(item.serviceName, serviceName),
  )
}

export function listServiceCountries(
  serviceName: string,
  forTenantId = tenantId(),
): string[] {
  return listServiceTemplates(serviceName, forTenantId)
    .map((item) => item.country)
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right))
}

export function getServiceTemplateOverride(
  serviceName: string,
  country = '',
  forTenantId = tenantId(),
): ServiceTemplateOverride | undefined {
  return listServiceTemplates(serviceName, forTenantId).find((item) =>
    sameCountry(item.country, country),
  )
}

export function resolveServiceCountry(
  serviceName: string,
  destination?: string,
  forTenantId = tenantId(),
): string {
  return (
    matchCountryFromDestination(
      destination,
      listServiceCountries(serviceName, forTenantId),
    ) ?? ''
  )
}

/** Country-specific template if one matches, otherwise the all-countries default. */
export function resolveServiceTemplateOverride(
  serviceName: string,
  destination?: string,
  forTenantId = tenantId(),
): ServiceTemplateOverride | undefined {
  const country = resolveServiceCountry(serviceName, destination, forTenantId)
  if (country) {
    const matched = getServiceTemplateOverride(
      serviceName,
      country,
      forTenantId,
    )
    if (matched) return matched
  }
  return getServiceTemplateOverride(serviceName, '', forTenantId)
}

export function saveServiceTemplate(input: {
  serviceName: string
  country?: string
  steps: ServiceStepConfig[]
  documents: ServiceDocumentConfig[]
}): ServiceTemplateOverride {
  const serviceName = input.serviceName.trim()
  const country = normalizeCountryName(input.country ?? '')
  const rawSteps = input.steps
    .map((step) => ({
      id: step.id.trim() || nextTemplateItemId(step.label, []),
      label: step.label.trim(),
      requiredDocumentIds: step.requiredDocumentIds,
    }))
    .filter((step) => step.label.length > 0)
  const rawDocuments = input.documents
    .map((doc) => ({
      id: doc.id.trim() || nextTemplateItemId(doc.name, []),
      name: doc.name.trim(),
      required: doc.required,
      unlockStepId: doc.unlockStepId,
    }))
    .filter((doc) => doc.name.length > 0)

  if (!serviceName) throw new Error('Choose a service to configure.')
  if (rawSteps.length === 0) {
    throw new Error('Add at least one status step for this service.')
  }

  const { steps, documents } = syncDocumentUnlockSteps(rawSteps, rawDocuments)

  const active = tenantId()
  const current = getServiceTemplateOverride(serviceName, country, active)
  const saved: ServiceTemplateOverride = {
    id: current?.id ?? templateRecordId(serviceName, country),
    tenantId: active,
    serviceName,
    country,
    steps,
    documents,
  }

  replaceAll([
    saved,
    ...templates.filter(
      (item) =>
        !(
          item.tenantId === active &&
          sameServiceName(item.serviceName, serviceName) &&
          sameCountry(item.country, country)
        ),
    ),
  ])
  return saved
}

export function renameServiceTemplate(
  fromName: string,
  toName: string,
): boolean {
  const active = tenantId()
  const nextName = toName.trim()
  if (!fromName.trim() || !nextName) return false

  const matches = listServiceTemplates(fromName, active)
  if (matches.length === 0) return false
  if (matches.every((item) => item.serviceName === nextName)) return true

  replaceAll(
    templates.map((item) => {
      if (
        item.tenantId !== active ||
        !sameServiceName(item.serviceName, fromName)
      ) {
        return item
      }
      return {
        ...item,
        serviceName: nextName,
        id: templateRecordId(nextName, item.country),
      }
    }),
  )
  return true
}

export function deleteServiceTemplate(
  serviceName: string,
  country = '',
): boolean {
  const active = tenantId()
  const exists = Boolean(getServiceTemplateOverride(serviceName, country, active))
  if (!exists) return false
  replaceAll(
    templates.filter(
      (item) =>
        !(
          item.tenantId === active &&
          sameServiceName(item.serviceName, serviceName) &&
          sameCountry(item.country, country)
        ),
    ),
  )
  return true
}

export function deleteAllServiceTemplates(serviceName: string): boolean {
  const active = tenantId()
  const exists = listServiceTemplates(serviceName, active).length > 0
  if (!exists) return false
  replaceAll(
    templates.filter(
      (item) =>
        !(
          item.tenantId === active &&
          sameServiceName(item.serviceName, serviceName)
        ),
    ),
  )
  return true
}

export function resetServiceTemplates() {
  removeJson(STORAGE_KEY)
  templates = []
  emit()
}

export function useServiceTemplates(): ServiceTemplateOverride[] {
  const { session } = useAuth()
  const all = useSyncExternalStore(
    subscribeServiceTemplates,
    getSnapshot,
    getSnapshot,
  )
  const activeId = session?.tenantId ?? DEFAULT_TENANT_ID
  return useMemo(
    () => all.filter((item) => item.tenantId === activeId),
    [all, activeId],
  )
}
