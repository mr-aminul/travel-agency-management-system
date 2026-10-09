import type { LucideIcon } from 'lucide-react'
import type { ModuleId } from '@/types/tenant'

export interface NavItem {
  path: string
  label: string
  icon?: LucideIcon
  end?: boolean
  children?: NavItem[]
  /** When set, the item is hidden unless the tenant has this module. */
  moduleId?: ModuleId
  /** When true, only a platform admin sees this item. */
  adminOnly?: boolean
  /** Red count badge when this nav item needs attention. */
  badgeCount?: number
}

export interface BrandConfig {
  name: string
  subtitle?: string
  icon: LucideIcon
  logoUrl?: string
  /** True when logoUrl is an agency upload rather than the product mark. */
  isCustomLogo?: boolean
  /** True when subtitle should keep mixed case (e.g. "powered by OneTrack"). */
  preserveSubtitleCase?: boolean
}

export interface AppLayoutConfig {
  navItems: NavItem[]
  brand: BrandConfig
}
