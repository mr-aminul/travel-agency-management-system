import { useMemo, useSyncExternalStore } from 'react'
import { getActiveTenantId } from '@/lib/authApi'
import { DATA_KEYS, loadJsonParsed, saveJson } from '@/lib/data'
import { useAuth } from '@/lib/useAuth'
import { DEFAULT_TENANT_ID } from '@/types/tenant'
import type {
  CreateManualLedgerInput,
  LedgerWallet,
  ManualLedgerEntry,
  ManualLedgerKind,
} from '@/types/ledger'
import { LEDGER_WALLETS } from '@/types/ledger'

type Listener = () => void

const STORAGE_KEY = DATA_KEYS.ledgerEntries
const listeners = new Set<Listener>()

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isWallet(value: unknown): value is LedgerWallet {
  return (
    typeof value === 'string' &&
    (LEDGER_WALLETS as string[]).includes(value)
  )
}

function isKind(value: unknown): value is ManualLedgerKind {
  return (
    value === 'supplier' ||
    value === 'expense' ||
    value === 'other_in' ||
    value === 'other_out'
  )
}

function normalizeEntry(value: unknown): ManualLedgerEntry | undefined {
  if (!isRecord(value)) return undefined
  const id = typeof value.id === 'string' ? value.id.trim() : ''
  const tenantId =
    typeof value.tenantId === 'string' ? value.tenantId.trim() : ''
  const direction = value.direction === 'in' || value.direction === 'out'
    ? value.direction
    : null
  const kind = isKind(value.kind) ? value.kind : null
  const wallet = isWallet(value.wallet) ? value.wallet : null
  const amount =
    typeof value.amount === 'number' && Number.isFinite(value.amount)
      ? value.amount
      : Number(value.amount)
  const createdAt =
    typeof value.createdAt === 'string' ? value.createdAt.trim() : ''
  if (!id || !tenantId || !direction || !kind || !wallet || !createdAt) {
    return undefined
  }
  if (!Number.isFinite(amount) || amount <= 0) return undefined
  return {
    id,
    tenantId,
    direction,
    kind,
    amount,
    wallet,
    party:
      typeof value.party === 'string' && value.party.trim()
        ? value.party.trim()
        : undefined,
    note:
      typeof value.note === 'string' && value.note.trim()
        ? value.note.trim()
        : undefined,
    txnId:
      typeof value.txnId === 'string' && value.txnId.trim()
        ? value.txnId.trim()
        : undefined,
    createdAt,
  }
}

function readCreated(): ManualLedgerEntry[] {
  return loadJsonParsed(STORAGE_KEY, [] as ManualLedgerEntry[], (value) => {
    if (!Array.isArray(value)) return []
    return value
      .map(normalizeEntry)
      .filter((item): item is ManualLedgerEntry => item != null)
  })
}

let entries: ManualLedgerEntry[] = readCreated()

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
  return entries
}

function tenantId() {
  return getActiveTenantId() || DEFAULT_TENANT_ID
}

function persist() {
  saveJson(STORAGE_KEY, entries)
}

function reloadFromStorage() {
  entries = readCreated()
  emit()
}

if (typeof window !== 'undefined') {
  window.addEventListener('pd-data-rehydrated', reloadFromStorage)
}

export function useManualLedgerEntries(): ManualLedgerEntry[] {
  const { session } = useAuth()
  const all = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const activeId = session?.tenantId ?? DEFAULT_TENANT_ID
  return useMemo(
    () =>
      all
        .filter((item) => item.tenantId === activeId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [all, activeId],
  )
}

export function getManualLedgerEntries(
  forTenantId = tenantId(),
): ManualLedgerEntry[] {
  return entries
    .filter((item) => item.tenantId === forTenantId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function createManualLedgerEntry(
  input: CreateManualLedgerInput,
): ManualLedgerEntry {
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error('Amount must be greater than zero.')
  }
  if (input.direction === 'in' && input.kind !== 'other_in') {
    throw new Error('Money in must use the other income type.')
  }
  if (
    input.direction === 'out' &&
    input.kind !== 'supplier' &&
    input.kind !== 'expense' &&
    input.kind !== 'other_out'
  ) {
    throw new Error('Money out must be a supplier, expense, or other payout.')
  }

  const created: ManualLedgerEntry = {
    id: `led-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    tenantId: tenantId(),
    direction: input.direction,
    kind: input.kind,
    amount: input.amount,
    wallet: input.wallet,
    party: input.party?.trim() || undefined,
    note: input.note?.trim() || undefined,
    txnId: input.txnId?.trim() || undefined,
    createdAt: input.createdAt?.trim() || new Date().toISOString(),
  }
  entries = [created, ...entries]
  persist()
  emit()
  return created
}

export function deleteManualLedgerEntry(id: string): boolean {
  const before = entries.length
  entries = entries.filter(
    (item) => !(item.id === id && item.tenantId === tenantId()),
  )
  if (entries.length === before) return false
  persist()
  emit()
  return true
}
