import { describe, expect, it } from 'vitest'
import { Home, User, UsersRound } from 'lucide-react'
import { buildAccessPageColumns } from '@/lib/accessPages'
import { layoutConfig } from '@/config/layout'
import type { NavItem } from '@/layout/types'

describe('buildAccessPageColumns', () => {
  it('keeps leaf page labels as-is', () => {
    const items: NavItem[] = [
      { path: '/', label: 'Home', icon: Home, end: true },
      { path: '/clients', label: 'Clients' },
    ]
    expect(buildAccessPageColumns(items)).toEqual([
      { id: '/', path: '/', label: 'Home' },
      { id: '/clients', path: '/clients', label: 'Clients' },
    ])
  })

  it('prefixes subpages with the parent page name', () => {
    const items: NavItem[] = [
      {
        path: '/hr',
        label: 'HR',
        icon: UsersRound,
        children: [
          { path: '/hr/employees', label: 'Employees', icon: User },
          { path: '/hr/attendance', label: 'Attendance' },
          { path: '/hr/leave', label: 'Leave' },
          { path: '/hr/payroll', label: 'Payroll' },
        ],
      },
    ]
    expect(buildAccessPageColumns(items)).toEqual([
      {
        id: '/hr/employees',
        path: '/hr/employees',
        label: 'HR - Employees',
      },
      {
        id: '/hr/attendance',
        path: '/hr/attendance',
        label: 'HR - Attendance',
      },
      { id: '/hr/leave', path: '/hr/leave', label: 'HR - Leave' },
      { id: '/hr/payroll', path: '/hr/payroll', label: 'HR - Payroll' },
    ])
  })

  it('omits admin-only pages and parent shells from the live nav', () => {
    const columns = buildAccessPageColumns(layoutConfig.navItems)
    const labels = columns.map((column) => column.label)

    expect(labels).toContain('Home')
    expect(labels).toContain('Clients')
    expect(labels).toContain('HR - Employees')
    expect(labels).toContain('HR - Attendance & Leave')
    expect(labels).toContain('HR - Payroll')
    expect(labels).not.toContain('HR')
    expect(labels).not.toContain('Businesses')
    expect(labels).not.toContain('Agencies')
    expect(columns.some((column) => column.path.startsWith('/admin'))).toBe(
      false,
    )
  })
})
