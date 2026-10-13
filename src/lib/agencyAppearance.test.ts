import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  DEFAULT_AGENCY_APPEARANCE,
  normalizeAgencyAppearance,
  readAgencyAppearance,
  saveAgencyAppearance,
  syncActiveAgencyAppearance,
} from '@/lib/agencyAppearance'
import {
  APPEARANCE_KEY,
  DEFAULT_THEME_COLOR,
  THEME_COLOR_KEY,
  THEME_MODE_KEY,
} from '@/lib/brand'
import { DATA_KEYS, resetDataBackend } from '@/lib/data'
import { SIDEBAR_MODE_KEY } from '@/lib/sidebarPrefs'
import { TENANT_IDS } from '@/types/tenant'

describe('agencyAppearance', () => {
  beforeEach(() => {
    resetDataBackend()
    localStorage.clear()
    document.documentElement.classList.remove('dark')
    document.documentElement.style.removeProperty('--color-theme')
  })

  afterEach(() => {
    resetDataBackend()
    localStorage.clear()
    document.documentElement.classList.remove('dark')
    document.documentElement.style.removeProperty('--color-theme')
  })

  it('normalizes invalid payloads to defaults', () => {
    expect(normalizeAgencyAppearance(null)).toEqual(DEFAULT_AGENCY_APPEARANCE)
    expect(normalizeAgencyAppearance({ appearance: 'neon' })).toEqual(
      DEFAULT_AGENCY_APPEARANCE,
    )
  })

  it('persists appearance for a tenant and mirrors localStorage', () => {
    const saved = saveAgencyAppearance(
      {
        appearance: 'dark',
        themeMode: 'custom',
        themeColor: '#112233',
        sidebarMode: 'manual',
      },
      TENANT_IDS.demo,
    )

    expect(saved.appearance).toBe('dark')
    expect(readAgencyAppearance(TENANT_IDS.demo)).toEqual(saved)
    expect(localStorage.getItem(APPEARANCE_KEY)).toBe('dark')
    expect(localStorage.getItem(THEME_MODE_KEY)).toBe('custom')
    expect(localStorage.getItem(THEME_COLOR_KEY)).toBe('#112233')
    expect(localStorage.getItem(SIDEBAR_MODE_KEY)).toBe('manual')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(localStorage.getItem(DATA_KEYS.agencyAppearance)).toContain(
      TENANT_IDS.demo,
    )
  })

  it('keeps other tenants isolated', () => {
    saveAgencyAppearance(
      { appearance: 'dark', themeColor: '#abcdef', themeMode: 'custom' },
      TENANT_IDS.demo,
    )
    expect(readAgencyAppearance('tenant-other')).toEqual(
      DEFAULT_AGENCY_APPEARANCE,
    )
  })

  it('migrates customized browser prefs into the agency store on sync', () => {
    localStorage.setItem(APPEARANCE_KEY, 'dark')
    localStorage.setItem(THEME_MODE_KEY, 'custom')
    localStorage.setItem(THEME_COLOR_KEY, '#445566')

    const migrated = syncActiveAgencyAppearance(TENANT_IDS.demo)
    expect(migrated.appearance).toBe('dark')
    expect(migrated.themeMode).toBe('custom')
    expect(migrated.themeColor).toBe('#445566')

    localStorage.setItem(APPEARANCE_KEY, 'light')
    expect(readAgencyAppearance(TENANT_IDS.demo).appearance).toBe('dark')
  })

  it('does not migrate untouched browser defaults', () => {
    syncActiveAgencyAppearance(TENANT_IDS.demo)
    expect(readAgencyAppearance(TENANT_IDS.demo)).toEqual(
      DEFAULT_AGENCY_APPEARANCE,
    )
    expect(localStorage.getItem(DATA_KEYS.agencyAppearance)).toBeNull()
    expect(DEFAULT_THEME_COLOR).toBe('#0c2d79')
  })
})
