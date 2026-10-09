import { type BadgeVariant } from '@/components/ui'
import {
  Briefcase,
  FileText,
  Handshake,
  Kanban,
  LayoutDashboard,
  ListChecks,
  Settings,
  UserPlus,
  UserRound,
  Users,
} from 'lucide-react'
import { searchablePages } from '@/config/layout'
import { filterNavItems, flattenNavItems, isPathAllowed } from '@/lib/modules'
import type { AuthUser } from '@/lib/authApi'
import {
  deriveClientServiceStatus,
  groupCasesByClientId,
} from '@/lib/clientServiceStatus'
import type { Case, CaseStatus } from '@/types/case'
import type { Client } from '@/types/client'
import type { Employee } from '@/types/employee'
import type { SubAgent } from '@/types/subAgent'
import type { ModuleId, UserRole } from '@/types/tenant'
import { clientPath, hrEmployeePath, workDetailPath } from '@/lib/workPaths'
import type { SearchItem } from './types'

export type SearchCatalogUser = Pick<AuthUser, 'name' | 'role'>

export type SearchCatalogInput = {
  user: SearchCatalogUser | null
  enabledModules: readonly ModuleId[]
  clients: Client[]
  cases: Case[]
  subAgents: SubAgent[]
  employees: Employee[]
}

function uniqueKeywords(values: Array<string | number | undefined | null>): string[] {
  const seen = new Set<string>()
  const keywords: string[] = []
  for (const value of values) {
    const text = String(value ?? '').trim()
    if (!text) continue
    const key = text.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    keywords.push(text)
  }
  return keywords
}

function caseStatusVariant(status: CaseStatus): BadgeVariant {
  if (status === 'Completed') return 'completed'
  if (status === 'Pending') return 'pending'
  if (status === 'In-Progress') return 'in-progress'
  if (status === 'On-Hold') return 'on-hold'
  return 'danger'
}

function actionItems(user: SearchCatalogUser | null): SearchItem[] {
  if (user?.role === 'platform_admin') {
    return [
      {
        id: 'action:agencies',
        kind: 'action',
        scope: 'actions',
        label: 'Open Agencies',
        keywords: uniqueKeywords(['tenants', 'admin', 'agencies', 'businesses']),
        path: '/admin/agencies',
        icon: Briefcase,
      },
    ]
  }

  return [
    {
      id: 'action:create-client',
      kind: 'action',
      scope: 'actions',
      label: 'Create A Client',
      description: 'Open the clients list to add someone',
      keywords: uniqueKeywords(['new client', 'add client', 'register']),
      path: '/clients',
      icon: UserPlus,
    },
    {
      id: 'action:clients',
      kind: 'action',
      scope: 'actions',
      label: 'Open Clients',
      keywords: uniqueKeywords(['people', 'passengers']),
      path: '/clients',
      icon: Users,
    },
    {
      id: 'action:services',
      kind: 'action',
      scope: 'actions',
      label: 'Open Service Files',
      keywords: uniqueKeywords(['cases', 'work', 'visa']),
      path: '/services',
      icon: ListChecks,
    },
    {
      id: 'action:dashboard',
      kind: 'action',
      scope: 'actions',
      label: 'Go To Dashboard',
      keywords: uniqueKeywords(['overview', 'stats']),
      path: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'action:service-board',
      kind: 'action',
      scope: 'actions',
      label: 'Open Service Board',
      keywords: uniqueKeywords([
        'medical',
        'visa',
        'vmt',
        'pipeline',
        'steps',
        'ready',
        'board',
        'service board',
      ]),
      path: '/service-board',
      icon: Kanban,
    },
    {
      id: 'action:my-profile',
      kind: 'action',
      scope: 'actions',
      label: 'Go To My Profile',
      description: user?.name,
      keywords: uniqueKeywords(['profile', 'account', 'me']),
      path: '/profile',
      icon: UserRound,
    },
    {
      id: 'action:settings',
      kind: 'action',
      scope: 'actions',
      label: 'Open Settings',
      keywords: uniqueKeywords(['appearance', 'theme', 'catalog']),
      path: '/settings',
      icon: Settings,
    },
  ]
}

