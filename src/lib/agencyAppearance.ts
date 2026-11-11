import { getActiveTenantId } from '@/lib/authApi'
import { isSignedIn } from '@/lib/authApi'
import {
  applyAppearance,
  applyThemeColor,
  applyThemeMode,
  DEFAULT_APPEARANCE,
  DEFAULT_THEME_COLOR,
  DEFAULT_THEME_MODE,
  normalizeThemeColor,
  readAppearance,
  readCustomThemeColor,
  readThemeMode,
  resetBrandThemeToDefault,
  type AppearanceMode,
  type ThemeMode,
} from '@/lib/brand'
import { DATA_KEYS } from '@/lib/data/keys'
import { loadJsonParsed, saveJson } from '@/lib/data/jsonStore'
import {
  applySidebarMode,
  DEFAULT_SIDEBAR_MODE,
  readSidebarMode,
  type SidebarExpandMode,
} from '@/lib/sidebarPrefs'
import { DEFAULT_TENANT_ID } from '@/types/tenant'

/** One-time: clear accidental custom brand colors so the product stays on default blue. */
const FORCE_DEFAULT_THEME_MIGRATION_KEY = 'pd-force-default-theme-v1'

export interface AgencyAppearance {
  appearance: AppearanceMode
  themeMode: ThemeMode
  /** Stored custom accent; used when themeMode is custom. */
  themeColor: string
  sidebarMode: SidebarExpandMode
}

export const AGENCY_APPEARANCE_EVENT = 'agency-appearance-change'

export const DEFAULT_AGENCY_APPEARANCE: AgencyAppearance = {
  appearance: DEFAULT_APPEARANCE,
  themeMode: DEFAULT_THEME_MODE,
  themeColor: DEFAULT_THEME_COLOR,
  sidebarMode: DEFAULT_SIDEBAR_MODE,
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isAppearanceMode(value: unknown): value is AppearanceMode {
  return value === 'light' || value === 'dark' || value === 'system'
}

function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'default' || value === 'custom'
}

function isSidebarMode(value: unknown): value is SidebarExpandMode {
  return value === 'auto' || value === 'manual'
}

export function normalizeAgencyAppearance(value: unknown): AgencyAppearance {
  if (!isRecord(value)) return { ...DEFAULT_AGENCY_APPEARANCE }
  const themeColor =
    typeof value.themeColor === 'string'
      ? normalizeThemeColor(value.themeColor)
      : null
  return {
    appearance: isAppearanceMode(value.appearance)
      ? value.appearance
      : DEFAULT_APPEARANCE,
    themeMode: isThemeMode(value.themeMode)
      ? value.themeMode
      : DEFAULT_THEME_MODE,
    themeColor: themeColor ?? DEFAULT_THEME_COLOR,
    sidebarMode: isSidebarMode(value.sidebarMode)
      ? value.sidebarMode
      : DEFAULT_SIDEBAR_MODE,
  }
}

function readAllAppearances(): Record<string, AgencyAppearance> {
  return loadJsonParsed(
    DATA_KEYS.agencyAppearance,
    {} as Record<string, AgencyAppearance>,
    (value) => {
      if (!isRecord(value)) return {}
      const next: Record<string, AgencyAppearance> = {}
      for (const [id, row] of Object.entries(value)) {
        next[id] = normalizeAgencyAppearance(row)
      }
      return next
    },
  )
}

function writeAllAppearances(map: Record<string, AgencyAppearance>) {
  saveJson(DATA_KEYS.agencyAppearance, map)
}

function appearanceFromLocalBrowser(): AgencyAppearance {
  return normalizeAgencyAppearance({
    appearance: readAppearance(),
    themeMode: readThemeMode(),
    themeColor: readCustomThemeColor(),
    sidebarMode: readSidebarMode(),
  })
}

function isCustomized(settings: AgencyAppearance): boolean {
  return (
    settings.appearance !== DEFAULT_APPEARANCE ||
    settings.themeMode !== DEFAULT_THEME_MODE ||
    settings.themeColor !== DEFAULT_THEME_COLOR ||
    settings.sidebarMode !== DEFAULT_SIDEBAR_MODE
  )
}

