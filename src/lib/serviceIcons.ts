import type { LucideIcon } from 'lucide-react'
import {
  Briefcase,
  Bus,
  Camera,
  Car,
  Compass,
  FileCheck,
  Globe,
  GraduationCap,
  Hotel,
  IdCard,
  Luggage,
  Map,
  MoonStar,
  Plane,
  Ship,
  Stamp,
  Stethoscope,
  Ticket,
  TrainFront,
  TreePalm,
} from 'lucide-react'
import { isBuiltinService, type BuiltinServiceType } from '@/types/case'
import { getServiceIconOverride } from '@/lib/serviceIconOverridesStore'

/** Stable ids for the curated travel catalog (~20). */
export type ServiceIconId =
  | 'plane'
  | 'hotel'
  | 'luggage'
  | 'palm'
  | 'graduation'
  | 'briefcase'
  | 'moon'
  | 'stethoscope'
  | 'stamp'
  | 'car'
  | 'ship'
  | 'map'
  | 'compass'
  | 'globe'
  | 'ticket'
  | 'id-card'
  | 'camera'
  | 'bus'
  | 'train'
  | 'file-check'

export type ServiceIconOption = {
  id: ServiceIconId
  label: string
  icon: LucideIcon
}

export const SERVICE_ICON_OPTIONS: ServiceIconOption[] = [
  { id: 'plane', label: 'Flight', icon: Plane },
  { id: 'hotel', label: 'Hotel', icon: Hotel },
  { id: 'luggage', label: 'Luggage', icon: Luggage },
  { id: 'palm', label: 'Tourism', icon: TreePalm },
  { id: 'graduation', label: 'Student', icon: GraduationCap },
  { id: 'briefcase', label: 'Work', icon: Briefcase },
  { id: 'moon', label: 'Hajj / Umrah', icon: MoonStar },
  { id: 'stethoscope', label: 'Medical', icon: Stethoscope },
  { id: 'stamp', label: 'Visa', icon: Stamp },
  { id: 'car', label: 'Transfer', icon: Car },
  { id: 'ship', label: 'Cruise', icon: Ship },
  { id: 'map', label: 'Itinerary', icon: Map },
  { id: 'compass', label: 'Explore', icon: Compass },
  { id: 'globe', label: 'Worldwide', icon: Globe },
  { id: 'ticket', label: 'Ticket', icon: Ticket },
  { id: 'id-card', label: 'Passport', icon: IdCard },
  { id: 'camera', label: 'Sightseeing', icon: Camera },
  { id: 'bus', label: 'Coach', icon: Bus },
  { id: 'train', label: 'Rail', icon: TrainFront },
  { id: 'file-check', label: 'Documents', icon: FileCheck },
]

const ICON_BY_ID = Object.fromEntries(
  SERVICE_ICON_OPTIONS.map((option) => [option.id, option.icon]),
) as Record<ServiceIconId, LucideIcon>

const BUILTIN_SERVICE_ICONS: Record<BuiltinServiceType, ServiceIconId> = {
  'Tourist Visa': 'palm',
  'Student Visa': 'graduation',
  'Work Permit Visa': 'briefcase',
  'Hajj/Umrah Visa': 'moon',
  'Medical Visa': 'stethoscope',
  'Air Ticket': 'plane',
  'Hotel Booking': 'hotel',
  'Tour Package': 'luggage',
}

export function isServiceIconId(value: string): value is ServiceIconId {
  return value in ICON_BY_ID
}

export function iconFromId(id: ServiceIconId): LucideIcon {
  return ICON_BY_ID[id]
}

function defaultIconIdFromLabel(service: string): ServiceIconId {
  const key = service.toLowerCase()
  if (key.includes('hajj') || key.includes('umrah')) return 'moon'
  if (key.includes('medical') || key.includes('hospital')) return 'stethoscope'
  if (key.includes('student') || key.includes('education')) return 'graduation'
  if (key.includes('hotel') || key.includes('stay')) return 'hotel'
  if (key.includes('ticket') || key.includes('flight') || key.includes('air')) {
    return 'plane'
  }
  if (key.includes('tourist') || key.includes('travel')) return 'palm'
  if (key.includes('package') || key.includes('tour')) return 'luggage'
  if (key.includes('work') || key.includes('permit') || key.includes('job')) {
    return 'briefcase'
  }
  if (key.includes('visa')) return 'stamp'
  if (key.includes('transfer') || key.includes('taxi') || key.includes('car')) {
    return 'car'
  }
  if (key.includes('cruise') || key.includes('ship') || key.includes('ferry')) {
    return 'ship'
  }
  if (key.includes('train') || key.includes('rail')) return 'train'
  if (key.includes('bus') || key.includes('coach')) return 'bus'
  return 'briefcase'
}

/** Resolved default when the user has not picked an icon. */
export function defaultIconIdForService(service: string): ServiceIconId {
  if (isBuiltinService(service)) return BUILTIN_SERVICE_ICONS[service]
  return defaultIconIdFromLabel(service)
}

/** Explicit selection if set; otherwise undefined (UI shows default). */
export function selectedIconIdForService(
  service: string,
  forTenantId?: string,
): ServiceIconId | undefined {
  const override = getServiceIconOverride(service, forTenantId)
  return override && isServiceIconId(override) ? override : undefined
}

export function resolveIconIdForService(
  service: string,
  forTenantId?: string,
): ServiceIconId {
  return (
    selectedIconIdForService(service, forTenantId) ??
    defaultIconIdForService(service)
  )
}

export function iconForService(
  service: string,
  forTenantId?: string,
): LucideIcon {
  return iconFromId(resolveIconIdForService(service, forTenantId))
}
