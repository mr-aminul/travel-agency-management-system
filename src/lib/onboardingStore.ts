import { useMemo } from 'react'
import { useSyncExternalStore } from 'react'
import { getActiveTenantId } from '@/lib/authApi'
import { DATA_KEYS, loadJsonParsed, removeJson, saveJson } from '@/lib/data'
import { useAuth } from '@/lib/useAuth'
import { DEFAULT_TENANT_ID } from '@/types/tenant'

export type OnboardingState = {
  /** Platform tour dismissed. */
  dismissed?: boolean
  /** Home “complete business profile” nudge dismissed. */
  businessProfileNudgeDismissed?: boolean
}

type OnboardingMap = Record<string, OnboardingState>

type Listener = () => void

const STORAGE_KEY = DATA_KEYS.onboardingState

const listeners = new Set<Listener>()
let map: OnboardingMap = loadAll()

function emit() {
  listeners.forEach((listener) => listener())
}

export function subscribeOnboarding(listener: Listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot() {
  return map
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeState(value: unknown): OnboardingState {
  if (!isRecord(value)) return {}
  return {
    dismissed: value.dismissed === true,
    businessProfileNudgeDismissed:
      value.businessProfileNudgeDismissed === true,
  }
}

function loadAll(): OnboardingMap {
  return loadJsonParsed(STORAGE_KEY, {} as OnboardingMap, (value) => {
    if (!isRecord(value)) return {}
    const next: OnboardingMap = {}
    for (const [tenantId, state] of Object.entries(value)) {
      if (!tenantId.trim()) continue
      next[tenantId] = normalizeState(state)
    }
    return next
  })
}

function persist(next: OnboardingMap) {
  saveJson(STORAGE_KEY, next)
}

function tenantId() {
  return getActiveTenantId() || DEFAULT_TENANT_ID
}

function reloadFromStorage() {
  map = loadAll()
  emit()
}

if (typeof window !== 'undefined') {
  window.addEventListener('pd-data-rehydrated', reloadFromStorage)
}

export function getOnboardingState(forTenantId = tenantId()): OnboardingState {
  return map[forTenantId] ?? {}
}

function writeState(forTenantId: string, state: OnboardingState) {
  map = { ...map, [forTenantId]: state }
  persist(map)
  emit()
}

export function dismissOnboarding(forTenantId = tenantId()): void {
  const current = getOnboardingState(forTenantId)
  writeState(forTenantId, { ...current, dismissed: true })
}

export function restoreOnboarding(forTenantId = tenantId()): void {
  const current = getOnboardingState(forTenantId)
  writeState(forTenantId, { ...current, dismissed: false })
}

export function dismissBusinessProfileNudge(forTenantId = tenantId()): void {
  const current = getOnboardingState(forTenantId)
  writeState(forTenantId, {
    ...current,
    businessProfileNudgeDismissed: true,
  })
}

export function useBusinessProfileNudgeState(): { dismissed: boolean } {
  const { session } = useAuth()
  const all = useSyncExternalStore(subscribeOnboarding, getSnapshot, getSnapshot)
  const activeId = session?.tenantId ?? DEFAULT_TENANT_ID
  return useMemo(() => {
    const state = all[activeId] ?? {}
    return { dismissed: state.businessProfileNudgeDismissed === true }
  }, [all, activeId])
}

export function resetOnboarding() {
  removeJson(STORAGE_KEY)
  map = {}
  emit()
}

export function usePlatformTourState(): { dismissed: boolean } {
  const { session } = useAuth()
  const all = useSyncExternalStore(subscribeOnboarding, getSnapshot, getSnapshot)
  const activeId = session?.tenantId ?? DEFAULT_TENANT_ID
  return useMemo(() => {
    const state = all[activeId] ?? {}
    return { dismissed: state.dismissed === true }
  }, [all, activeId])
}
