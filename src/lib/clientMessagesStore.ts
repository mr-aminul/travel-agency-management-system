import { useMemo } from 'react'
import { useSyncExternalStore } from 'react'
import { getActiveTenantId } from '@/lib/authApi'
import { getClientById } from '@/lib/clientsStore'
import { useAuth } from '@/lib/useAuth'
import { DEFAULT_TENANT_ID } from '@/types/tenant'
import type { ClientSmsMessage, SendClientSmsInput } from '@/types/clientMessage'

type Listener = () => void

const STORAGE_KEY = 'pd-client-sms'
const MAX_BODY_LENGTH = 1000

const listeners = new Set<Listener>()
let messages: ClientSmsMessage[] = loadAll()

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
  return messages
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeMessage(value: unknown): ClientSmsMessage | undefined {
  if (!isRecord(value)) return undefined
  const id = typeof value.id === 'string' ? value.id.trim() : ''
  const tenantId =
    typeof value.tenantId === 'string' ? value.tenantId.trim() : ''
  const clientId =
    typeof value.clientId === 'string' ? value.clientId.trim() : ''
  const toPhone = typeof value.toPhone === 'string' ? value.toPhone.trim() : ''
  const body = typeof value.body === 'string' ? value.body.trim() : ''
  const createdAt =
    typeof value.createdAt === 'string' ? value.createdAt.trim() : ''
  if (!id || !tenantId || !clientId || !toPhone || !body || !createdAt) {
    return undefined
  }
  return {
    id,
    tenantId,
    clientId,
    toPhone,
    body,
    direction: 'outbound',
    createdAt,
  }
}

function loadAll(): ClientSmsMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .map(normalizeMessage)
      .filter((item): item is ClientSmsMessage => item != null)
  } catch {
    return []
  }
}

function persist(next: ClientSmsMessage[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    /* ignore quota / private mode */
  }
}

function replaceAll(next: ClientSmsMessage[]) {
  messages = next
  persist(messages)
  emit()
}

function tenantId() {
  return getActiveTenantId() || DEFAULT_TENANT_ID
}

export function validateClientSms(body: string, toPhone?: string): string | undefined {
  if (!toPhone?.trim()) {
    return 'Add a phone number on this profile to send SMS.'
  }
  const trimmed = body.trim()
  if (!trimmed) return 'Write a message to send.'
  if (trimmed.length > MAX_BODY_LENGTH) {
    return `Keep the message under ${MAX_BODY_LENGTH} characters.`
  }
  return undefined
}

export function listClientSms(clientId: string): ClientSmsMessage[] {
  const activeId = tenantId()
  return messages
    .filter(
      (item) => item.clientId === clientId && item.tenantId === activeId,
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function sendClientSms(input: SendClientSmsInput): ClientSmsMessage {
  const client = getClientById(input.clientId)
  if (!client) {
    throw new Error('Client not found.')
  }
  const error = validateClientSms(input.body, client.phone)
  if (error) throw new Error(error)

  const created: ClientSmsMessage = {
    id: `sms-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    tenantId: tenantId(),
    clientId: client.id,
    toPhone: client.phone.trim(),
    body: input.body.trim(),
    direction: 'outbound',
    createdAt: new Date().toISOString(),
  }
  replaceAll([...messages, created])
  return created
}

export function resetClientMessages() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
  messages = []
  emit()
}

export function useClientSms(clientId: string): ClientSmsMessage[] {
  const { session } = useAuth()
  const all = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const activeId = session?.tenantId ?? DEFAULT_TENANT_ID
  return useMemo(
    () =>
      all
        .filter(
          (item) => item.clientId === clientId && item.tenantId === activeId,
        )
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [all, activeId, clientId],
  )
}
