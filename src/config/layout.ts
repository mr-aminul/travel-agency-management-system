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
  Shield,
  Ticket,
  Users,
  UsersRound,
  Wallet,
} from 'lucide-react'
import type { AppLayoutConfig, NavItem } from '@/layout/types'
import { flattenNavItems } from '@/lib/modules'
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
        { path: '/cases', label: 'All cases', icon: Folder, end: true },
        {
          path: '/cases/manpower',
          label: 'Manpower',
          icon: Briefcase,
          moduleId: 'cases.manpower',
        },
        {
          path: '/cases/student',
          label: 'Student',
          icon: GraduationCap,
          moduleId: 'cases.student',
        },
        {
          path: '/cases/hajj-umrah',
          label: 'Hajj/Umrah',
          icon: Landmark,
          moduleId: 'cases.hajjUmrah',
        },
        {
          path: '/cases/leisure',
          label: 'Leisure',
          icon: Palmtree,
          moduleId: 'cases.leisure',
        },
        {
          path: '/cases/ticketing',
          label: 'Ticketing',
          icon: Ticket,
          moduleId: 'cases.ticketing',
        },
      ],
    },
    { path: '/finance', label: 'Finance', icon: Wallet, moduleId: 'finance' },
    {
      path: '/documents',
      label: 'Documents',
      icon: FileText,
      moduleId: 'documents',
    },
    {
      path: '/reporting',
      label: 'Reporting',
      icon: BarChart3,
      moduleId: 'reporting',
    },
    { path: '/hr', label: 'HR', icon: UsersRound, moduleId: 'hr' },
    {
      path: '/admin/tenants',
      label: 'Businesses',
      icon: Shield,
      adminOnly: true,
    },
    settingsNavItem,
  ],
}

/** Pages available in global search (nav + account pages for now). */
export const searchablePages: NavItem[] = [
  ...flattenNavItems(layoutConfig.navItems),
  profileNavItem,
]
