import {
  Activity,
  Banknote,
  BarChart3,
  Building2,
  CalendarClock,
  Component,
  FileText,
  ClipboardCheck,
  Handshake,
  Home,
  IdCard,
  Inbox,
  LayoutDashboard,
  ListChecks,
  Settings,
  CreditCard,
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

export const trashNavItem: NavItem = {
  path: '/trash',
  label: 'Trash',
  icon: Trash2,
}

export const dashboardNavItem: NavItem = {
  path: '/dashboard',
  label: 'Dashboard',
  icon: LayoutDashboard,
  agencyOnly: true,
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
    { path: '/clients', label: 'Clients', icon: Users, section: 'Work' },
    {
      path: '/services',
      label: 'Services',
      icon: ListChecks,
      section: 'Work',
    },
    {
      path: '/documents',
      label: 'Documents',
      icon: FileText,
      moduleId: 'documents',
      section: 'Work',
    },
    {
      path: '/sub-agents',
      label: 'Sub Agents',
      icon: Handshake,
      moduleId: 'subAgents',
      agencyOnly: true,
      section: 'Network',
      children: [
        {
          path: '/sub-agents',
          label: 'Directory',
          icon: Handshake,
          moduleId: 'subAgents',
          agencyOnly: true,
          end: true,
        },
        {
          path: '/approvals',
          label: 'Approvals',
          icon: ClipboardCheck,
          moduleId: 'subAgents',
          agencyOnly: true,
        },
      ],
    },
    {
      path: '/my-submissions',
      label: 'My submissions',
      icon: Inbox,
      subAgentOnly: true,
      section: 'Network',
    },
    {
      path: '/payments',
      label: 'Payments',
      icon: Wallet,
      moduleId: 'finance',
      section: 'Money',
    },
    {
      path: '/reports',
      label: 'Reports',
      icon: BarChart3,
      moduleId: 'finance',
      agencyOnly: true,
      section: 'Money',
    },
    {
      path: '/hr',
      label: 'HR',
      icon: UsersRound,
      moduleId: 'hr',
      agencyOnly: true,
      section: 'Team',
      children: [
        {
          path: '/hr/employees',
          label: 'Employees',
          icon: User,
          moduleId: 'hr',
          agencyOnly: true,
        },
        {
          path: '/hr/attendance',
          label: 'Attendance & Leave',
          icon: CalendarClock,
          moduleId: 'hr',
          agencyOnly: true,
        },
        {
          path: '/hr/payroll',
          label: 'Payroll',
          icon: Banknote,
          moduleId: 'hr',
          agencyOnly: true,
        },
      ],
    },
    {
      path: '/admin',
      label: 'Platform',
      icon: LayoutDashboard,
      adminOnly: true,
      end: true,
      section: 'Admin',
    },
    {
      path: '/admin/agencies',
      label: 'Agencies',
      icon: Building2,
      adminOnly: true,
      section: 'Admin',
    },
    {
      path: '/admin/people',
      label: 'Users',
      icon: Users,
      adminOnly: true,
      section: 'Admin',
    },
    {
      path: '/admin/activity',
      label: 'Activity',
      icon: Activity,
      adminOnly: true,
      section: 'Admin',
    },
    {
      path: '/admin/plans',
      label: 'Plans',
      icon: CreditCard,
      adminOnly: true,
      section: 'Admin',
    },
    {
      path: '/admin/admins',
      label: 'Admins',
      icon: Shield,
      adminOnly: true,
      section: 'Admin',
    },
  ],
}

/** Leaf nav pages for search — skips expandable group shells. */
function searchableNavLeaves(items: NavItem[]): NavItem[] {
  return items.flatMap((item) =>
    item.children?.length
      ? flattenNavItems(item.children)
      : [item],
  )
}

/** Pages available in global search (nav + account/utility pages). */
export const searchablePages: NavItem[] = [
  ...searchableNavLeaves(layoutConfig.navItems),
  dashboardNavItem,
  profileNavItem,
  settingsNavItem,
  trashNavItem,
]
