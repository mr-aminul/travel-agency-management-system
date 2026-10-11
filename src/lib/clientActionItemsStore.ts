import { useMemo } from 'react'
import { useSyncExternalStore } from 'react'
import { getActiveTenantId } from '@/lib/authApi'
import { getClientById } from '@/lib/clientsStore'
import { DATA_KEYS, loadJsonParsed, removeJson, saveJson } from '@/lib/data'
import { useAuth } from '@/lib/useAuth'
import { DEFAULT_TENANT_ID } from '@/types/tenant'
import type {
  ClientActionItem,
  CreateClientActionItemInput,
} from '@/types/clientActionItem'

type Listener = () => void

const STORAGE_KEY = DATA_KEYS.clientActionItems
const MAX_TEXT_LENGTH = 200

const listeners = new Set<Listener>()
let items: ClientActionItem[] = loadAll()

function emit() {
  listeners.forEach((listener) => listener())
}

function subscribe(listener: Listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot() {
  return items
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeItem(value: unknown): ClientActionItem | undefined {
  if (!isRecord(value)) return undefined
  const id = typeof value.id === 'string' ? value.id.trim() : ''
  const tenantId =
    typeof value.tenantId === 'string' ? value.tenantId.trim() : ''
  const clientId =
    typeof value.clientId === 'string' ? value.clientId.trim() : ''
  const text = typeof value.text === 'string' ? value.text.trim() : ''
  const createdAt =
    typeof value.createdAt === 'string' ? value.createdAt.trim() : ''
  if (!id || !tenantId || !clientId || !text || !createdAt) return undefined
  const completedAt =
    typeof value.completedAt === 'string' && value.completedAt.trim()
      ? value.completedAt.trim()
      : undefined
  return {
    id,
    tenantId,
    clientId,
    text,
    done: value.done === true,
    createdAt,
    completedAt,
  }
}

function parseItemList(value: unknown): ClientActionItem[] {
  if (!Array.isArray(value)) return []
  return value
    .map(normalizeItem)
    .filter((item): item is ClientActionItem => item != null)
}

function loadAll(): ClientActionItem[] {
  return loadJsonParsed(STORAGE_KEY, [] as ClientActionItem[], parseItemList)
}

function persist(next: ClientActionItem[]) {
  saveJson(STORAGE_KEY, next)
}

function replaceAll(next: ClientActionItem[]) {
  items = next
  persist(items)
  emit()
}

function tenantId() {
  return getActiveTenantId() || DEFAULT_TENANT_ID
}

function reloadFromStorage() {
  items = loadAll()
  emit()
}

if (typeof window !== 'undefined') {
  window.addEventListener('pd-data-rehydrated', reloadFromStorage)
}

function sortActionItems(list: ClientActionItem[]): ClientActionItem[] {
  return [...list].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1
    if (a.done && b.done) {
      const aDone = a.completedAt ?? a.createdAt
      const bDone = b.completedAt ?? b.createdAt
      return bDone.localeCompare(aDone)
    }
    return a.createdAt.localeCompare(b.createdAt)
  })
}

export function validateClientActionItemText(
  text: string,
): string | undefined {
  const trimmed = text.trim()
  if (!trimmed) return 'Write an action item to add.'
  if (trimmed.length > MAX_TEXT_LENGTH) {
    return `Keep the action item under ${MAX_TEXT_LENGTH} characters.`
  }
  return undefined
}

export function listClientActionItems(clientId: string): ClientActionItem[] {
  const activeId = tenantId()
  return sortActionItems(
    items.filter(
      (item) => item.clientId === clientId && item.tenantId === activeId,
    ),
  )
}

export function countOpenClientActionItems(clientId: string): number {
  return listClientActionItems(clientId).filter((item) => !item.done).length
}

export function addClientActionItem(
  input: CreateClientActionItemInput,
): ClientActionItem {
  const client = getClientById(input.clientId)
  if (!client) {
    throw new Error('Client not found.')
  }
  const error = validateClientActionItemText(input.text)
  if (error) throw new Error(error)

  const created: ClientActionItem = {
    id: `action-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    tenantId: tenantId(),
    clientId: client.id,
    text: input.text.trim(),
    done: false,
    createdAt: new Date().toISOString(),
  }
  replaceAll([...items, created])
  return created
}

export function setClientActionItemDone(
  id: string,
  done: boolean,
): ClientActionItem {
  const activeId = tenantId()
  const current = items.find(
    (item) => item.id === id && item.tenantId === activeId,
  )
  if (!current) {
    throw new Error('Action item not found.')
  }
  const next: ClientActionItem = {
    ...current,
    done,
    completedAt: done ? new Date().toISOString() : undefined,
  }
  replaceAll(items.map((item) => (item.id === id ? next : item)))
  return next
}

export function removeClientActionItem(id: string): void {
  const activeId = tenantId()
  const exists = items.some(
    (item) => item.id === id && item.tenantId === activeId,
  )
  if (!exists) {
    throw new Error('Action item not found.')
  }
  replaceAll(
    items.filter((item) => !(item.id === id && item.tenantId === activeId)),
  )
}

export function resetClientActionItems() {
  removeJson(STORAGE_KEY)
  items = []
  emit()
}

export function useClientActionItems(clientId: string): ClientActionItem[] {
  const { session } = useAuth()
  const all = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const activeId = session?.tenantId ?? DEFAULT_TENANT_ID
  return useMemo(
    () =>
      sortActionItems(
        all.filter(
          (item) => item.clientId === clientId && item.tenantId === activeId,
        ),
      ),
    [all, activeId, clientId],
  )
}
