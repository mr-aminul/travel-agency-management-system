import { useMemo } from 'react'
import { useSyncExternalStore } from 'react'
import { getActiveTenantId } from '@/lib/authApi'
import { DATA_KEYS, loadJsonParsed, removeJson, saveJson } from '@/lib/data'
import { useAuth } from '@/lib/useAuth'
import { DEFAULT_TENANT_ID, TENANT_IDS } from '@/types/tenant'
import type {
  DocumentTemplate,
  DocumentTemplateDraft,
  DocumentTemplateGroup,
  DocumentTemplateLayout,
  PrintField,
  PrintFormat,
  TemplateColumn,
  TemplateStamp,
} from '@/types/documentTemplate'
import {
  DOCUMENT_TEMPLATE_GROUPS,
  PRINT_FORMATS,
  NOTESHEET_ITEMS,
  PRINT_FIELDS,
  PUTUP_DECLARATION,
  embassyHeaderRows,
  embassyStamps,
  putupHeaderRows,
  putupStamps,
} from '@/types/documentTemplate'

type Listener = () => void

const STORAGE_KEY = DATA_KEYS.documentTemplates
const FIXED_CREATED_AT = '2026-01-01T00:00:00.000Z'

const listeners = new Set<Listener>()
let templates: DocumentTemplate[] = []

function emit() {
  listeners.forEach((listener) => listener())
}

export function subscribeDocumentTemplates(listener: Listener) {
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

function asPrintField(value: unknown): PrintField {
  if (typeof value === 'string' && (PRINT_FIELDS as readonly string[]).includes(value)) {
    return value as PrintField
  }
  return 'name'
}

function normalizeColumn(value: unknown, index: number): TemplateColumn | undefined {
  if (!isRecord(value)) return undefined
  const label = typeof value.label === 'string' ? value.label.trim() : ''
  if (!label && !value.sublabel) {
    return {
      id: typeof value.id === 'string' && value.id.trim() ? value.id.trim() : `col-${index}`,
      label: '',
      field: asPrintField(value.field),
    }
  }
  return {
    id:
      typeof value.id === 'string' && value.id.trim()
        ? value.id.trim()
        : `col-${index}`,
    label,
    sublabel:
      typeof value.sublabel === 'string' && value.sublabel.trim()
        ? value.sublabel.trim()
        : undefined,
    field: asPrintField(value.field),
    width:
      typeof value.width === 'string' && value.width.trim()
        ? value.width.trim()
        : undefined,
    span: typeof value.span === 'number' && value.span > 1 ? value.span : undefined,
  }
}

function normalizeHeaderRows(value: unknown): TemplateColumn[][] {
  if (!Array.isArray(value)) return embassyHeaderRows()
  const rows = value
    .filter(Array.isArray)
    .map((row) =>
      row
        .map((cell, index) => normalizeColumn(cell, index))
        .filter((cell): cell is TemplateColumn => cell != null),
    )
    .filter((row) => row.length > 0)
  return rows.length > 0 ? rows : embassyHeaderRows()
}

function normalizeStamps(value: unknown): TemplateStamp[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => {
      if (!isRecord(item)) return undefined
      const title = typeof item.title === 'string' ? item.title.trim() : ''
      if (!title) return undefined
      return {
        title,
        caption: typeof item.caption === 'string' ? item.caption.trim() : '',
      }
    })
    .filter((item): item is TemplateStamp => item != null)
}

function normalizeGroup(value: unknown): DocumentTemplateGroup {
  if (
    typeof value === 'string' &&
    DOCUMENT_TEMPLATE_GROUPS.includes(value as DocumentTemplateGroup)
  ) {
    return value as DocumentTemplateGroup
  }
  return 'Embassy'
}

function normalizeLayout(value: unknown): DocumentTemplateLayout {
  return value === 'letter' ? 'letter' : 'table'
}

