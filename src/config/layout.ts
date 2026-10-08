import {
  Banknote,
  BarChart3,
  CalendarClock,
  CircleHelp,
  Component,
  FileText,
  Handshake,
  Home,
  IdCard,
  Kanban,
  LayoutDashboard,
  ListChecks,
  Settings,
  Shield,
  Trash2,
  User,
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
    { path: '/service-board', label: 'Service Board', icon: Kanban },
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
      path: '/reports',
      label: 'Reports',
      icon: BarChart3,
      moduleId: 'finance',
    },
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
    { path: '/help', label: 'Help', icon: CircleHelp },
    settingsNavItem,
  ],
}

/** Pages available in global search (nav + account pages for now). */
export const searchablePages: NavItem[] = [
  ...flattenNavItems(layoutConfig.navItems),
  profileNavItem,
]
