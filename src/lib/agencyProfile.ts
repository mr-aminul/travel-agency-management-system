import { DATA_KEYS } from '@/lib/data/keys'
import { loadJsonParsed, saveJson } from '@/lib/data/jsonStore'
import { DEFAULT_TENANT_ID, TENANT_IDS } from '@/types/tenant'

export interface AgencyProfile {
  businessName: string
  address: string
  mobile: string
  website: string
  /** Data URL for the agency logo / profile picture, if set. */
  profilePicture: string | null
}

export const AGENCY_PROFILE_KEY = 'app-agency-profile'
export const AGENCY_PROFILE_EVENT = 'agency-profile-change'

export const DEFAULT_BRAND_NAME = 'OneTrack'
export const DEFAULT_BRAND_SUBTITLE = 'Travel Management System'
export const POWERED_BY_SUBTITLE = 'powered by OneTrack'

export const DEFAULT_AGENCY_PROFILE: AgencyProfile = {
  businessName: '',
  address: '',
  mobile: '',
  website: '',
  profilePicture: null,
}

export const TENANT_DEFAULT_PROFILES: Record<string, AgencyProfile> = {
  [TENANT_IDS.leisure]: {
    businessName: 'Coastal Leisure',
    address: 'House 24, Road 11, Block E, Banani, Dhaka 1213',
    mobile: '01713 882 190',
    website: 'https://www.coastalleisure.com',
    profilePicture: null,
  },
  [TENANT_IDS.manpower]: {
    businessName: 'Horizon Manpower',
    address: 'Suite 5B, 88 Motijheel Commercial Area, Dhaka 1000',
    mobile: '01816 445 773',
    website: 'https://www.horizonmanpower.com',
    profilePicture: null,
  },
  [TENANT_IDS.full]: {
    businessName: 'OneTrack Demo',
    address: 'Level 4, Plot 11, Road 17, Gulshan 1, Dhaka 1212',
    mobile: '01670 221 884',
    website: 'https://www.onetrack.app',
    profilePicture: null,
  },
}

export function agencyProfileStorageKey(tenantId: string): string {
  return `${AGENCY_PROFILE_KEY}:${tenantId}`
}

export function defaultProfileForTenant(tenantId: string): AgencyProfile {
  const seeded = TENANT_DEFAULT_PROFILES[tenantId]
  return seeded ? { ...seeded } : { ...DEFAULT_AGENCY_PROFILE }
}

function withTenantDefaults(
  profile: AgencyProfile,
  tenantId: string,
): AgencyProfile {
  const defaults = defaultProfileForTenant(tenantId)
  return {
    businessName: profile.businessName || defaults.businessName,
    address: profile.address || defaults.address,
    mobile: profile.mobile || defaults.mobile,
    website: profile.website || defaults.website,
    profilePicture: profile.profilePicture,
  }
}

function readAllProfiles(): Record<string, AgencyProfile> {
  return loadJsonParsed(
    DATA_KEYS.agencyProfiles,
    {} as Record<string, AgencyProfile>,
    (value) => {
      if (!isRecord(value)) return {}
      const next: Record<string, AgencyProfile> = {}
      for (const [id, profile] of Object.entries(value)) {
        next[id] = normalizeAgencyProfile(profile)
      }
      return next
    },
  )
}

function writeAllProfiles(map: Record<string, AgencyProfile>) {
  saveJson(DATA_KEYS.agencyProfiles, map)
}

function migrateLegacyProfile(tenantId: string): AgencyProfile | undefined {
  try {
    const map = readAllProfiles()
    if (map[tenantId]) return map[tenantId]

    const scoped = localStorage.getItem(agencyProfileStorageKey(tenantId))
    const legacy =
      tenantId === DEFAULT_TENANT_ID
        ? localStorage.getItem(AGENCY_PROFILE_KEY)
        : null
    const raw = scoped || legacy
    if (!raw) return undefined
    const profile = normalizeAgencyProfile(JSON.parse(raw) as unknown)
    writeAllProfiles({ ...map, [tenantId]: profile })
    localStorage.removeItem(agencyProfileStorageKey(tenantId))
    if (legacy) localStorage.removeItem(AGENCY_PROFILE_KEY)
    return profile
  } catch {
    return undefined
  }
}

/** Keep profile pictures small enough for localStorage. */
const PROFILE_PICTURE_MAX_EDGE = 256
const PROFILE_PICTURE_QUALITY = 0.82
const PROFILE_PICTURE_MAX_CHARS = 180_000

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function asProfilePicture(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed.startsWith('data:image/')) return null
  if (trimmed.length > PROFILE_PICTURE_MAX_CHARS) return null
  return trimmed
}