function normalizeTemplate(value: unknown): DocumentTemplate | undefined {
  if (!isRecord(value)) return undefined
  const id = typeof value.id === 'string' ? value.id.trim() : ''
  const tenantId =
    typeof value.tenantId === 'string' ? value.tenantId.trim() : ''
  const name = typeof value.name === 'string' ? value.name.trim() : ''
  if (!id || !tenantId || !name) return undefined
  const createdAt =
    typeof value.createdAt === 'string' && value.createdAt
      ? value.createdAt
      : FIXED_CREATED_AT
  const layout = normalizeLayout(value.layout)
  return {
    id,
    tenantId,
    name,
    group: normalizeGroup(value.group),
    format: normalizeFormat(value.format, name),
    layout,
    direction: value.direction === 'ltr' ? 'ltr' : 'rtl',
    title: typeof value.title === 'string' ? value.title.trim() : name,
    licenseNo: typeof value.licenseNo === 'string' ? value.licenseNo.trim() : '',
    country: typeof value.country === 'string' ? value.country.trim() : '',
    declaration:
      typeof value.declaration === 'string' ? value.declaration.trim() : '',
    headerRows: layout === 'table' ? normalizeHeaderRows(value.headerRows) : [],
    stamps: normalizeStamps(value.stamps),
    letterIntro:
      typeof value.letterIntro === 'string' ? value.letterIntro.trim() : '',
    letterItems: Array.isArray(value.letterItems)
      ? value.letterItems
          .filter((item): item is string => typeof item === 'string')
          .map((item) => item.trim())
          .filter(Boolean)
      : [],
    createdAt,
    updatedAt:
      typeof value.updatedAt === 'string' && value.updatedAt
        ? value.updatedAt
        : createdAt,
  }
}

function normalizeFormat(value: unknown, name: string): PrintFormat {
  if (
    typeof value === 'string' &&
    (PRINT_FORMATS as readonly string[]).includes(value)
  ) {
    return value as PrintFormat
  }
  const byName: Record<string, PrintFormat> = {
    'embassy list': 'embassy-list',
    'visa cancel list': 'visa-cancel',
    'mofa barcode': 'mofa',
    'putup list': 'putup',
    'new putup list': 'new-putup',
    notesheet: 'notesheet-male',
    'notesheet (female)': 'notesheet-female',
    'office forwarding': 'office-forwarding',
    'agency undertaking': 'undertaking',
  }
  return byName[name.toLowerCase()] ?? 'embassy-list'
}

function seedForTenant(tenantId: string, prefix: string): DocumentTemplate[] {
  const base = {
    tenantId,
    createdAt: FIXED_CREATED_AT,
    updatedAt: FIXED_CREATED_AT,
  }
  return [
    {
      ...base,
      id: `DOC-${prefix}0001`,
      name: 'Embassy List',
      group: 'Embassy',
      format: 'embassy-list',
      layout: 'table',
      direction: 'rtl',
      title: 'بيان بالجوازات المقدمة',
      licenseNo: '',
      country: '',
      declaration: '',
      headerRows: embassyHeaderRows(),
      stamps: embassyStamps(),
      letterIntro: '',
      letterItems: [],
    },
    {
      ...base,
      id: `DOC-${prefix}0002`,
      name: 'Visa Cancel List',
      group: 'Embassy',
      format: 'visa-cancel',
      layout: 'table',
      direction: 'rtl',
      title: 'بيان بالجوازات المقدمة',
      licenseNo: '',
      country: '',
      declaration: '',
      headerRows: embassyHeaderRows(),
      stamps: embassyStamps(),
      letterIntro: '',
      letterItems: [],
    },
    {
      ...base,
      id: `DOC-${prefix}0003`,
      name: 'Putup List',
      group: 'Manpower',
      format: 'putup',
      layout: 'table',
      direction: 'ltr',
      title: 'একক বর্হিগমন ছাড়পত্রের আবেদন ফর্ম',
      licenseNo: '',
      country: 'সৌদি আরব',
      declaration: PUTUP_DECLARATION,
      headerRows: putupHeaderRows(),
      stamps: putupStamps(),
      letterIntro: '',
      letterItems: [],
    },
    {
      ...base,
      id: `DOC-${prefix}0004`,
      name: 'Notesheet',
      group: 'Manpower',
      layout: 'letter',
      direction: 'ltr',
      title: 'নোটশীট',
      licenseNo: '',
      country: 'সৌদি আরব',
      declaration: '',
      headerRows: [],
      stamps: [{ title: 'অনুবাদক', caption: '' }],
      letterIntro:
        'রিক্রুটিং এজেন্সী {{agency}} (লাইসেন্স নম্বরঃ {{license}}) এর ব্যবস্থাপনা পরিচালক সৌদিআরব গামি কর্মীর অনুকুলে একক বহির্গমন ছাড়পত্র গ্রহনের জন্য আবেদনপত্রসহ নিম্নে বর্ণিত কাগজপত্রাদি দাখিল করিয়াছেন।',
      letterItems: [...NOTESHEET_ITEMS],
      format: 'notesheet-male',
    },
    sheet(base, prefix, '0005', {
      name: 'Mofa Barcode',
      group: 'Embassy',
      format: 'mofa',
      direction: 'ltr',
      title: 'MOFA barcode',
    }),
    sheet(base, prefix, '0006', {
      name: 'New Putup List',
      group: 'Manpower',
      format: 'new-putup',
      title: 'একক বহির্গমন ছাড়পত্রের পুটআপসীট ও ডাটাএন্ট্রি ফরম',
      country: 'সৌদি আরব',
    }),
    sheet(base, prefix, '0007', {
      name: 'Notesheet (Female)',
      group: 'Manpower',
      format: 'notesheet-female',
      layout: 'letter',
      title: 'নোটশীট (মহিলা)',
      country: 'সৌদি আরব',
    }),
    sheet(base, prefix, '0008', {
      name: 'Office Forwarding',
      group: 'Manpower',
      format: 'office-forwarding',
      layout: 'letter',
      title: 'Office forwarding',
      country: 'সৌদি আরব',
    }),
    sheet(base, prefix, '0009', {
      name: 'Agency Undertaking',
      group: 'Manpower',
      format: 'undertaking',
      title: 'অঙ্গীকারনামা',
      country: 'সৌদি আরব',
    }),
  ]
}

