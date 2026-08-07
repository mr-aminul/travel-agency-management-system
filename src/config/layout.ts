import {
  BarChart3,
  Briefcase,
  Component,
  FileText,
  Folder,
  GraduationCap,
  Home,
  IdCard,
  Landmark,
  LayoutDashboard,
  Palmtree,
  Settings,
  Ticket,
  Users,
  Wallet,
} from 'lucide-react'
import type { AppLayoutConfig, NavItem } from '@/layout/types'
import { publicUrl } from '@/lib/publicUrl'

export const profileNavItem: NavItem = {
  path: '/profile',
  label: 'My profile',
  icon: IdCard,
}

export const settingsNavItem: NavItem = {
  path: '/settings',
  label: 'Settings',
  icon: Settings,
}

export const layoutConfig: AppLayoutConfig = {
  brand: {
    name: 'OneTrack',
    subtitle: 'Travel Management System',
    icon: Component,
    logoUrl: publicUrl('images/logo.svg'),
  },
  navItems: [
    { path: '/', label: 'Home', icon: Home, end: true },
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/clients', label: 'Clients', icon: Users },
    {
      path: '/cases',
      label: 'Cases',
      icon: Folder,
      children: [
        { path: '/cases/manpower', label: 'Manpower', icon: Briefcase },
        { path: '/cases/student', label: 'Student', icon: GraduationCap },
        { path: '/cases/hajj-umrah', label: 'Hajj/Umrah', icon: Landmark },
        { path: '/cases/leisure', label: 'Leisure', icon: Palmtree },
        { path: '/cases/ticketing', label: 'Ticketing', icon: Ticket },
      ],
    },
    { path: '/finance', label: 'Finance', icon: Wallet },
    { path: '/documents', label: 'Documents', icon: FileText },
    { path: '/reporting', label: 'Reporting', icon: BarChart3 },
    settingsNavItem,
  ],
}

function flattenNavItems(items: NavItem[]): NavItem[] {
  return items.flatMap((item) =>
    item.children?.length ? [item, ...flattenNavItems(item.children)] : [item],
  )
}

/** Pages available in global search (nav + account pages for now). */
export const searchablePages: NavItem[] = [
  ...flattenNavItems(layoutConfig.navItems),
  profileNavItem,
]
