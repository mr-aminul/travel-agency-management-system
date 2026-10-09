import type { AuthSession, AuthUser } from '@/lib/authApi'
import { readAgencyProfile } from '@/lib/agencyProfile'
import {
  findLoginByEmail,
  findLoginByUserId,
  listSubAgentLoginsForEmail,
} from '@/lib/subAgentLoginsStore'
import { findSubAgentById } from '@/lib/subAgentsStore'
import { findTenantMemberForUser } from '@/lib/tenantMembersStore'
import { getTenantById } from '@/lib/tenantsStore'

export type AuthWorkspace =
  | {
      id: string
      kind: 'platform_admin'
      title: string
      description: string
    }
  | {
      id: string
      kind: 'agency'
      tenantId: string
      title: string
      description: string
    }
  | {
      id: string
      kind: 'sub_agent'
      tenantId: string
      subAgentId: string
      title: string
      description: string
    }

function agencyTitle(tenantId: string): string {
  const profile = readAgencyProfile(tenantId)
  const tenant = getTenantById(tenantId)
  return (
    profile.businessName?.trim() ||
    tenant?.name?.trim() ||
    'Your agency'
  )
}

function subAgentWorkspace(
  tenantId: string,
  subAgentId: string,
): AuthWorkspace {
  const agency = agencyTitle(tenantId)
  const subAgent = findSubAgentById(subAgentId)
  return {
    id: `sub_agent:${subAgentId}`,
    kind: 'sub_agent',
    tenantId,
    subAgentId,
    title: `Sub agent of ${agency}`,
    description: subAgent?.name
      ? `Work as ${subAgent.name} — manage referred clients for ${agency}.`
      : `Manage referred clients for ${agency}.`,
  }
}

/**
 * Workspaces this login can enter. More than one → show the post-login picker.
 */
export function listWorkspacesForUser(
  user: AuthUser,
  fallbackTenantId: string,
): AuthWorkspace[] {
  if (user.role === 'platform_admin') {
    return [
      {
        id: 'platform_admin',
        kind: 'platform_admin',
        title: 'Admin portal',
        description: 'Manage agencies, users, and platform settings.',
      },
    ]
  }

  const workspaces: AuthWorkspace[] = []
  const seen = new Set<string>()

  const push = (workspace: AuthWorkspace) => {
    if (seen.has(workspace.id)) return
    seen.add(workspace.id)
    workspaces.push(workspace)
  }

  const member = findTenantMemberForUser(
    fallbackTenantId,
    user.id,
    user.email,
  )
  const hasAgencySeat =
    user.role === 'agency_user' ||
    (member != null && member.status !== 'disabled')

  if (hasAgencySeat) {
    const tenantId = member?.tenantId || fallbackTenantId
    const name = agencyTitle(tenantId)
    push({
      id: `agency:${tenantId}`,
      kind: 'agency',
      tenantId,
      title: name,
      description: `Run ${name} — clients, services, and team.`,
    })
  }

  const links = [
    ...listSubAgentLoginsForEmail(user.email),
    ...(findLoginByUserId(user.id)
      ? [findLoginByUserId(user.id)!]
      : []),
  ]
  if (user.subAgentId) {
    const fromUser = findLoginByEmail(user.email, fallbackTenantId)
    if (fromUser) links.push(fromUser)
    else {
      push(subAgentWorkspace(fallbackTenantId, user.subAgentId))
    }
  }

  for (const link of links) {
    if (link.status === 'disabled') continue
    push(subAgentWorkspace(link.tenantId, link.subAgentId))
  }

  // Pure sub-agent login with no link row yet (API-only).
  if (workspaces.length === 0 && user.role === 'sub_agent' && user.subAgentId) {
    push(subAgentWorkspace(fallbackTenantId, user.subAgentId))
  }

  return workspaces
}

export function applyWorkspaceToSession(
  session: AuthSession,
  workspace: AuthWorkspace,
): AuthSession {
  if (workspace.kind === 'platform_admin') {
    return {
      ...session,
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: 'platform_admin',
      },
      tenantId: session.tenantId,
      workspacePending: false,
      workspaces: session.workspaces,
      activeWorkspaceId: workspace.id,
    }
  }

  if (workspace.kind === 'agency') {
    return {
      ...session,
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: 'agency_user',
      },
      tenantId: workspace.tenantId,
      workspacePending: false,
      workspaces: session.workspaces,
      activeWorkspaceId: workspace.id,
    }
  }

  return {
    ...session,
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: 'sub_agent',
      subAgentId: workspace.subAgentId,
    },
    tenantId: workspace.tenantId,
    workspacePending: false,
    workspaces: session.workspaces,
    activeWorkspaceId: workspace.id,
  }
}

/** Login page choice — filters which workspace to enter. */
export type LoginIntent = 'agency' | 'sub_agent'

export function matchesLoginIntent(
  workspace: AuthWorkspace,
  intent: LoginIntent,
): boolean {
  if (intent === 'agency') {
    return workspace.kind === 'agency' || workspace.kind === 'platform_admin'
  }
  return workspace.kind === 'sub_agent'
}

/**
 * After password login: enter the workspace matching login intent.
 * Without intent, auto-enter one workspace or mark picker required.
 */
export function withResolvedWorkspaces(
  session: AuthSession,
  intent?: LoginIntent,
): AuthSession {
  const workspaces = listWorkspacesForUser(session.user, session.tenantId)
  if (workspaces.length === 0) {
    return { ...session, workspaces, workspacePending: false }
  }

  if (intent) {
    const matched = workspaces.filter((row) =>
      matchesLoginIntent(row, intent),
    )
    if (matched.length === 0) {
      const message =
        intent === 'agency'
          ? 'This account has no agency login. Choose Sub agent login, or ask your agency for access.'
          : 'This account has no sub-agent login. Choose Agency login, or ask the agency to enable partner access.'
      throw new Error(message)
    }
    if (matched.length === 1) {
      return applyWorkspaceToSession(
        { ...session, workspaces },
        matched[0]!,
      )
    }
    // Multiple partner links (or agencies) under the same intent → picker.
    return {
      ...session,
      workspaces: matched,
      workspacePending: true,
      activeWorkspaceId: undefined,
    }
  }

  if (workspaces.length === 1) {
    return applyWorkspaceToSession(
      { ...session, workspaces },
      workspaces[0]!,
    )
  }
  return {
    ...session,
    workspaces,
    workspacePending: true,
    activeWorkspaceId: undefined,
  }
}

export function postLoginPath(session: AuthSession): string {
  if (session.workspacePending) return '/choose-workspace'
  if (session.user.role === 'platform_admin') return '/admin/tenants'
  return '/'
}