function sheet(
  base: { tenantId: string; createdAt: string; updatedAt: string },
  prefix: string,
  suffix: string,
  extra: Pick<DocumentTemplate, 'name' | 'group' | 'format'> &
    Partial<DocumentTemplate>,
): DocumentTemplate {
  return {
    ...base,
    id: `DOC-${prefix}${suffix}`,
    layout: 'table',
    direction: 'ltr',
    title: extra.name,
    licenseNo: '',
    country: '',
    declaration: '',
    headerRows: [],
    stamps: [],
    letterIntro: '',
    letterItems: [],
    ...extra,
  }
}

function buildSeeds(): DocumentTemplate[] {
  return [
    ...seedForTenant(TENANT_IDS.full, 'T'),
    ...seedForTenant(TENANT_IDS.manpower, 'M'),
    ...seedForTenant(TENANT_IDS.leisure, 'L'),
  ]
}

const SEED_TEMPLATES = buildSeeds()

function mergeWithSeeds(loaded: DocumentTemplate[]): DocumentTemplate[] {
  if (loaded.length === 0) return SEED_TEMPLATES.map((item) => ({ ...item }))
  const keys = new Set(
    loaded.map((item) => `${item.tenantId}|${item.name.toLowerCase()}`),
  )
  const missing = SEED_TEMPLATES.filter(
    (item) => !keys.has(`${item.tenantId}|${item.name.toLowerCase()}`),
  )
  return [...loaded, ...missing]
}

function loadAll(): DocumentTemplate[] {
  const loaded = loadJsonParsed(STORAGE_KEY, [] as DocumentTemplate[], (value) => {
    if (!Array.isArray(value)) return []
    return value
      .map(normalizeTemplate)
      .filter((item): item is DocumentTemplate => item != null)
  })
  return mergeWithSeeds(loaded)
}

templates = loadAll()

function persist(next: DocumentTemplate[]) {
  saveJson(STORAGE_KEY, next)
}

function reloadFromStorage() {
  templates = loadAll()
  emit()
}

if (typeof window !== 'undefined') {
  window.addEventListener('pd-data-rehydrated', reloadFromStorage)
}

function replaceAll(next: DocumentTemplate[]) {
  templates = next
  persist(templates)
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
  return `DOC-T${String(next).padStart(4, '0')}`
}