export function buildSearchCatalog(input: SearchCatalogInput): SearchItem[] {
  const { user, enabledModules, clients, cases, subAgents, employees } = input
  const role: UserRole = user?.role ?? 'agency_user'
  const items: SearchItem[] = [...actionItems(user)]

  const pages = flattenNavItems(
    filterNavItems(searchablePages, enabledModules, role),
  )
  const seenPages = new Set<string>()
  for (const page of pages) {
    if (seenPages.has(page.path)) continue
    seenPages.add(page.path)
    items.push({
      id: `page:${page.path}`,
      kind: 'page',
      scope: 'pages',
      label: page.label,
      description: page.path === '/' ? 'Home' : page.path,
      keywords: uniqueKeywords([page.path]),
      path: page.path,
      icon: page.icon,
    })
  }

  if (role === 'platform_admin') return items

  const casesByClientId = groupCasesByClientId(cases)
  for (const client of clients) {
    const serviceStatus = deriveClientServiceStatus(
      casesByClientId.get(client.id) ?? [],
    )
    items.push({
      id: `client:${client.id}`,
      kind: 'client',
      scope: 'clients',
      label: client.name,
      description:
        [client.passport ? `Passport ${client.passport}` : '', client.phone]
          .filter(Boolean)
          .join(' · ') || client.email,
      keywords: uniqueKeywords([
        client.id,
        client.phone,
        client.email,
        client.nid,
        client.passport,
        client.banglaName,
        client.branch,
        client.preferredCountry,
        serviceStatus,
      ]),
      path: clientPath(client.id),
      icon: UserRound,
      avatarUrl: client.avatarUrl,
      avatarName: client.name,
      status: serviceStatus ?? undefined,
      statusVariant: serviceStatus
        ? caseStatusVariant(serviceStatus)
        : undefined,
    })
  }

  for (const file of cases) {
    items.push({
      id: `service:${file.id}`,
      kind: 'service',
      scope: 'services',
      label: `${file.service} · ${file.clientName}`,
      description: [file.id, file.destination, file.currentStepId]
        .filter(Boolean)
        .join(' · '),
      keywords: uniqueKeywords([
        file.id,
        file.caseId,
        file.clientId,
        file.clientName,
        file.service,
        file.destination,
        file.serviceCountry,
        file.assignedTo,
      ]),
      path: workDetailPath(file),
      icon: FileText,
      status: file.status,
      statusVariant: caseStatusVariant(file.status),
    })
  }

  if (isPathAllowed('/sub-agents', enabledModules, role)) {
    for (const subAgent of subAgents) {
      items.push({
        id: `subAgent:${subAgent.id}`,
        kind: 'subAgent',
        scope: 'subAgents',
        label: subAgent.name,
        description: [subAgent.id, subAgent.licenseNumber, subAgent.phone]
          .filter(Boolean)
          .join(' · '),
        keywords: uniqueKeywords([
          subAgent.id,
          subAgent.phone,
          subAgent.email,
          subAgent.licenseNumber,
          subAgent.branch,
        ]),
        path: `/sub-agents/${subAgent.id}`,
        icon: Handshake,
        avatarUrl: subAgent.photoUrl,
        avatarName: subAgent.name,
        status: subAgent.status,
        statusVariant: subAgent.status === 'Active' ? 'completed' : 'neutral',
      })
    }
  }

  if (isPathAllowed('/hr/employees', enabledModules, role)) {
    for (const employee of employees) {
      items.push({
        id: `employee:${employee.id}`,
        kind: 'employee',
        scope: 'employees',
        label: employee.name,
        description: [employee.designation, employee.department]
          .filter(Boolean)
          .join(' · '),
        keywords: uniqueKeywords([
          employee.id,
          employee.phone,
          employee.department,
          employee.designation,
        ]),
        path: hrEmployeePath(employee.id),
        icon: UserRound,
        avatarName: employee.name,
        status: employee.status,
        statusVariant: employee.status === 'Active' ? 'completed' : 'neutral',
      })
    }
  }

  return items
}