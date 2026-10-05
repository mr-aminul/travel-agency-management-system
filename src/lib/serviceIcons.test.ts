import { afterEach, describe, expect, it } from 'vitest'
import {
  Briefcase,
  Camera,
  GraduationCap,
  Hotel,
  Luggage,
  MoonStar,
  Plane,
  Stamp,
  Stethoscope,
  TreePalm,
} from 'lucide-react'
import { DEMO_USER, clearSession, writeSession } from '@/lib/authApi'
import {
  resetServiceIconOverrides,
  setServiceIconOverride,
} from '@/lib/serviceIconOverridesStore'
import {
  SERVICE_ICON_OPTIONS,
  defaultIconIdForService,
  iconForService,
  resolveIconIdForService,
  selectedIconIdForService,
} from '@/lib/serviceIcons'
import { BUILTIN_SERVICE_TYPES } from '@/types/case'
import { TENANT_IDS } from '@/types/tenant'

afterEach(() => {
  clearSession()
  resetServiceIconOverrides()
})

function asFull() {
  writeSession({
    user: DEMO_USER,
    tenantId: TENANT_IDS.full,
    signedInAt: '2026-01-01T00:00:00.000Z',
  })
}

describe('service icon catalog', () => {
  it('keeps a focused travel set of 20 icons', () => {
    expect(SERVICE_ICON_OPTIONS).toHaveLength(20)
    expect(new Set(SERVICE_ICON_OPTIONS.map((option) => option.id)).size).toBe(
      20,
    )
  })
})

describe('iconForService', () => {
  it('gives each built-in catalog line its own icon', () => {
    const icons = BUILTIN_SERVICE_TYPES.map((service) => iconForService(service))
    expect(new Set(icons).size).toBe(BUILTIN_SERVICE_TYPES.length)
    expect(iconForService('Tourist Visa')).toBe(TreePalm)
    expect(iconForService('Student Visa')).toBe(GraduationCap)
    expect(iconForService('Work Permit Visa')).toBe(Briefcase)
    expect(iconForService('Hajj/Umrah Visa')).toBe(MoonStar)
    expect(iconForService('Medical Visa')).toBe(Stethoscope)
    expect(iconForService('Air Ticket')).toBe(Plane)
    expect(iconForService('Hotel Booking')).toBe(Hotel)
    expect(iconForService('Tour Package')).toBe(Luggage)
  })

  it('guesses custom catalog names from keywords', () => {
    expect(iconForService('Umrah Package')).toBe(MoonStar)
    expect(iconForService('Schengen Visa')).toBe(Stamp)
    expect(iconForService('Airport Transfer')).toBe(Plane)
    expect(iconForService('Family Tourist Visa')).toBe(TreePalm)
    expect(iconForService('Other')).toBe(Briefcase)
  })

  it('uses an explicit override when set, otherwise the default', () => {
    asFull()
    expect(selectedIconIdForService('Tourist Visa')).toBeUndefined()
    expect(defaultIconIdForService('Tourist Visa')).toBe('palm')
    expect(resolveIconIdForService('Tourist Visa')).toBe('palm')

    setServiceIconOverride('Tourist Visa', 'camera')
    expect(selectedIconIdForService('Tourist Visa')).toBe('camera')
    expect(iconForService('Tourist Visa')).toBe(Camera)

    setServiceIconOverride('Tourist Visa', null)
    expect(selectedIconIdForService('Tourist Visa')).toBeUndefined()
    expect(iconForService('Tourist Visa')).toBe(TreePalm)
  })
})