export function listDocumentTemplates(
  forTenantId = tenantId(),
): DocumentTemplate[] {
  return templates.filter((item) => item.tenantId === forTenantId)
}

export function getDocumentTemplateById(
  id: string,
): DocumentTemplate | undefined {
  const value = id.trim()
  if (!value) return undefined
  return templates.find(
    (item) => item.id === value && item.tenantId === tenantId(),
  )
}

export function validateDocumentTemplateName(
  name: string,
  forTenantId = tenantId(),
  exceptId?: string,
): string | undefined {
  const trimmed = name.trim()
  if (trimmed.length < 2) return 'Give the template a name.'
  if (trimmed.length > 60) return 'Keep the name under 60 characters.'
  const duplicate = listDocumentTemplates(forTenantId).find(
    (item) =>
      item.id !== exceptId && item.name.toLowerCase() === trimmed.toLowerCase(),
  )
  if (duplicate) return 'You already have a template with that name.'
  return undefined
}

function fromDraft(draft: DocumentTemplateDraft, current?: DocumentTemplate): Omit<
  DocumentTemplate,
  'id' | 'tenantId' | 'createdAt'
> {
  return {
    name: draft.name.trim(),
    group: draft.group,
    format: draft.format ?? current?.format ?? 'embassy-list',
    layout: draft.layout,
    direction: draft.direction,
    title: draft.title.trim() || draft.name.trim(),
    licenseNo: draft.licenseNo.trim(),
    country: draft.country?.trim() ?? '',
    declaration: draft.declaration?.trim() ?? '',
    headerRows:
      draft.layout === 'table'
        ? draft.headerRows.length > 0
          ? draft.headerRows
          : embassyHeaderRows()
        : [],
    stamps: draft.stamps ?? current?.stamps ?? [],
    letterIntro: draft.letterIntro?.trim() ?? '',
    letterItems: draft.letterItems?.map((item) => item.trim()).filter(Boolean) ?? [],
    updatedAt: new Date().toISOString(),
  }
}

export function createDocumentTemplate(
  draft: DocumentTemplateDraft,
): DocumentTemplate {
  const name = draft.name.trim()
  const error = validateDocumentTemplateName(name)
  if (error) throw new Error(error)
  const now = new Date().toISOString()
  const created: DocumentTemplate = {
    id: nextId(templates.map((item) => item.id)),
    tenantId: tenantId(),
    createdAt: now,
    ...fromDraft(draft),
    updatedAt: now,
  }
  replaceAll([created, ...templates])
  return created
}

export function updateDocumentTemplate(
  id: string,
  draft: DocumentTemplateDraft,
): DocumentTemplate | undefined {
  const current = templates.find(
    (item) => item.id === id && item.tenantId === tenantId(),
  )
  if (!current) return undefined
  const name = draft.name.trim()
  const error = validateDocumentTemplateName(name, tenantId(), id)
  if (error) throw new Error(error)
  let updated: DocumentTemplate | undefined
  replaceAll(
    templates.map((item) => {
      if (item.id !== id || item.tenantId !== tenantId()) return item
      updated = {
        ...item,
        ...fromDraft(draft, item),
      }
      return updated
    }),
  )
  return updated
}

export function deleteDocumentTemplate(id: string): boolean {
  const exists = templates.some(
    (item) => item.id === id && item.tenantId === tenantId(),
  )
  if (!exists) return false
  replaceAll(
    templates.filter((item) => !(item.id === id && item.tenantId === tenantId())),
  )
  return true
}

export function resetDocumentTemplates() {
  removeJson(STORAGE_KEY)
  templates = SEED_TEMPLATES.map((item) => ({ ...item }))
  emit()
}

export function useDocumentTemplates(): DocumentTemplate[] {
  const { session } = useAuth()
  const all = useSyncExternalStore(
    subscribeDocumentTemplates,
    getSnapshot,
    getSnapshot,
  )
  const activeId = session?.tenantId ?? DEFAULT_TENANT_ID
  return useMemo(
    () => all.filter((item) => item.tenantId === activeId),
    [all, activeId],
  )
}