/** One-time seed from browser prefs when this agency has no saved row yet. */
function migrateFromLocalBrowser(
  tenantId: string,
): AgencyAppearance | undefined {
  const map = readAllAppearances()
  if (map[tenantId]) return undefined
  const fromBrowser = appearanceFromLocalBrowser()
  if (!isCustomized(fromBrowser)) return undefined
  writeAllAppearances({ ...map, [tenantId]: fromBrowser })
  return fromBrowser
}

function emitAgencyAppearanceChange(
  settings: AgencyAppearance,
  tenantId: string,
) {
  window.dispatchEvent(
    new CustomEvent<AgencyAppearance>(AGENCY_APPEARANCE_EVENT, {
      detail: settings,
    }),
  )
  window.dispatchEvent(
    new CustomEvent<string>('agency-appearance-tenant', { detail: tenantId }),
  )
}

/** Apply agency appearance to the DOM and mirror into localStorage for boot. */
export function applyAgencyAppearance(settings: AgencyAppearance): void {
  const next = normalizeAgencyAppearance(settings)
  applyAppearance(next.appearance)
  if (next.themeMode === 'custom') {
    applyThemeColor(next.themeColor)
  } else {
    applyThemeMode('default')
  }
  applySidebarMode(next.sidebarMode)
}

export function readAgencyAppearance(
  tenantId: string = DEFAULT_TENANT_ID,
): AgencyAppearance {
  return (
    readAllAppearances()[tenantId] ?? { ...DEFAULT_AGENCY_APPEARANCE }
  )
}

export function saveAgencyAppearance(
  patch: Partial<AgencyAppearance>,
  tenantId: string = getActiveTenantId(),
): AgencyAppearance {
  const next = normalizeAgencyAppearance({
    ...readAgencyAppearance(tenantId),
    ...patch,
  })
  writeAllAppearances({ ...readAllAppearances(), [tenantId]: next })
  applyAgencyAppearance(next)
  emitAgencyAppearanceChange(next, tenantId)
  return next
}

/** Re-apply the active agency's saved appearance after login / KV hydrate. */
export function syncActiveAgencyAppearance(
  tenantId: string = getActiveTenantId(),
): AgencyAppearance {
  if (!isSignedIn()) {
    resetBrandThemeToDefault()
    return { ...DEFAULT_AGENCY_APPEARANCE }
  }
  const settings =
    migrateFromLocalBrowser(tenantId) ?? readAgencyAppearance(tenantId)
  applyAgencyAppearance(settings)
  emitAgencyAppearanceChange(settings, tenantId)
  return settings
}

/**
 * Force every saved agency theme back to the product default blue.
 * Custom colors can still be set again from Settings afterward.
 */
export function resetAllAgencyThemesToDefault(): void {
  const map = readAllAppearances()
  let changed = false
  const next: Record<string, AgencyAppearance> = {}
  for (const [id, row] of Object.entries(map)) {
    if (row.themeMode === 'custom' || row.themeColor !== DEFAULT_THEME_COLOR) {
      changed = true
      next[id] = {
        ...row,
        themeMode: 'default',
        themeColor: DEFAULT_THEME_COLOR,
      }
    } else {
      next[id] = row
    }
  }
  if (changed) writeAllAppearances(next)
  resetBrandThemeToDefault()
}

function migrateForceDefaultBrandTheme(): void {
  if (typeof window === 'undefined') return
  try {
    if (localStorage.getItem(FORCE_DEFAULT_THEME_MIGRATION_KEY) === '1') return
    resetAllAgencyThemesToDefault()
    localStorage.setItem(FORCE_DEFAULT_THEME_MIGRATION_KEY, '1')
  } catch {
    /* ignore quota / private mode */
  }
}

let syncInitialized = false

/** Keep the live UI in sync when platform KV rehydrates. */
export function initAgencyAppearanceSync(): void {
  if (typeof window === 'undefined' || syncInitialized) return
  syncInitialized = true
  migrateForceDefaultBrandTheme()
  window.addEventListener('pd-data-rehydrated', () => {
    if (!isSignedIn()) {
      resetBrandThemeToDefault()
      return
    }
    syncActiveAgencyAppearance()
  })
}
