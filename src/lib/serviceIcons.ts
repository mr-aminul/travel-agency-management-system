import type { LucideIcon } from 'lucide-react'
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
import { isBuiltinService, type BuiltinServiceType } from '@/types/case'

const BUILTIN_SERVICE_ICONS: Record<BuiltinServiceType, LucideIcon> = {
  'Tourist Visa': TreePalm,
  'Student Visa': GraduationCap,
  'Work Permit Visa': Briefcase,
  'Hajj/Umrah Visa': MoonStar,
  'Medical Visa': Stethoscope,
  'Air Ticket': Plane,
  'Hotel Booking': Hotel,
  'Tour Package': Luggage,
}

function iconFromServiceLabel(service: string): LucideIcon {
  const key = service.toLowerCase()
  if (key.includes('hajj') || key.includes('umrah')) return MoonStar
  if (key.includes('medical') || key.includes('hospital')) return Stethoscope
  if (key.includes('student') || key.includes('education')) return GraduationCap
  if (key.includes('hotel') || key.includes('stay')) return Hotel
  if (key.includes('ticket') || key.includes('flight') || key.includes('air')) {
    return Plane
  }
  if (key.includes('tourist') || key.includes('travel')) return TreePalm
  if (key.includes('package') || key.includes('tour')) return Luggage
  if (key.includes('work') || key.includes('permit') || key.includes('job')) {
    return Briefcase
  }
  if (key.includes('visa')) return Stamp
  return Briefcase
}

export function iconForService(service: string): LucideIcon {
  if (isBuiltinService(service)) return BUILTIN_SERVICE_ICONS[service]
  return iconFromServiceLabel(service)
}
