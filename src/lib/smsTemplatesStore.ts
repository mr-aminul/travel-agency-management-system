import { useEffect, useMemo } from 'react'
import { useSyncExternalStore } from 'react'
import { getActiveTenantId } from '@/lib/authApi'
import { DATA_KEYS, loadJsonParsed, removeJson, saveJson } from '@/lib/data'
import { useAuth } from '@/lib/useAuth'
import { DEFAULT_TENANT_ID } from '@/types/tenant'
import type {
  MessageTemplateChannel,
  SmsTemplate,
  SmsTemplateDraft,
  SmsTemplateFolderGroup,
} from '@/types/smsTemplate'

type Listener = () => void

const STORAGE_KEY = DATA_KEYS.smsTemplates
const DEFAULT_FOLDER = 'General'

type SeedDef = {
  key: string
  channel: MessageTemplateChannel
  folder: string
  name: string
  body: string
}

/** Starter templates — editable; seeded once per channel when that channel is empty. */
const SEED_TEMPLATE_DEFS: SeedDef[] = [
  {
    key: 'welcome',
    channel: 'sms',
    folder: 'General',
    name: 'Welcome',
    body: 'Dear {{name}}, welcome to {{agencyName}}. Your Client ID is {{clientId}}.',
  },
  {
    key: 'client-id',
    channel: 'sms',
    folder: 'General',
    name: 'Client ID',
    body: 'Dear {{name}}, your Client ID is {{clientId}}. Please quote this ID when you contact us. — {{agencyName}}',
  },
  {
    key: 'tracking',
    channel: 'sms',
    folder: 'Passport',
    name: 'Passport tracking',
    body: 'Dear {{name}}, track your file with passport {{passport}}: {{trackingLink}} — {{agencyName}}',
  },
  {
    key: 'documents',
    channel: 'sms',
    folder: 'Documents',
    name: 'Documents reminder',
    body: 'Dear {{name}}, please submit the pending documents for your file (Client ID {{clientId}}). — {{agencyName}}',
  },
  {
    key: 'payment',
    channel: 'sms',
    folder: 'Payment',
    name: 'Payment reminder',
    body: 'Dear {{name}}, please clear your outstanding balance for Client ID {{clientId}}. Contact {{agencyName}}.',
  },
  {
    key: 'email-welcome',
    channel: 'email',
    folder: 'General',
    name: 'Welcome email',
    body: 'Dear {{name}},\n\nWelcome to {{agencyName}}. Your Client ID is {{clientId}}.\n\nRegards,\n{{agencyName}}',
  },
  {
    key: 'email-tracking',
    channel: 'email',
    folder: 'Passport',
    name: 'Passport tracking email',
    body: 'Dear {{name}},\n\nTrack your file with passport {{passport}}:\n{{trackingLink}}\n\nRegards,\n{{agencyName}}',
  },
  {
    key: 'email-documents',
    channel: 'email',
    folder: 'Documents',
    name: 'Documents reminder email',
    body: 'Dear {{name}},\n\nPlease submit the pending documents for your file (Client ID {{clientId}}).\n\nRegards,\n{{agencyName}}',
  },
  {
    key: 'pipeline-status',
    channel: 'sms',
    folder: 'Pipeline',
    name: 'Status update',
    body: 'Dear {{name}}, your {{serviceName}} file is now at: {{statusLabel}}. Client ID: {{clientId}}. — {{agencyName}}',
  },
  {
    key: 'email-pipeline-status',
    channel: 'email',
    folder: 'Pipeline',
    name: 'Status update email',
    body: 'Dear {{name}},\n\nYour {{serviceName}} file is now at: {{statusLabel}}.\nClient ID: {{clientId}}\n\nRegards,\n{{agencyName}}',
  },
]

const listeners = new Set<Listener>()
let templates: SmsTemplate[] = loadAll()

function emit() {
  listeners.forEach((listener) => listener())
}

