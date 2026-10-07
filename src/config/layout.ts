import {
  Banknote,
  CalendarClock,
  Component,
  FileText,
  Handshake,
  Home,
  IdCard,
  LayoutDashboard,
  ListChecks,
  Settings,
  Shield,
  Trash2,
  User,
  Users,
  UsersRound,
  Wallet,
  Workflow,
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
    { path: '/readiness', label: 'Readiness', icon: Workflow },
    { path: '/clients', label: 'Clients', icon: Users },
    {
      path: '/sub-agents',
      label: 'Sub Agents',
      icon: Handshake,
      moduleId: 'subAgents',
    },
    { path: '/services', label: 'Services', icon: ListChecks },
    { path: '/payments', label: 'Payments', icon: Wallet, moduleId: 'finance' },
    {
      path: '/documents',
      label: 'Documents',
      icon: FileText,
      moduleId: 'documents',
    },
    {
      path: '/hr',
      label: 'HR',
      icon: UsersRound,
      moduleId: 'hr',
      children: [
        {
          path: '/hr/employees',
          label: 'Employees',
          icon: User,
          moduleId: 'hr',
        },
        {
          path: '/hr/attendance',
          label: 'Attendance & Leave',
          icon: CalendarClock,
          moduleId: 'hr',
        },
        {
          path: '/hr/payroll',
          label: 'Payroll',
          icon: Banknote,
          moduleId: 'hr',
        },
      ],
    },
    {
      path: '/admin/tenants',
      label: 'Businesses',
      icon: Shield,
      adminOnly: true,
    },
    { path: '/trash', label: 'Trash', icon: Trash2 },
    settingsNavItem,
  ],
}

/** Pages available in global search (nav + account pages for now). */
export const searchablePages: NavItem[] = [
  ...flattenNavItems(layoutConfig.navItems),
  profileNavItem,
]
