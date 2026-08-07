import type { LucideIcon } from 'lucide-react'

export interface NavItem {
  path: string
  label: string
  icon?: LucideIcon
  end?: boolean
  children?: NavItem[]
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