export function normalizeAgencyProfile(value: unknown): AgencyProfile {
  if (!isRecord(value)) return { ...DEFAULT_AGENCY_PROFILE }
  return {
    businessName: asTrimmedString(value.businessName),
    address: asTrimmedString(value.address),
    mobile: asTrimmedString(value.mobile),
    website: asTrimmedString(value.website),
    profilePicture: asProfilePicture(value.profilePicture),
  }
}

export function readAgencyProfile(
  tenantId: string = DEFAULT_TENANT_ID,
): AgencyProfile {
  const migrated = migrateLegacyProfile(tenantId)
  const stored = migrated ?? readAllProfiles()[tenantId]
  if (!stored) return defaultProfileForTenant(tenantId)
  return withTenantDefaults(stored, tenantId)
}

function emitAgencyProfileChange(profile: AgencyProfile, tenantId: string) {
  window.dispatchEvent(
    new CustomEvent<AgencyProfile>(AGENCY_PROFILE_EVENT, {
      detail: profile,
    }),
  )
  window.dispatchEvent(
    new CustomEvent<string>('agency-profile-tenant', { detail: tenantId }),
  )
}

export function saveAgencyProfile(
  profile: AgencyProfile,
  tenantId: string = DEFAULT_TENANT_ID,
): AgencyProfile {
  const next = normalizeAgencyProfile(profile)
  writeAllProfiles({ ...readAllProfiles(), [tenantId]: next })
  emitAgencyProfileChange(next, tenantId)
  return next
}

/**
 * Seed / fill Business name from the agency (tenant) name on onboard.
 * Does not overwrite a business name the user already saved.
 */
export function seedAgencyProfileBusinessName(
  tenantId: string,
  businessName: string,
): AgencyProfile {
  const name = businessName.trim()
  const current = readAgencyProfile(tenantId)
  if (!name || current.businessName.trim()) return current
  return saveAgencyProfile({ ...current, businessName: name }, tenantId)
}

/** Prefer saved Business name; otherwise use the agency/tenant name. */
export function withBusinessNameFallback(
  profile: AgencyProfile,
  fallbackName?: string,
): AgencyProfile {
  if (profile.businessName.trim()) return profile
  const fallback = fallbackName?.trim()
  if (!fallback) return profile
  return { ...profile, businessName: fallback }
}

export function clearAgencyProfilePicture(
  profile: AgencyProfile,
  tenantId: string = DEFAULT_TENANT_ID,
): AgencyProfile {
  return saveAgencyProfile({ ...profile, profilePicture: null }, tenantId)
}

export interface ResolvedBrand {
  name: string
  subtitle: string
  logoUrl?: string
  /** True when the logo is an agency upload rather than the product mark. */
  isCustomLogo: boolean
  /** True when a custom business name is driving the sidebar title. */
  hasCustomName: boolean
}

export function resolveBrandDisplay(
  profile: AgencyProfile,
  defaultLogoUrl?: string,
  fallbackName?: string,
): ResolvedBrand {
  const businessName =
    profile.businessName.trim() || fallbackName?.trim() || ''
  const hasCustomName = businessName.length > 0
  const isCustomLogo = Boolean(profile.profilePicture)

  return {
    name: hasCustomName ? businessName : DEFAULT_BRAND_NAME,
    subtitle: hasCustomName ? POWERED_BY_SUBTITLE : DEFAULT_BRAND_SUBTITLE,
    logoUrl: profile.profilePicture ?? defaultLogoUrl,
    isCustomLogo,
    hasCustomName,
  }
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read that image.'))
    }
    image.src = url
  })
}

/** Resize and compress an image file into a JPEG data URL for local storage. */
export async function fileToProfilePictureDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose an image file.')
  }

  const image = await loadImage(file)
  const longestEdge = Math.max(image.naturalWidth, image.naturalHeight)
  const scale =
    longestEdge > PROFILE_PICTURE_MAX_EDGE
      ? PROFILE_PICTURE_MAX_EDGE / longestEdge
      : 1
  const width = Math.max(1, Math.round(image.naturalWidth * scale))
  const height = Math.max(1, Math.round(image.naturalHeight * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Could not process that image.')

  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, width, height)
  context.drawImage(image, 0, 0, width, height)

  const dataUrl = canvas.toDataURL('image/jpeg', PROFILE_PICTURE_QUALITY)
  if (dataUrl.length > PROFILE_PICTURE_MAX_CHARS) {
    throw new Error('That image is too large. Try a smaller photo.')
  }
  return dataUrl
}
