import { describe, expect, it } from 'vitest'
import {
  Briefcase,
  GraduationCap,
  Hotel,
  Luggage,
  MoonStar,
  Plane,
  Stamp,
  Stethoscope,
  TreePalm,
} from 'lucide-react'
import { iconForService } from '@/lib/serviceIcons'
import { BUILTIN_SERVICE_TYPES } from '@/types/case'

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
})