export function subscribeSmsTemplates(listener: Listener) {
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

function normalizeFolder(value: unknown): string {
  if (typeof value === 'string' && value.trim()) return value.trim()
  return DEFAULT_FOLDER
}

function normalizeChannel(value: unknown): MessageTemplateChannel {
  return value === 'email' ? 'email' : 'sms'
}

function normalizeTemplate(value: unknown): SmsTemplate | undefined {
  if (!isRecord(value)) return undefined
  const id = typeof value.id === 'string' ? value.id.trim() : ''
  const tenantId =
    typeof value.tenantId === 'string' ? value.tenantId.trim() : ''
  const name = typeof value.name === 'string' ? value.name.trim() : ''
  const body = typeof value.body === 'string' ? value.body.trim() : ''
  if (!id || !tenantId || !name || !body) return undefined
  return {
    id,
    tenantId,
    channel: normalizeChannel(value.channel),
    folder: normalizeFolder(value.folder),
    name,
    body,
    createdAt:
      typeof value.createdAt === 'string' && value.createdAt
        ? value.createdAt
        : new Date().toISOString(),
  }
}

function loadAll(): SmsTemplate[] {
  return loadJsonParsed(STORAGE_KEY, [] as SmsTemplate[], (value) => {
    if (!Array.isArray(value)) return []
    return value
      .map(normalizeTemplate)
      .filter((item): item is SmsTemplate => item != null)
  })
}

function persist(next: SmsTemplate[]) {
  saveJson(STORAGE_KEY, next)
}

function replaceAll(next: SmsTemplate[]) {
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

function seedId(forTenantId: string, key: string) {
  return `sms-tpl-seed-${key}-${forTenantId}`
}

function nextId(existing: string[]) {
  const nums = existing
    .map((id) => Number(id.replace(/\D/g, '').slice(-4)))
    .filter((n) => !Number.isNaN(n))
  const next = (nums.length ? Math.max(...nums) : 0) + 1
  return `sms-tpl-${String(next).padStart(4, '0')}`
}

/**
 * Seed each channel once: when a tenant has no templates for SMS or email,
 * add that channel’s starters. Deleted templates stay gone while any remain.
 * Pipeline status seeds are also added when that folder is still missing.
 */
export function ensureSmsTemplateSeeds(forTenantId = tenantId()): void {
  const forTenant = templates.filter((item) => item.tenantId === forTenantId)
  const hasSms = forTenant.some((item) => item.channel === 'sms')
  const hasEmail = forTenant.some((item) => item.channel === 'email')
  const hasPipelineSms = forTenant.some(
    (item) => item.channel === 'sms' && item.folder === 'Pipeline',
  )
  const hasPipelineEmail = forTenant.some(
    (item) => item.channel === 'email' && item.folder === 'Pipeline',
  )
  const existingIds = new Set(forTenant.map((item) => item.id))

  const toAdd = SEED_TEMPLATE_DEFS.filter((seed) => {
    const id = seedId(forTenantId, seed.key)
    if (existingIds.has(id)) return false
    if (seed.folder === 'Pipeline') {
      if (seed.channel === 'sms') return !hasPipelineSms
      return !hasPipelineEmail
    }
    if (seed.channel === 'sms' && hasSms) return false
    if (seed.channel === 'email' && hasEmail) return false
    return true
  }).map((seed) => ({
    id: seedId(forTenantId, seed.key),
    tenantId: forTenantId,
    channel: seed.channel,
    folder: seed.folder,
    name: seed.name,
    body: seed.body,
    createdAt: '2026-01-01T00:00:00.000Z',
  }))
  if (toAdd.length === 0) return
  replaceAll([...templates, ...toAdd])
}

function sortTemplates(rows: SmsTemplate[]): SmsTemplate[] {
  return rows.slice().sort((a, b) => {
    if (a.channel !== b.channel) return a.channel.localeCompare(b.channel)
    const folderCmp = a.folder.localeCompare(b.folder)
    if (folderCmp !== 0) return folderCmp
    return a.name.localeCompare(b.name)
  })
}

export function listSmsTemplates(
  forTenantId = tenantId(),
  channel?: MessageTemplateChannel,
): SmsTemplate[] {
  ensureSmsTemplateSeeds(forTenantId)
  return sortTemplates(
    templates.filter(
      (item) =>
        item.tenantId === forTenantId &&
        (channel == null || item.channel === channel),
    ),
  )
}

export function getSmsTemplateById(
  id: string,
  forTenantId = tenantId(),
): SmsTemplate | undefined {
  const trimmed = id.trim()
  if (!trimmed) return undefined
  ensureSmsTemplateSeeds(forTenantId)
  return templates.find(
    (item) => item.id === trimmed && item.tenantId === forTenantId,
  )
}

export function listSmsTemplateFolders(
  forTenantId = tenantId(),
  channel?: MessageTemplateChannel,
): string[] {
  const folders = new Set<string>()
  for (const item of listSmsTemplates(forTenantId, channel)) {
    folders.add(item.folder)
  }
  return [...folders].sort((a, b) => a.localeCompare(b))
}

export function groupSmsTemplatesByFolder(
  forTenantId = tenantId(),
  channel?: MessageTemplateChannel,
): SmsTemplateFolderGroup[] {
  const groups = new Map<string, SmsTemplate[]>()
  for (const item of listSmsTemplates(forTenantId, channel)) {
    const bucket = groups.get(item.folder) ?? []
    bucket.push(item)
    groups.set(item.folder, bucket)
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([folder, rows]) => ({
      folder,
      templates: rows.slice().sort((a, b) => a.name.localeCompare(b.name)),
    }))
}

export function validateSmsTemplate(
  draft: SmsTemplateDraft,
  forTenantId = tenantId(),
  exceptId?: string,
): string | undefined {
  const folder = draft.folder.trim()
  const name = draft.name.trim()
  const body = draft.body.trim()
  if (draft.channel !== 'sms' && draft.channel !== 'email') {
    return 'Choose SMS or email.'
  }
  if (folder.length < 2) return 'Give the folder a name.'
  if (folder.length > 40) return 'Keep the folder name under 40 characters.'
  if (name.length < 2) return 'Give the template a name.'
  if (name.length > 60) return 'Keep the name under 60 characters.'
  if (!body) return 'Write the message body.'
  if (body.length > 2000) return 'Keep the message under 2000 characters.'
  const duplicate = listSmsTemplates(forTenantId, draft.channel).find(
    (item) =>
      item.id !== exceptId &&
      item.folder.toLowerCase() === folder.toLowerCase() &&
      item.name.toLowerCase() === name.toLowerCase(),
  )
  if (duplicate) {
    return 'You already have a template with that name in this folder.'
  }
  return undefined
}

export function createSmsTemplate(draft: SmsTemplateDraft): SmsTemplate {
  const tid = tenantId()
  ensureSmsTemplateSeeds(tid)
  const error = validateSmsTemplate(draft, tid)
  if (error) throw new Error(error)

  const created: SmsTemplate = {
    id: nextId(templates.map((item) => item.id)),
    tenantId: tid,
    channel: draft.channel,
    folder: draft.folder.trim(),
    name: draft.name.trim(),
    body: draft.body.trim(),
    createdAt: new Date().toISOString(),
  }
  replaceAll([...templates, created])
  return created
}

export function updateSmsTemplate(
  id: string,
  draft: SmsTemplateDraft,
): SmsTemplate {
  const tid = tenantId()
  const existing = templates.find(
    (item) => item.id === id && item.tenantId === tid,
  )
  if (!existing) throw new Error('That template was not found.')

  const error = validateSmsTemplate(draft, tid, id)
  if (error) throw new Error(error)

  const next = templates.map((item) =>
    item.id === id && item.tenantId === tid
      ? {
          ...item,
          channel: draft.channel,
          folder: draft.folder.trim(),
          name: draft.name.trim(),
          body: draft.body.trim(),
        }
      : item,
  )
  replaceAll(next)
  return next.find((item) => item.id === id)!
}

export function renameSmsTemplateFolder(
  fromFolder: string,
  toFolder: string,
  forTenantId = tenantId(),
  channel?: MessageTemplateChannel,
): number {
  const from = fromFolder.trim()
  const to = toFolder.trim()
  if (from.length < 2) throw new Error('Choose a folder to rename.')
  if (to.length < 2) throw new Error('Give the folder a name.')
  if (to.length > 40) throw new Error('Keep the folder name under 40 characters.')
  if (from.toLowerCase() === to.toLowerCase()) return 0

  let count = 0
  const next = templates.map((item) => {
    if (item.tenantId !== forTenantId) return item
    if (channel && item.channel !== channel) return item
    if (item.folder.toLowerCase() !== from.toLowerCase()) return item
    count += 1
    return { ...item, folder: to }
  })
  if (count > 0) replaceAll(next)
  return count
}

export function deleteSmsTemplate(id: string): boolean {
  const tid = tenantId()
  const exists = templates.some(
    (item) => item.id === id && item.tenantId === tid,
  )
  if (!exists) return false
  replaceAll(
    templates.filter((item) => !(item.id === id && item.tenantId === tid)),
  )
  return true
}

export function resetSmsTemplates() {
  removeJson(STORAGE_KEY)
  templates = []
  emit()
}

export function useSmsTemplates(
  channel?: MessageTemplateChannel,
): SmsTemplate[] {
  useAuth()
  const snapshot = useSyncExternalStore(subscribeSmsTemplates, getSnapshot)
  const tid = tenantId()
  useEffect(() => {
    ensureSmsTemplateSeeds(tid)
  }, [tid])
  return useMemo(
    () =>
      sortTemplates(
        snapshot.filter(
          (item) =>
            item.tenantId === tid &&
            (channel == null || item.channel === channel),
        ),
      ),
    [snapshot, tid, channel],
  )
}

export function useSmsTemplateFolders(
  channel?: MessageTemplateChannel,
): SmsTemplateFolderGroup[] {
  const templatesForTenant = useSmsTemplates(channel)
  return useMemo(() => {
    const groups = new Map<string, SmsTemplate[]>()
    for (const item of templatesForTenant) {
      const bucket = groups.get(item.folder) ?? []
      bucket.push(item)
      groups.set(item.folder, bucket)
    }
    return [...groups.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([folder, rows]) => ({
        folder,
        templates: rows.slice().sort((a, b) => a.name.localeCompare(b.name)),
      }))
  }, [templatesForTenant])
}
