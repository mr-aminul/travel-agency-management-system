import { useMemo } from 'react'
import { useSyncExternalStore } from 'react'
import { getActiveTenantId } from '@/lib/authApi'
import { getClientById } from '@/lib/clientsStore'
import { DATA_KEYS, loadJsonParsed, removeJson, saveJson } from '@/lib/data'
import { useAuth } from '@/lib/useAuth'
import { DEFAULT_TENANT_ID } from '@/types/tenant'
import type {
  ClientMessageAttachment,
  ClientMessageChannel,
  ClientSmsMessage,
  ClientThreadMessage,
  SendClientMessageInput,
  SendClientSmsInput,
} from '@/types/clientMessage'

type Listener = () => void

const STORAGE_KEY = DATA_KEYS.clientMessages
const LEGACY_STORAGE_KEY = 'pd-client-sms'
const MAX_BODY_LENGTH = 1000

const listeners = new Set<Listener>()
let messages: ClientThreadMessage[] = loadAll()

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

function normalizeAttachment(
  value: unknown,
): ClientMessageAttachment | undefined {
  if (!isRecord(value)) return undefined
  const name = typeof value.name === 'string' ? value.name.trim() : ''
  const dataUrl = typeof value.dataUrl === 'string' ? value.dataUrl.trim() : ''
  const mimeType =
    typeof value.mimeType === 'string' ? value.mimeType.trim() : ''
  if (!name || !dataUrl || !mimeType.startsWith('image/')) return undefined
  return { name, dataUrl, mimeType }
}

function normalizeMessage(value: unknown): ClientThreadMessage | undefined {
  if (!isRecord(value)) return undefined
  const id = typeof value.id === 'string' ? value.id.trim() : ''
  const tenantId =
    typeof value.tenantId === 'string' ? value.tenantId.trim() : ''
  const clientId =
    typeof value.clientId === 'string' ? value.clientId.trim() : ''
  const legacyPhone =
    typeof value.toPhone === 'string' ? value.toPhone.trim() : ''
  const to =
    typeof value.to === 'string' && value.to.trim()
      ? value.to.trim()
      : legacyPhone
  const body = typeof value.body === 'string' ? value.body.trim() : ''
  const createdAt =
    typeof value.createdAt === 'string' ? value.createdAt.trim() : ''
  const channel: ClientMessageChannel =
    value.channel === 'email' ? 'email' : 'sms'
  const attachment = normalizeAttachment(value.attachment)
  if (!id || !tenantId || !clientId || !to || !createdAt) {
    return undefined
  }
  if (!body && !attachment) return undefined
  return {
    id,
    tenantId,
    clientId,
    channel,
    to,
    body,
    attachment,
    direction: 'outbound',
    createdAt,
  }
}

function parseMessageList(value: unknown): ClientThreadMessage[] {
  if (!Array.isArray(value)) return []
  return value
    .map(normalizeMessage)
    .filter((item): item is ClientThreadMessage => item != null)
}

function loadAll(): ClientThreadMessage[] {
  const fromData = loadJsonParsed(
    STORAGE_KEY,
    [] as ClientThreadMessage[],
    parseMessageList,
  )
  if (fromData.length > 0) return fromData
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY)
    if (!raw) return []
    const migrated = parseMessageList(JSON.parse(raw) as unknown)
    if (migrated.length > 0) {
      saveJson(STORAGE_KEY, migrated)
      localStorage.removeItem(LEGACY_STORAGE_KEY)
    }
    return migrated
  } catch {
    return []
  }
}

function persist(next: ClientThreadMessage[]) {
  saveJson(STORAGE_KEY, next)
}

function replaceAll(next: ClientThreadMessage[]) {
  messages = next
  persist(messages)
  emit()
}

function tenantId() {
  return getActiveTenantId() || DEFAULT_TENANT_ID
}

function reloadFromStorage() {
  messages = loadAll()
  emit()
}

if (typeof window !== 'undefined') {
  window.addEventListener('pd-data-rehydrated', reloadFromStorage)
}

function asSmsMessage(item: ClientThreadMessage): ClientSmsMessage {
  return { ...item, toPhone: item.to }
}

export function validateClientMessage(
  channel: ClientMessageChannel,
  body: string,
  toAddress?: string,
  attachment?: ClientMessageAttachment,
): string | undefined {
  if (!toAddress?.trim()) {
    return channel === 'email'
      ? 'Add an email address on this profile to log a note.'
      : 'Add a phone number on this profile to log a note.'
  }
  const trimmed = body.trim()
  if (!trimmed && !attachment) {
    return channel === 'email'
      ? 'Write a note or attach an image to save this draft.'
      : 'Write a note or attach an image to save this draft.'
  }
  if (trimmed.length > MAX_BODY_LENGTH) {
    return `Keep the note under ${MAX_BODY_LENGTH} characters.`
  }
  return undefined
}

export function validateClientSms(
  body: string,
  toPhone?: string,
  attachment?: ClientMessageAttachment,
): string | undefined {
  return validateClientMessage('sms', body, toPhone, attachment)
}

export function listClientMessages(
  clientId: string,
  channel?: ClientMessageChannel,
): ClientThreadMessage[] {
  const activeId = tenantId()
  return messages
    .filter(
      (item) =>
        item.clientId === clientId &&
        item.tenantId === activeId &&
        (channel == null || item.channel === channel),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function listClientSms(clientId: string): ClientSmsMessage[] {
  return listClientMessages(clientId, 'sms').map(asSmsMessage)
}

export function sendClientMessage(
  input: SendClientMessageInput,
): ClientThreadMessage {
  const client = getClientById(input.clientId)
  if (!client) {
    throw new Error('Client not found.')
  }
  const to =
    input.channel === 'email'
      ? client.email?.trim() ?? ''
      : client.phone.trim()
  const error = validateClientMessage(
    input.channel,
    input.body,
    to,
    input.attachment,
  )
  if (error) throw new Error(error)

  const created: ClientThreadMessage = {
    id: `${input.channel}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    tenantId: tenantId(),
    clientId: client.id,
    channel: input.channel,
    to,
    body: input.body.trim(),
    attachment: input.attachment,
    direction: 'outbound',
    createdAt: new Date().toISOString(),
  }
  replaceAll([...messages, created])
  return created
}

export function sendClientSms(input: SendClientSmsInput): ClientSmsMessage {
  return asSmsMessage(
    sendClientMessage({
      clientId: input.clientId,
      channel: 'sms',
      body: input.body,
      attachment: input.attachment,
    }),
  )
}

export function resetClientMessages() {
  removeJson(STORAGE_KEY)
  try {
    localStorage.removeItem(LEGACY_STORAGE_KEY)
  } catch {
    /* ignore */
  }
  messages = []
  emit()
}

export function useClientMessages(
  clientId: string,
  channel: ClientMessageChannel,
): ClientThreadMessage[] {
  const { session } = useAuth()
  const all = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const activeId = session?.tenantId ?? DEFAULT_TENANT_ID
  return useMemo(
    () =>
      all
        .filter(
          (item) =>
            item.clientId === clientId &&
            item.tenantId === activeId &&
            item.channel === channel,
        )
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [all, activeId, clientId, channel],
  )
}

export function useClientSms(clientId: string): ClientSmsMessage[] {
  return useClientMessages(clientId, 'sms').map(asSmsMessage)
}
